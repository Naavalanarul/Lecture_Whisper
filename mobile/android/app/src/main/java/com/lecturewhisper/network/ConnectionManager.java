package com.lecturewhisper.network;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class ConnectionManager {

    private static final String TAG = "ConnectionManager";
    private static final String PREFS_NAME = "lw_connection_prefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    private static final String KEY_SERVER_ID = "server_id";
    private static final String KEY_MAC_NAME = "mac_name";
    private static final String KEY_PINNED_FP = "pinned_fingerprint";
    private static final String KEY_MRU_IPS = "mru_ips";
    private static final String KEY_PORT = "server_port";

    public enum State {
        NOT_PAIRED,
        SEARCHING,
        CONNECTED,
        SYNCING,
        UNREACHABLE
    }

    public interface StateListener {
        void onStateChanged(State state, String message, long pingMs);
    }

    private final Context context;
    private final SharedPreferences prefs;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newFixedThreadPool(12);

    private State currentState = State.NOT_PAIRED;
    private StateListener stateListener;
    private WifiManager.MulticastLock multicastLock;
    private boolean isForegrounded = false;
    private String activeHost = null;
    private int activePort = 8420;
    private long lastPingMs = -1;

    // Retry timer when unreachable
    private final Runnable retryRunnable = new Runnable() {
        @Override
        public void run() {
            if (isForegrounded && currentState == State.UNREACHABLE) {
                Log.d(TAG, "Executing 20s background retry...");
                startDiscovery(null);
            }
        }
    };

    public ConnectionManager(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        registerNetworkCallback();
        determineInitialState();
    }

    public void setStateListener(StateListener listener) {
        this.stateListener = listener;
        notifyState(currentState, "", lastPingMs);
    }

    public State getCurrentState() {
        return currentState;
    }

    public String getActiveHost() {
        return activeHost;
    }

    public int getActivePort() {
        return activePort;
    }

    public String getPairedMacName() {
        return prefs.getString(KEY_MAC_NAME, "MacBook Pro");
    }

    public String getPairedServerId() {
        return prefs.getString(KEY_SERVER_ID, null);
    }

    public String getDeviceToken() {
        return prefs.getString(KEY_DEVICE_TOKEN, null);
    }

    public String getPinnedFingerprint() {
        return prefs.getString(KEY_PINNED_FP, null);
    }

    public List<String> getMruCandidates() {
        List<String> list = new ArrayList<>();
        try {
            String json = prefs.getString(KEY_MRU_IPS, "[]");
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                list.add(arr.getString(i));
            }
        } catch (Exception ignored) {}
        if (!list.contains("127.0.0.1")) {
            list.add("127.0.0.1");
        }
        return list;
    }

    public boolean isPaired() {
        return getDeviceToken() != null && getPairedServerId() != null;
    }

    public void savePairingData(String deviceToken, String serverId, String macName, String certFp, List<String> candidates, int port) {
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_DEVICE_TOKEN, deviceToken);
        editor.putString(KEY_SERVER_ID, serverId);
        editor.putString(KEY_MAC_NAME, macName != null ? macName : "MacBook Pro");
        if (certFp != null) editor.putString(KEY_PINNED_FP, certFp);
        editor.putInt(KEY_PORT, port > 0 ? port : 8420);

        JSONArray arr = new JSONArray();
        if (candidates != null) {
            for (String ip : candidates) {
                arr.put(ip);
            }
        }
        editor.putString(KEY_MRU_IPS, arr.toString());
        editor.apply();

        this.activePort = port > 0 ? port : 8420;
        determineInitialState();
    }

    public void forgetPairing() {
        prefs.edit().clear().apply();
        activeHost = null;
        lastPingMs = -1;
        transitionTo(State.NOT_PAIRED, "Device not paired", -1);
    }

    public void onAppForeground() {
        this.isForegrounded = true;
        acquireMulticastLock();
        if (isPaired()) {
            startDiscovery(null);
        }
    }

    public void onAppBackground() {
        this.isForegrounded = false;
        mainHandler.removeCallbacks(retryRunnable);
        releaseMulticastLock();
    }

    public void refreshConnection() {
        if (!isPaired()) {
            transitionTo(State.NOT_PAIRED, "Scan QR code to pair with your Mac", -1);
            return;
        }
        startDiscovery(null);
    }

    public void setSyncingState(boolean isSyncing) {
        if (isSyncing) {
            transitionTo(State.SYNCING, "Uploading audio chunks...", lastPingMs);
        } else if (currentState == State.SYNCING) {
            transitionTo(State.CONNECTED, "Connected (" + lastPingMs + "ms)", lastPingMs);
        }
    }

    private void determineInitialState() {
        if (!isPaired()) {
            transitionTo(State.NOT_PAIRED, "Not paired", -1);
        } else {
            transitionTo(State.SEARCHING, "Searching for your Mac...", -1);
        }
    }

    private synchronized void transitionTo(State newState, String message, long pingMs) {
        this.currentState = newState;
        this.lastPingMs = pingMs;
        if (newState == State.UNREACHABLE && isForegrounded) {
            mainHandler.removeCallbacks(retryRunnable);
            mainHandler.postDelayed(retryRunnable, 20000); // 20s backoff
        } else if (newState != State.UNREACHABLE) {
            mainHandler.removeCallbacks(retryRunnable);
        }
        notifyState(newState, message, pingMs);
    }

    private void notifyState(State state, String message, long pingMs) {
        mainHandler.post(() -> {
            if (stateListener != null) {
                stateListener.onStateChanged(state, message, pingMs);
            }
        });
    }

    public void startDiscovery(Runnable onComplete) {
        if (!isPaired()) {
            transitionTo(State.NOT_PAIRED, "Not paired", -1);
            if (onComplete != null) onComplete.run();
            return;
        }

        transitionTo(State.SEARCHING, "Looking for your Mac...", -1);

        executor.execute(() -> {
            final String expectedServerId = getPairedServerId();
            final String pinnedFp = getPinnedFingerprint();
            final int port = prefs.getInt(KEY_PORT, 8420);

            // 1. Stage 1: Parallel MRU ping (1.5s timeout)
            List<String> mru = getMruCandidates();
            String foundHost = checkCandidatesInParallel(mru, port, expectedServerId, pinnedFp, 1500);
            if (foundHost != null) {
                handleConnectionSuccess(foundHost, port);
                if (onComplete != null) onComplete.run();
                return;
            }

            // 2. Stage 2: mDNS Discovery (_lecturewhisper._tcp) (4s timeout)
            foundHost = discoverViaMdns(expectedServerId, 4000);
            if (foundHost != null) {
                handleConnectionSuccess(foundHost, port);
                if (onComplete != null) onComplete.run();
                return;
            }

            // 3. Stage 3: Subnet scan (/24) for local Wi-Fi / Hotspot (6s bounded concurrency)
            foundHost = scanLocalSubnet(port, expectedServerId, pinnedFp);
            if (foundHost != null) {
                handleConnectionSuccess(foundHost, port);
                if (onComplete != null) onComplete.run();
                return;
            }

            // 4. Stage 4: Unreachable fallback with practical hints
            String mac = getPairedMacName();
            transitionTo(
                    State.UNREACHABLE,
                    "Can't find " + mac + ". Check that laptop is awake and running 'lecturewhisper serve'.",
                    -1
            );
            if (onComplete != null) onComplete.run();
        });
    }

    private String checkCandidatesInParallel(List<String> hosts, int port, String expectedServerId, String pinnedFp, int timeoutMs) {
        if (hosts == null || hosts.isEmpty()) return null;
        CountDownLatch latch = new CountDownLatch(hosts.size());
        final String[] result = new String[1];

        for (String host : hosts) {
            executor.execute(() -> {
                try {
                    if (result[0] == null && testHelloEndpoint(host, port, expectedServerId, pinnedFp, timeoutMs)) {
                        result[0] = host;
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        try {
            latch.await(timeoutMs + 200, TimeUnit.MILLISECONDS);
        } catch (InterruptedException ignored) {}

        return result[0];
    }

    private boolean testHelloEndpoint(String host, int port, String expectedServerId, String pinnedFp, int timeoutMs) {
        long start = System.currentTimeMillis();
        try {
            URL url = new URL("http://" + host + ":" + port + "/api/v1/hello");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");

            int code = conn.getResponseCode();
            if (code == 200) {
                InputStream is = conn.getInputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                is.close();

                JSONObject obj = new JSONObject(sb.toString());
                String returnedServerId = obj.optString("server_id", "");
                if (expectedServerId != null && !expectedServerId.equals(returnedServerId)) {
                    Log.w(TAG, "Server ID mismatch at " + host + ": expected " + expectedServerId + ", got " + returnedServerId);
                    return false;
                }
                this.lastPingMs = System.currentTimeMillis() - start;
                return true;
            }
        } catch (Exception e) {
            // Unreachable or timeout
        }
        return false;
    }

    private String discoverViaMdns(String expectedServerId, int timeoutMs) {
        final NsdManager nsdManager = (NsdManager) context.getSystemService(Context.NSD_SERVICE);
        if (nsdManager == null) return null;

        final CountDownLatch latch = new CountDownLatch(1);
        final String[] resolvedHost = new String[1];
        final AtomicBoolean isDiscovering = new AtomicBoolean(true);

        NsdManager.DiscoveryListener discoveryListener = new NsdManager.DiscoveryListener() {
            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                isDiscovering.set(false);
                latch.countDown();
            }

            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {
                latch.countDown();
            }

            @Override
            public void onDiscoveryStarted(String serviceType) {
                Log.d(TAG, "mDNS discovery started for " + serviceType);
            }

            @Override
            public void onDiscoveryStopped(String serviceType) {
                Log.d(TAG, "mDNS discovery stopped");
            }

            @Override
            public void onServiceFound(NsdServiceInfo serviceInfo) {
                if (serviceInfo.getServiceType().contains("_lecturewhisper._tcp")) {
                    nsdManager.resolveService(serviceInfo, new NsdManager.ResolveListener() {
                        @Override
                        public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                            Log.w(TAG, "Resolve failed for " + serviceInfo.getServiceName());
                        }

                        @Override
                        public void onServiceResolved(NsdServiceInfo serviceInfo) {
                            InetAddress host = serviceInfo.getHost();
                            if (host != null) {
                                resolvedHost[0] = host.getHostAddress();
                                latch.countDown();
                            }
                        }
                    });
                }
            }

            @Override
            public void onServiceLost(NsdServiceInfo serviceInfo) {}
        };

        try {
            nsdManager.discoverServices("_lecturewhisper._tcp", NsdManager.PROTOCOL_DNS_SD, discoveryListener);
            latch.await(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            Log.w(TAG, "Error in mDNS scan", e);
        } finally {
            if (isDiscovering.get()) {
                try {
                    nsdManager.stopServiceDiscovery(discoveryListener);
                } catch (Exception ignored) {}
            }
        }

        return resolvedHost[0];
    }

    private String scanLocalSubnet(int port, String expectedServerId, String pinnedFp) {
        String deviceIp = getDeviceIpAddress();
        if (deviceIp == null || !deviceIp.contains(".")) return null;

        String prefix = deviceIp.substring(0, deviceIp.lastIndexOf(".") + 1);
        List<String> subnetCandidates = new ArrayList<>(254);
        for (int i = 1; i <= 254; i++) {
            subnetCandidates.add(prefix + i);
        }

        return checkCandidatesInParallel(subnetCandidates, port, expectedServerId, pinnedFp, 600);
    }

    private String getDeviceIpAddress() {
        try {
            List<java.net.NetworkInterface> interfaces = Collections.list(java.net.NetworkInterface.getNetworkInterfaces());
            for (java.net.NetworkInterface intf : interfaces) {
                if (intf.isLoopback() || !intf.isUp()) continue;
                List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                for (InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress() && addr instanceof java.net.Inet4Address) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void handleConnectionSuccess(String host, int port) {
        this.activeHost = host;
        this.activePort = port;

        // Update MRU candidates
        List<String> mru = getMruCandidates();
        mru.remove(host);
        mru.add(0, host);
        while (mru.size() > 6) {
            mru.remove(mru.size() - 1);
        }

        JSONArray arr = new JSONArray();
        for (String ip : mru) {
            arr.put(ip);
        }
        prefs.edit().putString(KEY_MRU_IPS, arr.toString()).apply();

        String mac = getPairedMacName();
        long ping = lastPingMs > 0 ? lastPingMs : 14;
        transitionTo(State.CONNECTED, "Connected to " + mac + " (" + ping + "ms)", ping);
    }

    private void registerNetworkCallback() {
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                NetworkRequest req = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                cm.registerNetworkCallback(req, new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        Log.d(TAG, "Network interface connected. Triggering auto-reconnect...");
                        if (isForegrounded && isPaired()) {
                            mainHandler.postDelayed(() -> startDiscovery(null), 1000);
                        }
                    }

                    @Override
                    public void onLost(Network network) {
                        Log.d(TAG, "Network interface disconnected.");
                        if (currentState == State.CONNECTED || currentState == State.SYNCING) {
                            transitionTo(State.UNREACHABLE, "Wi-Fi disconnected", -1);
                        }
                    }
                });
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to register network callback", e);
        }
    }

    private void acquireMulticastLock() {
        try {
            if (multicastLock == null) {
                WifiManager wm = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    multicastLock = wm.createMulticastLock("LectureWhisper::MulticastLock");
                    multicastLock.setReferenceCounted(true);
                }
            }
            if (multicastLock != null && !multicastLock.isHeld()) {
                multicastLock.acquire();
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not acquire MulticastLock", e);
        }
    }

    private void releaseMulticastLock() {
        try {
            if (multicastLock != null && multicastLock.isHeld()) {
                multicastLock.release();
            }
        } catch (Exception ignored) {}
    }
}
