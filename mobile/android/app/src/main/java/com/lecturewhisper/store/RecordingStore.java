package com.lecturewhisper.store;

import android.content.Context;
import android.os.Environment;
import android.os.StatFs;

import com.lecturewhisper.model.RecordingSession;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class RecordingStore {
    private final Context context;

    public static class StorageInfo {
        public final long totalDiskBytes;
        public final long availableDiskBytes;
        public final long appRecordingsBytes;
        public final int unsyncedCount;
        public final int syncedCount;

        public StorageInfo(long totalDiskBytes, long availableDiskBytes, long appRecordingsBytes, int unsyncedCount, int syncedCount) {
            this.totalDiskBytes = totalDiskBytes;
            this.availableDiskBytes = availableDiskBytes;
            this.appRecordingsBytes = appRecordingsBytes;
            this.unsyncedCount = unsyncedCount;
            this.syncedCount = syncedCount;
        }

        public String getFormattedAvailable() {
            return formatBytes(availableDiskBytes);
        }

        public String getFormattedTotal() {
            return formatBytes(totalDiskBytes);
        }

        public String getFormattedAppUsage() {
            return formatBytes(appRecordingsBytes);
        }

        private static String formatBytes(long bytes) {
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1024 * 1024) return String.format(Locale.US, "%.1f KB", bytes / 1024.0);
            if (bytes < 1024L * 1024 * 1024) return String.format(Locale.US, "%.1f MB", bytes / (1024.0 * 1024.0));
            return String.format(Locale.US, "%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0));
        }
    }

    public RecordingStore(Context context) {
        this.context = context.getApplicationContext();
    }

    public File getRecordingsDir() {
        File dir = context.getExternalFilesDir(null);
        if (dir == null) dir = context.getFilesDir();
        File recDir = new File(dir, "recordings");
        if (!recDir.exists()) recDir.mkdirs();
        return recDir;
    }

    public List<RecordingSession> getAllSessions() {
        List<RecordingSession> sessions = new ArrayList<>();
        File recDir = getRecordingsDir();
        File[] sessionDirs = recDir.listFiles(File::isDirectory);
        if (sessionDirs != null) {
            for (File d : sessionDirs) {
                sessions.add(RecordingSession.fromDirectory(d));
            }
        }
        Collections.sort(sessions, (a, b) -> Long.compare(b.getStartedAtMs(), a.getStartedAtMs()));
        return sessions;
    }

    public StorageInfo getStorageInfo() {
        StatFs statFs = new StatFs(Environment.getDataDirectory().getPath());
        long total = statFs.getTotalBytes();
        long avail = statFs.getAvailableBytes();

        long appBytes = 0;
        int unsynced = 0;
        int synced = 0;

        List<RecordingSession> sessions = getAllSessions();
        for (RecordingSession s : sessions) {
            appBytes += s.getTotalBytes();
            if (s.isSynced()) {
                synced++;
            } else {
                unsynced++;
            }
        }

        return new StorageInfo(total, avail, appBytes, unsynced, synced);
    }

    public int pruneSyncedChunks() {
        int prunedCount = 0;
        File recDir = getRecordingsDir();
        File[] sessionDirs = recDir.listFiles(File::isDirectory);
        if (sessionDirs != null) {
            for (File d : sessionDirs) {
                RecordingSession session = RecordingSession.fromDirectory(d);
                if (session.isSynced()) {
                    File[] audioFiles = d.listFiles((dir, name) -> name.endsWith(".m4a") || name.endsWith(".wav"));
                    if (audioFiles != null) {
                        for (File f : audioFiles) {
                            if (f.delete()) prunedCount++;
                        }
                    }
                }
            }
        }
        return prunedCount;
    }
}
