package com.lecturewhisper.alarm;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.lecturewhisper.MainActivity;
import com.lecturewhisper.MainApplication;
import com.lecturewhisper.recorder.RecorderService;

public class AlarmReceiver extends BroadcastReceiver {

    public static final String TAG = "LectureWhisperAlarm";
    public static final String ACTION_TRIGGER = "com.lecturewhisper.ALARM_TRIGGER";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.i(TAG, "Alarm triggered for upcoming lecture session");

        String subject = intent.getStringExtra("subject");
        if (subject == null) subject = "Scheduled Class";

        // Build notification for student
        Intent startIntent = new Intent(context, RecorderService.class);
        startIntent.setAction(RecorderService.ACTION_START);
        startIntent.putExtra(RecorderService.EXTRA_SUBJECT, subject);

        PendingIntent startPendingIntent = PendingIntent.getService(
                context, 102, startIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent openAppIntent = new Intent(context, MainActivity.class);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
                context, 103, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(context, MainApplication.ALARM_CHANNEL_ID);
        } else {
            builder = new Notification.Builder(context);
        }

        Notification notification = builder
                .setContentTitle("Lecture Whisper: " + subject)
                .setContentText("Class is starting now. Tap to record.")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentIntent(openPendingIntent)
                .addAction(android.R.drawable.ic_btn_speak_now, "Start Recording", startPendingIntent)
                .setAutoCancel(true)
                .build();

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(8801, notification);
        }
    }
}
