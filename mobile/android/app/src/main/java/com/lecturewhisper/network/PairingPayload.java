package com.lecturewhisper.network;

import android.net.Uri;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class PairingPayload {

    public String version = "1";
    public String serverId;
    public String macName;
    public List<String> addressCandidates = new ArrayList<>();
    public int port = 8420;
    public String certFingerprint;
    public String oneTimeToken;
    public long expiresAtUnix = 0;

    public static PairingPayload parse(String raw) {
        if (raw == null || raw.trim().isEmpty()) return null;
        raw = raw.trim();

        PairingPayload payload = new PairingPayload();

        // 1. Check URI format: lecturewhisper://pair?... or lw://pair?...
        if (raw.startsWith("lecturewhisper://pair") || raw.startsWith("lw://pair") || raw.contains("://pair")) {
            try {
                Uri uri = Uri.parse(raw);
                payload.version = uri.getQueryParameter("v") != null ? uri.getQueryParameter("v") : "1";
                payload.serverId = uri.getQueryParameter("sid");
                payload.macName = uri.getQueryParameter("n") != null ? uri.getQueryParameter("n") : payload.serverId;

                String hosts = uri.getQueryParameter("h");
                if (hosts != null) {
                    payload.addressCandidates.addAll(Arrays.asList(hosts.split(",")));
                } else if (uri.getQueryParameter("host") != null) {
                    payload.addressCandidates.add(uri.getQueryParameter("host"));
                }

                String p = uri.getQueryParameter("p");
                if (p == null) p = uri.getQueryParameter("port");
                if (p != null) payload.port = Integer.parseInt(p);

                payload.certFingerprint = uri.getQueryParameter("fp");
                payload.oneTimeToken = uri.getQueryParameter("t");
                if (payload.oneTimeToken == null) payload.oneTimeToken = uri.getQueryParameter("token");

                String exp = uri.getQueryParameter("exp");
                if (exp != null) payload.expiresAtUnix = Long.parseLong(exp);

                return payload;
            } catch (Exception ignored) {}
        }

        // 2. Check JSON format
        if (raw.startsWith("{") && raw.endsWith("}")) {
            try {
                JSONObject json = new JSONObject(raw);
                payload.serverId = json.optString("server_id", "MacBook");
                payload.macName = json.optString("name", payload.serverId);
                payload.port = json.optInt("port", 8420);
                payload.oneTimeToken = json.optString("token", null);
                payload.certFingerprint = json.optString("cert_fingerprint", null);

                String host = json.optString("host", null);
                if (host != null) payload.addressCandidates.add(host);

                return payload;
            } catch (Exception ignored) {}
        }

        // 3. Fallback: 6-digit numeric token
        if (raw.matches("^\\d{6}$")) {
            payload.oneTimeToken = raw;
            payload.serverId = "Manual";
            payload.macName = "MacBook Pro";
            payload.addressCandidates.add("127.0.0.1");
            return payload;
        }

        return null;
    }
}
