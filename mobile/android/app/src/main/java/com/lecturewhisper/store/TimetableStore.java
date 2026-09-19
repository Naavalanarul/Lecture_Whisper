package com.lecturewhisper.store;

import android.content.Context;
import com.lecturewhisper.model.TimetableSlot;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class TimetableStore {
    private static final String FILENAME = "timetable.json";
    private final Context context;
    private final List<TimetableSlot> slots = new ArrayList<>();

    public static class ActiveSlotInfo {
        public static final int TYPE_NONE = 0;
        public static final int TYPE_CURRENT = 1;
        public static final int TYPE_UPCOMING = 2;

        public final int type;
        public final TimetableSlot slot;
        public final int minutesUntil;

        public ActiveSlotInfo(int type, TimetableSlot slot, int minutesUntil) {
            this.type = type;
            this.slot = slot;
            this.minutesUntil = minutesUntil;
        }
    }

    public TimetableStore(Context context) {
        this.context = context.getApplicationContext();
        load();
        if (slots.isEmpty()) {
            loadDefaultSchedule();
        }
    }

    public synchronized List<TimetableSlot> getSlots() {
        return new ArrayList<>(slots);
    }

    public synchronized List<TimetableSlot> getSlotsForDay(int weekday) {
        List<TimetableSlot> result = new ArrayList<>();
        for (TimetableSlot s : slots) {
            if (s.getWeekday() == weekday) {
                result.add(s);
            }
        }
        Collections.sort(result, Comparator.comparing(TimetableSlot::getStartTime));
        return result;
    }

    public synchronized void setSlots(List<TimetableSlot> newSlots) {
        slots.clear();
        slots.addAll(newSlots);
        save();
    }

    public synchronized void addSlot(TimetableSlot slot) {
        slots.add(slot);
        save();
    }

    public synchronized void deleteSlot(String slotId) {
        slots.removeIf(s -> s.getId().equals(slotId));
        save();
    }

    public synchronized ActiveSlotInfo getCurrentOrNextSlot() {
        Calendar cal = Calendar.getInstance();
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK); // Sunday=1, Monday=2
        int weekday = (dayOfWeek + 5) % 7; // Monday=0, ..., Sunday=6

        int currentHour = cal.get(Calendar.HOUR_OF_DAY);
        int currentMinute = cal.get(Calendar.MINUTE);
        int currentTotalMinutes = currentHour * 60 + currentMinute;

        List<TimetableSlot> todaySlots = getSlotsForDay(weekday);

        // Check if currently inside a slot
        for (TimetableSlot s : todaySlots) {
            int startMin = parseTimeToMinutes(s.getStartTime());
            int endMin = parseTimeToMinutes(s.getEndTime());
            if (currentTotalMinutes >= startMin && currentTotalMinutes <= endMin) {
                return new ActiveSlotInfo(ActiveSlotInfo.TYPE_CURRENT, s, 0);
            }
        }

        // Check for upcoming slot today
        TimetableSlot nextSlot = null;
        int minDiff = Integer.MAX_VALUE;
        for (TimetableSlot s : todaySlots) {
            int startMin = parseTimeToMinutes(s.getStartTime());
            if (startMin > currentTotalMinutes) {
                int diff = startMin - currentTotalMinutes;
                if (diff < minDiff) {
                    minDiff = diff;
                    nextSlot = s;
                }
            }
        }

        if (nextSlot != null) {
            return new ActiveSlotInfo(ActiveSlotInfo.TYPE_UPCOMING, nextSlot, minDiff);
        }

        return new ActiveSlotInfo(ActiveSlotInfo.TYPE_NONE, null, -1);
    }

    private int parseTimeToMinutes(String timeStr) {
        try {
            String[] parts = timeStr.split(":");
            int h = Integer.parseInt(parts[0]);
            int m = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            return h * 60 + m;
        } catch (Exception e) {
            return 0;
        }
    }

    private void load() {
        File file = new File(context.getFilesDir(), FILENAME);
        if (!file.exists()) return;
        try {
            String content = new String(Files.readAllBytes(file.toPath()));
            JSONArray arr = new JSONArray(content);
            slots.clear();
            for (int i = 0; i < arr.length(); i++) {
                slots.add(TimetableSlot.fromJson(arr.getJSONObject(i)));
            }
        } catch (Exception ignored) {}
    }

    public synchronized void save() {
        File file = new File(context.getFilesDir(), FILENAME);
        try {
            JSONArray arr = new JSONArray();
            for (TimetableSlot s : slots) {
                arr.put(s.toJson());
            }
            Files.write(file.toPath(), arr.toString(2).getBytes());
        } catch (Exception ignored) {}
    }

    private void loadDefaultSchedule() {
        slots.add(new TimetableSlot(null, 0, "09:00", "10:30", "CS 101: Data Structures", "Hall B", "Prof. Turing", "default"));
        slots.add(new TimetableSlot(null, 0, "11:00", "12:30", "MATH 201: Linear Algebra", "Room 402", "Dr. Euler", "default"));
        slots.add(new TimetableSlot(null, 1, "10:00", "11:30", "PHYS 102: Electromagnetism", "Physics Lab 1", "Dr. Maxwell", "default"));
        slots.add(new TimetableSlot(null, 2, "09:00", "10:30", "CS 101: Data Structures", "Hall B", "Prof. Turing", "default"));
        slots.add(new TimetableSlot(null, 3, "14:00", "15:30", "CS 305: Operating Systems", "Auditorium 2", "Dr. Ritchie", "default"));
        slots.add(new TimetableSlot(null, 4, "11:00", "12:30", "MATH 201: Linear Algebra", "Room 402", "Dr. Euler", "default"));
        save();
    }
}
