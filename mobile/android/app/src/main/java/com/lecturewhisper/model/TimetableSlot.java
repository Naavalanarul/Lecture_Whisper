package com.lecturewhisper.model;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.Serializable;
import java.util.UUID;

public class TimetableSlot implements Serializable {
    private String id;
    private int weekday; // 0 = Monday, ..., 6 = Sunday
    private String startTime; // "09:00:00" or "09:00"
    private String endTime;   // "10:30:00" or "10:30"
    private String subject;
    private String room;
    private String lecturer;
    private String groupId;

    public TimetableSlot(String id, int weekday, String startTime, String endTime, String subject, String room, String lecturer, String groupId) {
        this.id = id != null ? id : UUID.randomUUID().toString();
        this.weekday = weekday;
        this.startTime = startTime;
        this.endTime = endTime;
        this.subject = subject != null ? subject : "Lecture";
        this.room = room;
        this.lecturer = lecturer;
        this.groupId = groupId != null ? groupId : "default";
    }

    public static TimetableSlot fromJson(JSONObject json) {
        String id = json.optString("id", UUID.randomUUID().toString());
        int weekday = json.optInt("weekday", 0);
        String start = json.optString("start_time", json.optString("start", "09:00"));
        String end = json.optString("end_time", json.optString("end", "10:30"));
        String subject = json.optString("subject", "Lecture");
        String room = json.isNull("room") ? null : json.optString("room", null);
        String lecturer = json.isNull("lecturer") ? null : json.optString("lecturer", null);
        String group = json.optString("timetable_group_id", "default");

        return new TimetableSlot(id, weekday, start, end, subject, room, lecturer, group);
    }

    public JSONObject toJson() {
        JSONObject obj = new JSONObject();
        try {
            obj.put("id", id);
            obj.put("weekday", weekday);
            obj.put("start_time", startTime);
            obj.put("end_time", endTime);
            obj.put("subject", subject);
            if (room != null) obj.put("room", room);
            if (lecturer != null) obj.put("lecturer", lecturer);
            obj.put("timetable_group_id", groupId);
        } catch (JSONException e) {
            // Should not happen with valid primitives
        }
        return obj;
    }

    public String getId() { return id; }
    public int getWeekday() { return weekday; }
    public String getStartTime() { return startTime; }
    public String getEndTime() { return endTime; }
    public String getSubject() { return subject; }
    public String getRoom() { return room != null ? room : ""; }
    public String getLecturer() { return lecturer != null ? lecturer : ""; }
    public String getGroupId() { return groupId; }

    public String getTimeRangeFormatted() {
        String s = startTime.length() > 5 ? startTime.substring(0, 5) : startTime;
        String e = endTime.length() > 5 ? endTime.substring(0, 5) : endTime;
        return s + " – " + e;
    }
}
