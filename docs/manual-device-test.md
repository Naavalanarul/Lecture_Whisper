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

## 2. Pairing Verification
- [ ] On laptop, run `lecturewhisper serve` or `lecturewhisper pair`.
- [ ] On phone, tap **Pair Device** and scan the QR code displayed in the terminal or web dashboard.
- [ ] Confirm phone displays **"Paired with Server: <hostname>"** and receives a persistent long-lived device token (`lw_tok_...`).
- [ ] Check laptop SQLite database (`lecturewhisper.db`): verify new entry in `paireddevicerow`.

## 3. Recording & Foreground Service
- [ ] Tap **Record Now**.
- [ ] Verify persistent foreground notification appears: *"Lecture Whisper — Recording in progress"*.
- [ ] Check notification icon: mic indicator active in status bar.
- [ ] Lock the phone screen for 5 minutes.
- [ ] Unlock phone: verify recording timer continued incrementing without pause.
- [ ] Tap **Stop Recording**. Verify chunk files are listed under **Saved Recordings**.

## 4. Scheduling Modes Evaluation (Test each mode)

### Mode 1: Alarm → Notification Tap
- [ ] Set a class slot in Timetable for 2 minutes from now. Select **Mode 1: Alarm Tap**.
- [ ] Lock phone and wait.
- [ ] At start time: verify high-priority notification pops up (*"Class starting — tap to record"*).
- [ ] Tap notification: verify recording foreground service starts immediately.

### Mode 2: Class Day Mode
- [ ] Set a class slot for 5 minutes from now. Select **Mode 2: Class Day**.
- [ ] Keep service pre-warmed in morning mode.
- [ ] At scheduled slot time: verify mic activates automatically and begins recording.

### Mode 3: Assistant-Role Mode (Optional)
- [ ] Go to Android Settings -> Apps -> Default apps -> Digital assistant app -> select **Lecture Whisper**.
- [ ] Verify background session launch privileges. Note findings in `docs/android-findings.md`.

## 5. Resumable Upload (TUS Protocol)
- [ ] Ensure laptop server is running (`lecturewhisper serve`).
- [ ] Open Lecture Whisper app on phone.
- [ ] Verify queued recordings show progress bar and auto-upload over LAN.
- [ ] While upload is at ~50%, toggle Wi-Fi off for 5 seconds on phone, then turn it back on.
- [ ] Verify upload **resumes** from where it stopped (check `HEAD /api/files/<id>` and `Upload-Offset`).
- [ ] When upload finishes: verify server completes SHA-256 validation and local audio is safely deleted from phone storage only after server returns SHA-256 confirmation.
- [ ] Open laptop web dashboard (`http://localhost:8420`): verify new recording appears in Inbox and processing pipeline starts.

Report any unexpected behavior or logs using:
`adb logcat -s LectureWhisper:V AndroidRuntime:E`
