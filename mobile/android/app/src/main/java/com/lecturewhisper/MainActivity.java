package com.lecturewhisper;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import com.lecturewhisper.recorder.RecorderService;

public class MainActivity extends Activity {

    private static final int PERMISSION_REQUEST_CODE = 101;

    private TextView textRecordingStatus;
    private TextView textRecordingTimer;
    private TextView textChunkInfo;
    private Button btnToggleRecording;

    private boolean isRecording = false;
    private long recordingStartTime = 0;
    private Handler timerHandler = new Handler(Looper.getMainLooper());

    private final Runnable timerRunnable = new Runnable() {
        @Override
        public void run() {
            if (isRecording) {
                long elapsed = System.currentTimeMillis() - recordingStartTime;
                int seconds = (int) (elapsed / 1000) % 60;
                int minutes = (int) ((elapsed / (1000 * 60)) % 60);
                int hours = (int) (elapsed / (1000 * 60 * 60));
                textRecordingTimer.setText(String.format("%02d:%02d:%02d", hours, minutes, seconds));
                timerHandler.postDelayed(this, 1000);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        textRecordingStatus = findViewById(R.id.text_recording_status);
        textRecordingTimer = findViewById(R.id.text_recording_timer);
        textChunkInfo = findViewById(R.id.text_chunk_info);
        btnToggleRecording = findViewById(R.id.btn_toggle_recording);

        btnToggleRecording.setOnClickListener(v -> {
            if (!hasPermissions()) {
                requestPermissions();
                return;
            }

            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });

        requestPermissions();
    }

    private boolean hasPermissions() {
        boolean mic = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        boolean postNotif = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            postNotif = checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        return mic && postNotif;
    }

    private void requestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissions(new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.POST_NOTIFICATIONS
            }, PERMISSION_REQUEST_CODE);
        } else {
            requestPermissions(new String[]{
                    Manifest.permission.RECORD_AUDIO
            }, PERMISSION_REQUEST_CODE);
        }
    }

    private void startRecording() {
        Intent intent = new Intent(this, RecorderService.class);
        intent.setAction(RecorderService.ACTION_START);
        intent.putExtra(RecorderService.EXTRA_SUBJECT, "Lecture Session");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }

        isRecording = true;
        recordingStartTime = System.currentTimeMillis();
        timerHandler.post(timerRunnable);

        textRecordingStatus.setText("Recording in progress (16kHz Mono AAC)");
        btnToggleRecording.setText(R.string.btn_stop_recording);
        btnToggleRecording.setBackgroundColor(0xFFE11D48); // Rose color
        textChunkInfo.setText("Rotating chunks every 10 mins • tus v1.0.0 auto-sync");
        Toast.makeText(this, "Lecture recording started", Toast.LENGTH_SHORT).show();
    }

    private void stopRecording() {
        Intent intent = new Intent(this, RecorderService.class);
        intent.setAction(RecorderService.ACTION_STOP);
        startService(intent);

        isRecording = false;
        timerHandler.removeCallbacks(timerRunnable);

        textRecordingStatus.setText(R.string.status_ready);
        textRecordingTimer.setText("00:00:00");
        btnToggleRecording.setText(R.string.btn_start_recording);
        btnToggleRecording.setBackgroundColor(0xFF6366F1); // Indigo color
        textChunkInfo.setText("Final chunk queued for transfer to MacBook Pro");
        Toast.makeText(this, "Recording stopped. Uploading to server...", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        timerHandler.removeCallbacks(timerRunnable);
    }
}
