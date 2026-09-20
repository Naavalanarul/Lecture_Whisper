package com.lecturewhisper.recorder;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import com.lecturewhisper.MainActivity;
import com.lecturewhisper.MainApplication;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

public class RecorderService extends Service {

    public static final String TAG = "LectureWhisperRecorder";
    public static final int NOTIFICATION_ID = 4201;

    public static final String ACTION_START = "com.lecturewhisper.START_RECORDING";
    public static final String ACTION_STOP = "com.lecturewhisper.STOP_RECORDING";
    public static final String EXTRA_SUBJECT = "extra_subject";
    public static final String EXTRA_SLOT_ID = "extra_slot_id";

    // 10-minute chunk rotation
    public static final long CHUNK_DURATION_MS = 10 * 60 * 1000L;

    public interface AmplitudeListener {
        void onAmplitude(int amplitude);
    }
    public static AmplitudeListener amplitudeListener = null;
    public static RecorderService activeInstance = null;

    public static boolean isServiceRecording() {
        return activeInstance != null && activeInstance.isRecording;
    }

    private PowerManager.WakeLock wakeLock;
    private MediaRecorder mediaRecorder;
    private boolean isRecording = false;
    private String sessionId = UUID.randomUUID().toString();
    private int chunkIndex = 0;
    private String currentSubject = "Uncategorized";
    private String currentSlotId = null;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable chunkRotationRunnable = new Runnable() {
        @Override
        public void run() {
            if (isRecording) {
                rotateChunk();
                handler.postDelayed(this, CHUNK_DURATION_MS);
            }
        }
    };

    private final Runnable amplitudePollRunnable = new Runnable() {
        @Override
        public void run() {
            if (isRecording && mediaRecorder != null) {
                try {
                    int amp = mediaRecorder.getMaxAmplitude();
                    if (amplitudeListener != null) {
                        amplitudeListener.onAmplitude(amp);
                    }
                } catch (Exception ignored) {}
                handler.postDelayed(this, 100);
            }
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_START.equals(action)) {
                String sub = intent.getStringExtra(EXTRA_SUBJECT);
                if (sub != null) currentSubject = sub;
                currentSlotId = intent.getStringExtra(EXTRA_SLOT_ID);
                startForegroundRecording();
            } else if (ACTION_STOP.equals(action)) {
                stopForegroundRecording();
            }
        }
        return START_STICKY;
    }

    private void startForegroundRecording() {
        if (isRecording) return;

        // 1. Acquire WakeLock
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LectureWhisper::RecorderWakeLock");
            wakeLock.acquire(4 * 60 * 60 * 1000L); // Max 4 hours
        }

        // 2. Start Foreground with microphone type for Android 14+
        Notification notification = buildNotification("Recording: " + currentSubject);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        sessionId = UUID.randomUUID().toString();
        chunkIndex = 0;
        isRecording = true;
        activeInstance = this;

        startMediaRecorder();
        handler.postDelayed(chunkRotationRunnable, CHUNK_DURATION_MS);
        handler.post(amplitudePollRunnable);
    }

    private void stopForegroundRecording() {
        if (!isRecording) return;
        isRecording = false;
        activeInstance = null;
        handler.removeCallbacks(chunkRotationRunnable);
        handler.removeCallbacks(amplitudePollRunnable);

        stopMediaRecorder();

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }

        stopForeground(true);
        stopSelf();
    }

    private void rotateChunk() {
        Log.i(TAG, "Rotating 10-minute recording chunk. Previous chunk index: " + chunkIndex);
        stopMediaRecorder();
        chunkIndex++;
        startMediaRecorder();
    }

    private void startMediaRecorder() {
        File dir = getExternalFilesDir(null);
        if (dir == null) dir = getFilesDir();
        File sessionDir = new File(dir, "recordings/" + sessionId);
        sessionDir.mkdirs();

        if (chunkIndex == 0) {
            try {
                org.json.JSONObject meta = new org.json.JSONObject();
                meta.put("session_id", sessionId);
                meta.put("subject", currentSubject);
                if (currentSlotId != null) meta.put("timetable_slot_id", currentSlotId);
                meta.put("started_at_ms", System.currentTimeMillis());
                meta.put("synced", false);
                File metaFile = new File(sessionDir, "metadata.json");
                java.nio.file.Files.write(metaFile.toPath(), meta.toString(2).getBytes());
            } catch (Exception ignored) {}
        }

        String filename = String.format(Locale.US, "chunk_%04d.m4a", chunkIndex);
        File outputFile = new File(sessionDir, filename);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                mediaRecorder = new MediaRecorder(this);
            } else {
                mediaRecorder = new MediaRecorder();
            }

            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            mediaRecorder.setAudioSamplingRate(16000); // 16kHz Mono as specified
            mediaRecorder.setAudioChannels(1);
            mediaRecorder.setAudioEncodingBitRate(64000);
            mediaRecorder.setOutputFile(outputFile.getAbsolutePath());

            mediaRecorder.prepare();
            mediaRecorder.start();
            Log.i(TAG, "Recording started -> " + outputFile.getAbsolutePath());
        } catch (IOException e) {
            Log.e(TAG, "Failed to start MediaRecorder", e);
        }
    }

    private void stopMediaRecorder() {
        if (mediaRecorder != null) {
            try {
                mediaRecorder.stop();
            } catch (Exception e) {
                Log.w(TAG, "Error stopping MediaRecorder", e);
            }
            mediaRecorder.release();
            mediaRecorder = null;
        }
    }

    private Notification buildNotification(String text) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, MainApplication.RECORDING_CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder.setContentTitle("Lecture Whisper — Active")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }
}
