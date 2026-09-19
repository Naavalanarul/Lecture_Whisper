# 📱 Lecture Whisper — Android Application (Pixel 8a, Android 17)

The mobile companion application for Lecture Whisper, engineered specifically for the **Google Pixel 8a** running **Android 17 (API 35+)**.

---

## 🚀 Download & Installation

The signed production release APK is published on GitHub:
👉 **[Download LectureWhisper-v1.0.0-release.apk](https://github.com/Naavalanarul/Lecture_Whisper/releases/latest)**

### Fast ADB Sideload:
```bash
# Verify USB connection to Pixel 8a
adb devices

# Install signed release APK
adb install -r mobile/release/LectureWhisper-v1.0.0-release.apk
```

---

## ⚙️ Architecture & Features

### 1. Zero-Cloud Privacy
All audio recorded on the phone is kept strictly within the local device and pushed directly to the user's MacBook Pro over the local Wi-Fi or hotspot. No telemetry, no third-party cloud SDKs, no accounts.

### 2. Foreground Microphone Recording
Android 14+ restricts background microphone access. Lecture Whisper implements a native `ForegroundService` with `foregroundServiceType="microphone"`:
- Holds a `PARTIAL_WAKE_LOCK` to ensure continuous audio streaming even when the screen is locked in a backpack or pocket.
- Uses hardware-tuned `MediaRecorder.AudioSource.VOICE_RECOGNITION` with beamforming to capture the lecturer's voice clearly from lecture hall seating.
- Records in 16 kHz mono AAC (`.m4a`) to optimize Whisper acoustic compatibility and storage.

### 3. Rotating 10-Minute Chunks & Crash Resilience
Audio is recorded in rotating 10-minute files (`chunk_0000.m4a`, `chunk_0001.m4a`, ...). If the device runs out of battery, restarts, or an OS crash occurs, at most <10 minutes of audio is affected.

### 4. Resumable Upload Queue (tus v1.0.0)
- Auto-detects connection to the MacBook Pro over local LAN (via mDNS, last-known IP, or subnet ping).
- Uploads completed chunks sequentially with SHA-256 integrity verification.
- Interrupted transfers automatically resume at the exact byte offset upon reconnection.

### 5. Scheduling Modes
- **Mode 1: Alarm Tap (Default)**: Exact alarm (`SCHEDULE_EXACT_ALARM`) fires 2 minutes before scheduled class with high-priority notification. One tap launches recording.
- **Mode 2: Class Day**: Automatically arms the foreground service for students on intensive lecture days.
- **Mode 3: Assistant-Role**: Implements `VoiceInteractionService` for voice-triggered start.

---

## 🛠️ Building From Source

To compile and sign the release APK from source:
```bash
chmod +x mobile/build_release_apk.sh
./mobile/build_release_apk.sh
```
The script will compile resources with `aapt2`, compile Java sources with `javac`, convert bytecode with `d8`, align with `zipalign`, and sign with `apksigner`.

Output:
`mobile/release/LectureWhisper-v1.0.0-release.apk`
