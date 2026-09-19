package com.lecturewhisper;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class MainApplication extends Application {

    public static final String RECORDING_CHANNEL_ID = "lecture_recording_channel";
    public static final String ALARM_CHANNEL_ID = "lecture_alarm_channel";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            NotificationChannel recordingChannel = new NotificationChannel(
                    RECORDING_CHANNEL_ID,
                    "Lecture Recording",
                    NotificationManager.IMPORTANCE_LOW
            );
            recordingChannel.setDescription("Persistent notification while recording lecture audio");

            NotificationChannel alarmChannel = new NotificationChannel(
                    ALARM_CHANNEL_ID,
                    "Class Reminders",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alarmChannel.setDescription("Notifications for upcoming scheduled classes");

            manager.createNotificationChannel(recordingChannel);
            manager.createNotificationChannel(alarmChannel);
        }
    }
}
