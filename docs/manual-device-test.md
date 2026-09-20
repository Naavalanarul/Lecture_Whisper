# Manual On-Device Verification Checklist (Pixel 8a, Android 17)

Since no device was connected via adb during automated test runs, execute this manual verification checklist on your Pixel 8a once sideloaded.

## 1. Prerequisites & Permissions
- [ ] Connect device to Wi-Fi on the same local network as the laptop (or use phone hotspot).
- [ ] Install debug APK via `adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- [ ] Launch **Lecture Whisper** on Pixel 8a.
- [ ] **One-Time Consent Reminder Screen**: Verify that institutional/lecturer recording consent screen is displayed on first launch and cannot be bypassed without checking confirmation.
- [ ] Grant **Microphone Permission** (`RECORD_AUDIO`).
- [ ] Grant **Notification Permission** (`POST_NOTIFICATIONS`).
- [ ] Grant **Exact Alarm Permission** in Settings (`SCHEDULE_EXACT_ALARM`).
- [ ] Accept **Battery Optimization Exemption** prompt (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).

## 2. Pairing & ConnectionManager Verification
- [ ] On laptop, run `lecturewhisper serve` or `lecturewhisper pair`.
- [ ] Open the web dashboard (`http://localhost:8420`) and tap **Pair Pixel 8a**, or view the terminal QR code.
- [ ] On phone, tap the Connection status chip in the top header, or tap **Pair Mac** in Settings.
- [ ] **QR Camera Scanner**: Point camera at the QR code on laptop. Verify viewfinder brackets, animated scan line, and instant capture.
- [ ] **6-Digit Fallback**: Alternatively, enter the 6-digit code displayed on laptop (e.g. `961577`) and tap **Submit**.
- [ ] Verify instant pairing: server completes cryptographic handshake (`POST /api/v1/pair/complete`), sets `lw_tok_...`, and returns server identity.
- [ ] **Connection States**:
  - `CONNECTED`: Header chip displays `🟢 Connected` with Mac name and ping latency.
  - Turn off Mac Wi-Fi: Phone automatically transitions to `SEARCHING` then `UNREACHABLE` (`🟠 Offline`).
  - Turn Mac Wi-Fi back on: Phone `ConnectionManager` automatically rediscovers Mac via MRU cache / mDNS and reconnects without user intervention.

## 3. Recording & Real-Time Waveform Visualizer
- [ ] Navigate to the center **Record** tab (raised hero button).
- [ ] Tap the large circular Record button.
- [ ] Verify haptic feedback and spring transition into active recording mode.
- [ ] **Live Audio Visualizer**: Speak into the microphone. Verify the 7-band real-time audio visualizer bars animate with your voice volume.
- [ ] Verify digital timer incrementing (`00:00:01`, `00:00:02`, ...).
- [ ] Verify persistent foreground notification appears: *"Lecture Whisper — Recording in progress"*.
- [ ] Lock the phone screen for 5 minutes.
- [ ] Unlock phone: verify recording continued smoothly without dropouts.
- [ ] Tap **Stop Recording**. Verify session is cataloged in the **Library** tab.

## 4. 5-Tab Navigation & UI Polish
- [ ] **Today Tab**: Shows dynamic class banner (current or upcoming class), today's scheduled slots, quick action cards.
- [ ] **Schedule Tab**: 7-day selector, weekly class schedule, "Add Class" dialog, and photo OCR upload.
- [ ] **Record Tab**: Elevated center button, live waveform meter, class subject selector.
- [ ] **Library Tab**: Stored sessions with chunk counts, total MB, sync state badges (`✓ Synced` / `▲ Local Only`), and storage metrics.
- [ ] **Settings Tab**: Paired Mac identity, TLS certificate details, Theme switcher (System / Light / Dark), storage reclamation cleaner.
- [ ] **Theming**: Toggle System, Light, and Dark modes. Verify strict 2-hue discipline (Brand Indigo `#6366F1` and Alert `#EF4444`) with high contrast text in all modes.

## 5. Resumable Upload & Auto-Sync
- [ ] Ensure laptop server is running (`lecturewhisper serve`).
- [ ] In the app, trigger **Sync to Mac** or let background `ConnectionManager` sync automatically.
- [ ] Verify chunks are transmitted to Mac via `/api/recordings/upload`.
- [ ] When upload finishes: verify server completes SHA-256 validation and local session updates to `✓ Synced`.
- [ ] Open laptop web dashboard (`http://localhost:8420`): verify new recording appears in Inbox and processing pipeline starts.

Report any unexpected behavior or logs using:
`adb logcat -s LectureWhisper:V AndroidRuntime:E`
