package com.lecturewhisper.assistant;

import android.service.voice.VoiceInteractionService;
import android.util.Log;

public class LectureVoiceInteractionService extends VoiceInteractionService {

    public static final String TAG = "LectureVoiceService";

    @Override
    public void onReady() {
        super.onReady();
        Log.i(TAG, "LectureVoiceInteractionService ready (Assistant Role Mode)");
    }

    @Override
    public void onShutdown() {
        super.onShutdown();
        Log.i(TAG, "LectureVoiceInteractionService shutdown");
    }
}
