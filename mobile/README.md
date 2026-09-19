<p align="center">
  <img src="../docs/assets/logo.png" width="120" height="120" alt="Lecture Whisper Mobile Logo" />
</p>

# 📱 Lecture Whisper — Android Application (Pixel 8a, Android 17)

The mobile companion application for Lecture Whisper, engineered specifically for the **Google Pixel 8a** running **Android 17 (API 35+)**.

---

## 🚀 Download & Installation

The signed v1.0.0 (Beta) release APK is published on GitHub:
👉 **[Download LectureWhisper-v1.0.0-release.apk](https://github.com/Naavalanarul/Lecture_Whisper/releases/latest)**

### Fast ADB Sideload:
```bash
# Verify USB connection to Pixel 8a
adb devices

# Install signed release APK
adb install -r mobile/release/LectureWhisper-v1.0.0-release.apk
```

---

## 📱 Android Client — Beta (Material 3 Dark)

The mobile client is engineered as a resilient academic companion with 4 dedicated views, a sliding navigation sidebar, timetable OCR, and automatic laptop synchronization:

### 1. Dynamic Class Banner & Live Recorder (Tab 1)
- **Schedule-Aware Auto-Tagging**: Detects current day of the week and active time slot from the timetable. Ongoing lectures are highlighted (`🟢 CURRENT CLASS IN PROGRESS`), automatically tagging audio sessions and chunk folders with the subject, room, and lecturer.
- **Upcoming Lecture Alerts**: Shows upcoming lectures today with countdowns (e.g. `🟠 UPCOMING CLASS IN 25 MINS`).
- **One-Tap Hero Record**: Circular stateful record button with high-contrast digital timer (`00:00:00`), rotating chunk counter, and manual subject overrides.
- **Direct Local Sync**: Trigger instantaneous transfer of completed audio sessions to MacBook Pro.

### 2. Timetable & Photo OCR Scanner (Tab 2)
- **Host-Accelerated OCR**: Upload a photo of any university schedule or paper timetable. The app dispatches the photo to the MacBook Pro endpoint (`/api/timetable/extract`), parsing the grid with Tesseract OCR / ML vision and populating weekly classes (`weekday`, `start_time`, `end_time`, `subject`, `room`, `lecturer`).
- **Weekly Schedule Deck**: 7-day selector (Mon–Sun) with today highlighted, class cards, and one-tap "Record This Class Now" triggers.
- **Manual Class Editor**: Easily add, edit, or remove lecture slots.

### 3. Audio Library & Chunk Manager (Tab 3)
- **Local Session Catalog**: Lists recorded lecture sessions organized by subject, date, chunk count, and total MB.
- **Sync Status Badges**: Distinguishes between `✓ Synced` (confirmed on MacBook) and `▲ Local Only`.
- **Audio Preview Playback**: Listen to audio previews directly on device before archiving or transferring.

### 4. Real-Time Connection Diagnostics & How-to-Connect Guide (Tab 4)
- **Live Status Chip**: Top header badge indicates connection state with ping latency (e.g. `🟢 Connected (14ms)` or `🟠 Offline (Tap)`).
- **Interactive Connection Guide**:
  1. **Wi-Fi LAN**: Connect both devices to the same router and enter Mac LAN IP.
  2. **Personal Hotspot**: Bypass university network client isolation by connecting via mobile or Mac hotspot.
  3. **Zero-Latency USB Cable**: Plug in USB-C cable, run `adb reverse tcp:8420 tcp:8420`, and connect via `127.0.0.1` without any network setup.

### 5. Sliding Navigation Sidebar
- **Live Storage Metrics**: Uses Android `StatFs` to report internal phone free space, app audio cache footprint in MB, and pending upload queues.
- **One-Tap Space Reclamation**: "Clean Synced Chunks" button safely deletes local audio files that have already been confirmed uploaded to MacBook Pro, keeping metadata intact.
- **Hardware Specifications**: Full readouts of the 16 kHz AAC beamforming engine, `FOREGROUND_SERVICE_MICROPHONE`, `PARTIAL_WAKE_LOCK`, and battery optimization settings.

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
