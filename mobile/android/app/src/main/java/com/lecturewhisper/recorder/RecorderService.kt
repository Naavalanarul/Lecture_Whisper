package com.lecturewhisper.recorder

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class RecorderService : Service() {

    companion object {
        const val TAG = "LectureWhisperRecorder"
        const val CHANNEL_ID = "lecture_recording_channel"
        const val NOTIFICATION_ID = 4201

        const val ACTION_START = "com.lecturewhisper.START_RECORDING"
        const val ACTION_STOP = "com.lecturewhisper.STOP_RECORDING"
        const val EXTRA_SUBJECT = "extra_subject"

        // 10-minute rotating chunk duration in milliseconds
        const val CHUNK_DURATION_MS = 10 * 60 * 1000L
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var mediaRecorder: MediaRecorder? = null
    private var isRecording = false
    private var sessionId = UUID.randomUUID().toString()
    private var chunkIndex = 0
    private var currentSubject = "Uncategorized"

    private val handler = Handler(Looper.getMainLooper())
    private val chunkRotationRunnable = object : Runnable {
        override fun run() {
            if (isRecording) {
                rotateChunk()
                handler.postDelayed(this, CHUNK_DURATION_MS)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                currentSubject = intent.getStringExtra(EXTRA_SUBJECT) ?: "Lecture"
                startForegroundRecording()
            }
            ACTION_STOP -> {
                stopForegroundRecording()
            }
        }
        return START_STICKY
    }

    private fun startForegroundRecording() {
        if (isRecording) return

        // 1. Acquire WakeLock
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LectureWhisper::RecorderWakeLock")
        wakeLock?.acquire(4 * 60 * 60 * 1000L) // Max 4 hours

        // 2. Build foreground notification
        val notification = buildNotification("Recording: $currentSubject (00:00)")

        // 3. Start foreground with microphone type for Android 14+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // 4. Initialize first recording chunk
        sessionId = UUID.randomUUID().toString()
        chunkIndex = 0
        isRecording = true
        startChunkRecording()

        // 5. Schedule 10-minute chunk rotations
        handler.postDelayed(chunkRotationRunnable, CHUNK_DURATION_MS)
        Log.i(TAG, "Foreground recording started for session $sessionId")
    }

    private fun startChunkRecording() {
        try {
            val storageDir = File(getExternalFilesDir(null), "recordings/$sessionId")
            storageDir.mkdirs()

            val chunkFile = File(storageDir, "chunk_${String.format(Locale.US, "%03d", chunkIndex)}.m4a")

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioChannels(1) // Mono
                setAudioSamplingRate(16000) // 16 kHz
                setAudioEncodingBitRate(64000) // 64 kbps
                setOutputFile(chunkFile.absolutePath)
                prepare()
                start()
            }
            Log.i(TAG, "Recording chunk $chunkIndex to ${chunkFile.name}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start chunk recording: ${e.message}", e)
        }
    }

    private fun rotateChunk() {
        Log.i(TAG, "Rotating to next 10-minute chunk...")
        try {
            mediaRecorder?.apply {
                stop()
                reset()
                release()
            }
            mediaRecorder = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping previous chunk: ${e.message}", e)
        }

        chunkIndex++
        startChunkRecording()
    }

    private fun stopForegroundRecording() {
        if (!isRecording) return

        handler.removeCallbacks(chunkRotationRunnable)

        try {
            mediaRecorder?.apply {
                stop()
                reset()
                release()
            }
            mediaRecorder = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing media recorder: ${e.message}", e)
        }

        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
        isRecording = false

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        Log.i(TAG, "Foreground recording stopped. Total chunks: ${chunkIndex + 1}")
    }

    private fun buildNotification(contentText: String): Notification {
        val stopIntent = Intent(this, RecorderService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Lecture Whisper Active")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "Stop Recording", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Lecture Recording Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows persistent status while capturing lecture audio"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        stopForegroundRecording()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
