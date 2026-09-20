package com.lecturewhisper.network;

import com.lecturewhisper.model.TimetableSlot;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class LaptopSyncClient {

    public static class PingResult {
        public final boolean ok;
        public final long latencyMs;
        public final String message;

        public PingResult(boolean ok, long latencyMs, String message) {
            this.ok = ok;
            this.latencyMs = latencyMs;
            this.message = message;
        }
    }

    public static PingResult ping(String host, int port) {
        long start = System.currentTimeMillis();
        HttpURLConnection conn = null;
        try {
            URL url = new URL("http://" + host + ":" + port + "/api/health");
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(2500);
            conn.setReadTimeout(2500);
            conn.setRequestMethod("GET");
            conn.connect();

            int code = conn.getResponseCode();
            long latency = System.currentTimeMillis() - start;
            if (code == 200) {
                return new PingResult(true, latency, "Connected to MacBook Pro (" + latency + "ms)");
            } else {
                return new PingResult(false, latency, "Server responded with HTTP " + code);
            }
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new PingResult(false, latency, e.getClass().getSimpleName() + ": " + e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    public static List<TimetableSlot> uploadTimetablePhoto(String host, int port, File imageFile) throws Exception {
        String boundary = "===LWBoundary" + System.currentTimeMillis() + "===";
        String lineEnd = "\r\n";
        String twoHyphens = "--";

        URL url = new URL("http://" + host + ":" + port + "/api/timetable/extract");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(45000); // Allow time for local OCR/VLM processing
        conn.setDoInput(true);
        conn.setDoOutput(true);
        conn.setUseCaches(false);
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Connection", "Keep-Alive");
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        try (DataOutputStream dos = new DataOutputStream(conn.getOutputStream());
             FileInputStream fis = new FileInputStream(imageFile)) {

            // Write image file parameter
            dos.writeBytes(twoHyphens + boundary + lineEnd);
            dos.writeBytes("Content-Disposition: form-data; name=\"image\"; filename=\"" + imageFile.getName() + "\"" + lineEnd);
            dos.writeBytes("Content-Type: image/png" + lineEnd);
            dos.writeBytes(lineEnd);

            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = fis.read(buffer)) != -1) {
                dos.write(buffer, 0, bytesRead);
            }
            dos.writeBytes(lineEnd);
            dos.writeBytes(twoHyphens + boundary + twoHyphens + lineEnd);
            dos.flush();
        }

        int responseCode = conn.getResponseCode();
        if (responseCode != 200) {
            String err = readStream(conn.getErrorStream());
            throw new RuntimeException("Server OCR error (HTTP " + responseCode + "): " + err);
        }

        String responseBody = readStream(conn.getInputStream());
        JSONObject json = new JSONObject(responseBody);
        JSONArray slotsArr = json.optJSONArray("slots");
        List<TimetableSlot> parsedSlots = new ArrayList<>();
        if (slotsArr != null) {
            for (int i = 0; i < slotsArr.length(); i++) {
                parsedSlots.add(TimetableSlot.fromJson(slotsArr.getJSONObject(i)));
            }
        }
        return parsedSlots;
    }

    public static boolean syncTimetable(String host, int port, List<TimetableSlot> slots) throws Exception {
        URL url = new URL("http://" + host + ":" + port + "/api/timetable/sync");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);

        JSONObject payload = new JSONObject();
        JSONArray arr = new JSONArray();
        for (TimetableSlot s : slots) {
            arr.put(s.toJson());
        }
        payload.put("slots", arr);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
            os.flush();
        }

        int code = conn.getResponseCode();
        return code == 200;
    }

    public static boolean uploadAudioChunk(String host, int port, File chunkFile, String subject, String slotId, String deviceId, int chunkIndex) throws Exception {
        String boundary = "===LWUploadBoundary" + System.currentTimeMillis() + "===";
        String lineEnd = "\r\n";
        String twoHyphens = "--";

        URL url = new URL("http://" + host + ":" + port + "/api/recordings/upload");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(60000);
        conn.setDoInput(true);
        conn.setDoOutput(true);
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        try (DataOutputStream dos = new DataOutputStream(conn.getOutputStream())) {
            // Write form text fields
            writeFormField(dos, boundary, "subject", subject);
            if (slotId != null) writeFormField(dos, boundary, "timetable_slot_id", slotId);
            writeFormField(dos, boundary, "device_id", deviceId);
            writeFormField(dos, boundary, "chunk_index", String.valueOf(chunkIndex));

            // Write audio file
            dos.writeBytes(twoHyphens + boundary + lineEnd);
            dos.writeBytes("Content-Disposition: form-data; name=\"file\"; filename=\"" + chunkFile.getName() + "\"" + lineEnd);
            dos.writeBytes("Content-Type: audio/mp4" + lineEnd);
            dos.writeBytes(lineEnd);

            try (FileInputStream fis = new FileInputStream(chunkFile)) {
                byte[] buffer = new byte[16384];
                int bytesRead;
                while ((bytesRead = fis.read(buffer)) != -1) {
                    dos.write(buffer, 0, bytesRead);
                }
            }
            dos.writeBytes(lineEnd);
            dos.writeBytes(twoHyphens + boundary + twoHyphens + lineEnd);
            dos.flush();
        }

        int responseCode = conn.getResponseCode();
        return responseCode == 200;
    }

    public static class PairResult {
        public final boolean ok;
        public final String deviceToken;
        public final String macName;
        public final String serverId;
        public final List<String> candidates;
        public final String error;

        public PairResult(boolean ok, String deviceToken, String macName, String serverId, List<String> candidates, String error) {
            this.ok = ok;
            this.deviceToken = deviceToken;
            this.macName = macName;
            this.serverId = serverId;
            this.candidates = candidates;
            this.error = error;
        }
    }

    public static PairResult completePairing(String host, int port, String token, String deviceId, String deviceName) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL("http://" + host + ":" + port + "/api/v1/pair/complete");
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(2500);
            conn.setReadTimeout(3000);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setDoOutput(true);

            JSONObject body = new JSONObject();
            body.put("token", token);
            body.put("device_id", deviceId);
            body.put("device_name", deviceName != null ? deviceName : "Pixel 8a");

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            int code = conn.getResponseCode();
            if (code == 200) {
                String res = readStream(conn.getInputStream());
                JSONObject json = new JSONObject(res);
                String devTok = json.getString("device_token");
                String mac = json.optString("mac_name", "MacBook Pro");
                String sid = json.optString("server_id", "MacBook");
                List<String> cands = new ArrayList<>();
                JSONArray arr = json.optJSONArray("address_candidates");
                if (arr != null) {
                    for (int i = 0; i < arr.length(); i++) {
                        cands.add(arr.getString(i));
                    }
                }
                return new PairResult(true, devTok, mac, sid, cands, null);
            } else {
                String err = readStream(conn.getErrorStream());
                return new PairResult(false, null, null, null, null, "Pairing error (" + code + "): " + err);
            }
        } catch (Exception e) {
            return new PairResult(false, null, null, null, null, e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static void writeFormField(DataOutputStream dos, String boundary, String name, String value) throws Exception {
        String lineEnd = "\r\n";
        String twoHyphens = "--";
        dos.writeBytes(twoHyphens + boundary + lineEnd);
        dos.writeBytes("Content-Disposition: form-data; name=\"" + name + "\"" + lineEnd);
        dos.writeBytes(lineEnd);
        dos.write(value.getBytes(StandardCharsets.UTF_8));
        dos.writeBytes(lineEnd);
    }

    private static String readStream(InputStream is) throws Exception {
        if (is == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
            return sb.toString().trim();
        }
    }
}
