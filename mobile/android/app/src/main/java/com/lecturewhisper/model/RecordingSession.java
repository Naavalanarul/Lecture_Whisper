package com.lecturewhisper.model;

import org.json.JSONObject;

import java.io.File;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class RecordingSession implements Serializable {
    private String sessionId;
    private String subject;
    private String timetableSlotId;
    private long startedAtMs;
    private int chunkCount;
    private long totalBytes;
    private boolean isSynced;
    private String directoryPath;

    public RecordingSession(String sessionId, String subject, String timetableSlotId, long startedAtMs, int chunkCount, long totalBytes, boolean isSynced, String directoryPath) {
        this.sessionId = sessionId;
        this.subject = subject != null ? subject : "Lecture Session";
        this.timetableSlotId = timetableSlotId;
        this.startedAtMs = startedAtMs;
        this.chunkCount = chunkCount;
        this.totalBytes = totalBytes;
        this.isSynced = isSynced;
        this.directoryPath = directoryPath;
    }

    public static RecordingSession fromDirectory(File dir) {
        String sId = dir.getName();
        String subject = "Lecture Session";
        String slotId = null;
        long startedAt = dir.lastModified();
        boolean synced = false;

        File metaFile = new File(dir, "metadata.json");
        if (metaFile.exists()) {
            try {
                String content = new String(java.nio.file.Files.readAllBytes(metaFile.toPath()));
                JSONObject obj = new JSONObject(content);
                subject = obj.optString("subject", subject);
                slotId = obj.optString("timetable_slot_id", null);
                if (obj.has("started_at_ms")) startedAt = obj.optLong("started_at_ms");
                synced = obj.optBoolean("synced", false);
            } catch (Exception ignored) {}
        }

        int chunks = 0;
        long bytes = 0;
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.getName().endsWith(".m4a") || f.getName().endsWith(".wav")) {
                    chunks++;
                    bytes += f.length();
                }
            }
        }

        return new RecordingSession(sId, subject, slotId, startedAt, chunks, bytes, synced, dir.getAbsolutePath());
    }

    public void saveMetadata() {
        File dir = new File(directoryPath);
        if (!dir.exists()) dir.mkdirs();
        File metaFile = new File(dir, "metadata.json");
        try {
            JSONObject obj = new JSONObject();
            obj.put("session_id", sessionId);
            obj.put("subject", subject);
            if (timetableSlotId != null) obj.put("timetable_slot_id", timetableSlotId);
            obj.put("started_at_ms", startedAtMs);
            obj.put("synced", isSynced);
            java.nio.file.Files.write(metaFile.toPath(), obj.toString(2).getBytes());
        } catch (Exception ignored) {}
    }

    public String getSessionId() { return sessionId; }
    public String getSubject() { return subject; }
    public String getTimetableSlotId() { return timetableSlotId; }
    public long getStartedAtMs() { return startedAtMs; }
    public int getChunkCount() { return chunkCount; }
    public long getTotalBytes() { return totalBytes; }
    public boolean isSynced() { return isSynced; }
    public void setSynced(boolean synced) { this.isSynced = synced; }
    public String getDirectoryPath() { return directoryPath; }

    public String getFormattedDate() {
        SimpleDateFormat sdf = new SimpleDateFormat("EEE, MMM d, yyyy • HH:mm", Locale.getDefault());
        return sdf.format(new Date(startedAtMs));
    }

    public String getFormattedSize() {
        if (totalBytes < 1024) return totalBytes + " B";
        if (totalBytes < 1024 * 1024) return String.format(Locale.US, "%.1f KB", totalBytes / 1024.0);
        return String.format(Locale.US, "%.1f MB", totalBytes / (1024.0 * 1024.0));
    }
}
