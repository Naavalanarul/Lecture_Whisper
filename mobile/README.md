<p align="center">
  <img src="../docs/assets/logo.png" width="120" height="120" alt="Lecture Whisper Mobile Logo" />
</p>

# 📱 Lecture Whisper — Android Application (Pixel 8a, Android 15 / SDK 35)

The mobile companion application for Lecture Whisper, engineered specifically for the **Google Pixel 8a** running **Android 15 (API 35+)** with forward compatibility.

---

## 🚀 Download & Installation

The signed v1.0.0 production release APK is published on GitHub:
👉 **[Download LectureWhisper-v1.0.0-release.apk](https://github.com/Naavalanarul/Lecture_Whisper/releases/latest)**

### Fast ADB Sideload:
```bash
# Verify USB connection to Pixel 8a
adb devices

# Install signed release APK
adb install -r mobile/release/LectureWhisper-v1.0.0-release.apk

# Enable zero-latency USB reverse tethering (:8420)
bash mobile/connect_device.sh
```

### 🔐 Artifact Verification

| Parameter | Value |
|---|---|
| **File** | `mobile/release/LectureWhisper-v1.0.0-release.apk` |
| **File Size** | **197 KB** (Lean, zero heavy framework overhead) |
| **Target SDK** | **35 (Android 15)** |
| **Min SDK** | **26 (Android 8.0+)** |
| **Signature Schemes** | **APK Signature Scheme v2 & v3 (Verified)** |
| **SHA-256 Checksum** | `655ebbb57ed4163f77576c0a7786eaaee8fa717bab5d8900dfeb57ff0817e6e9` |

---

## 📱 Android Client — v2.0.0 (Instagram-Grade UI & Auto-Reconnection)

The mobile client is engineered as a resilient academic companion with a 5-tab Instagram-grade navigation shell, real-time waveform visualizer, one-tap QR camera pairing, timetable OCR, and automatic laptop synchronization:

### 1. Today & Dynamic Class Banner (Tab 1)
- **Schedule-Aware Auto-Tagging**: Detects current day of the week and active time slot from the timetable. Ongoing lectures are highlighted (`Current class in progress`), automatically tagging audio sessions and chunk folders with the subject, room, and lecturer.
- **Upcoming Lecture Alerts**: Shows upcoming lectures today with countdowns (e.g. `Upcoming class in 25m`).
- **Quick Action Cards**: Launch recording directly for today's scheduled classes or view agenda at a glance.

### 2. Timetable & Photo OCR Scanner (Tab 2)
- **Host-Accelerated OCR**: Upload a photo of any university schedule or paper timetable. The app dispatches the photo to the MacBook Pro endpoint (`/api/timetable/extract`), parsing the grid with Tesseract OCR / ML vision and populating weekly classes (`weekday`, `start_time`, `end_time`, `subject`, `room`, `lecturer`).
- **Weekly Schedule Deck**: 7-day selector (Mon–Sun) with today highlighted, class cards, and one-tap "Record This Class Now" triggers.
- **Manual Class Editor**: Add or customize class slots with subject, start/end time, and room details.

### 3. Studio Record & Real-Time Waveform (Tab 3 - Hero Raised)
- **Raised Hero Record Button**: Central elevated action button with haptic feedback and spring physics.
- **7-Band Real-Time Audio Visualizer**: Live amplitude visualizer responding dynamically to the lecturer's voice.
- **Digital Session Timer**: Monospace stopwatch (`00:00:00`) tracking active elapsed recording time.
- **Subject Selector & Overrides**: Auto-populated from the active timetable slot with single-tap manual overrides.

### 4. Audio Library & Chunk Manager (Tab 4)
- **Local Session Catalog**: Lists recorded lecture sessions organized by subject, date, chunk count, and formatted size.
- **Sync Status Badges**: Distinguishes between `✓ Synced` (confirmed on MacBook) and `▲ Local Only`.
- **Direct Manual & Auto-Sync**: Background auto-sync pushes completed chunks to MacBook Pro via `/api/recordings/upload`.

### 5. Settings, QR Pairing & Connection Diagnostics (Tab 5)
- **One-Tap QR Camera Scanner**: Viewfinder with corner brackets, animated scan line, and camera flash toggle. Point at laptop QR code for instant pairing with SHA-256 fingerprint pinning and 2-minute expiring tokens.
- **6-Digit Fallback Code**: Enter the numeric fallback code if camera access is restricted.
- **ConnectionManager 5-State Engine**: Live state machine (`NOT_PAIRED`, `SEARCHING`, `CONNECTED`, `SYNCING`, `UNREACHABLE`) with parallel MRU ping (1.5s), mDNS discovery (4s), and automatic background reconnection.
- **Live Storage Metrics & Cleaner**: Android `StatFs` metrics for free device space and audio cache footprint, with one-tap pruning of synced chunks.
- **Theme Switcher**: Instant switching between System, Light, and Dark modes adhering to WCAG AA contrast.

---

## ⚙️ Architecture & Features

### 1. Zero-Cloud Privacy
All audio recorded on the phone is kept strictly within the local device and pushed directly to the user's MacBook Pro over the local Wi-Fi, hotspot, or USB. No telemetry, no third-party cloud SDKs, no accounts.

### 2. Foreground Microphone Recording
Android 14+ restricts background microphone access. Lecture Whisper implements a native `ForegroundService` with `foregroundServiceType="microphone"`:
- Holds a `PARTIAL_WAKE_LOCK` to ensure continuous audio streaming even when the screen is locked in a backpack or pocket.
- Uses hardware-tuned `MediaRecorder.AudioSource.VOICE_RECOGNITION` with beamforming to capture the lecturer's voice clearly from lecture hall seating.
- Records in 16 kHz mono AAC (`.m4a`) to optimize Whisper acoustic compatibility and storage.

### 3. Rotating 10-Minute Chunks & Crash Resilience
Audio is recorded in rotating 10-minute files (`chunk_0000.m4a`, `chunk_0001.m4a`, ...). If the device runs out of battery, restarts, or an OS crash occurs, at most <10 minutes of audio is affected.

### 4. Automatic Two-Way Synchronization
- Automatically detects connection to the MacBook Pro.
- Syncs timetable slots (`/api/timetable/sync`) whenever schedule changes are made on phone or desktop.
- Uploads unsynced audio chunks to the server with matching timetable slot IDs and metadata.

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
