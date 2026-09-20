# Lecture Whisper v1.0.0 — Beta Release

A personal, fully local lecture-notes and academic intelligence system engineered for:
- **Server / Host**: Apple Silicon Mac (macOS, local MLX inference)
- **Client / Mobile**: Google Pixel 8a (Android 17, API 35+)

---

## 📱 Android Application Release (`LectureWhisper-v1.0.0-release.apk`)

This release includes the signed v1.0.0 (Beta) Android APK for **Google Pixel 8a** running **Android 17**.

### Key Mobile Features:
- **Material 3 Dark Client**: Dedicated views for Live Recorder, Weekly Timetable, Device Audio Library, and MacBook Connection & Diagnostics.
- **Dynamic Schedule-Aware Recording**: Detects current active lecture from timetable, auto-tagging recording sessions and folders with the subject, room, and lecturer.
- **Host-Accelerated Timetable Photo OCR**: Capture or upload schedule photos, extract weekly class grids using OCR / ML vision on the Mac, and instantly populate device schedule.
- **Sliding Navigation Sidebar**: Real-time internal storage stats via Android `StatFs` (device free space, app cache footprint in MB, pending uploads) with a one-tap clean-up tool for synced chunks.
- **Connection Monitor & 3-Mode Guide**: Live ping latency chip (`🟢 Connected (14ms)` / `🟠 Offline`) and troubleshooting guide for Wi-Fi LAN, Personal Hotspot, and zero-latency USB tethering (`adb reverse tcp:8420 tcp:8420`).
- **Automatic Two-Way Synchronization**: Automatically pushes timetable slots and unsynced audio chunks as soon as Mac connection is detected.
- **Foreground Microphone Service**: Uses `foregroundServiceType="microphone"` with ongoing notification to keep recording resilient against OS background limits; battery optimization should be set to "Unrestricted".
- **Rotating 10-Minute AAC Chunks**: Audio is captured in 16 kHz mono AAC `.m4a` files with `PARTIAL_WAKE_LOCK`. Crash-resilient chunk preservation.
- **Exact Class Alarms**: Uses `SCHEDULE_EXACT_ALARM` to notify you 2 minutes before lecture start with a one-tap record action.
- **Zero Cloud Footprint**: Nothing leaves your local LAN. No accounts, no telemetry, no third-party cloud SDKs.

### Sideload via ADB:
```bash
adb devices
adb install -r LectureWhisper-v1.0.0-release.apk
```

### Artifact Verification:
- **File**: `LectureWhisper-v1.0.0-release.apk`
- **Min SDK**: 26 (Android 8.0+)
- **Target SDK**: 35 (Android 15 / 17 compatible)
- **Signature Schemes**: APK Signature Scheme v2 & v3 (Verified)
- **SHA-256 Checksum**: `4d17e228574ca5c85439c9be0bf6096f1a1242592d08ae324f8e9c90e6b51688`
- **Branding**: Official vector mark integration (`ic_brand_mark.xml`, `ic_launcher_foreground.xml`), Android 13+ monochrome themed icon support, and high-density launcher mipmaps.

---

## 🖥️ Server & Web Dashboard Highlights

- **Linear / Vercel Aesthetic Dashboard**: Built with React 18, TypeScript, and Tailwind CSS.
- **8 Dedicated Academic Views**:
  1. *Library*: Lecture catalog, duration metrics, drag-and-drop manual audio upload.
  2. *Lecture Deep-Dive*: Synchronized audio scrubber with chapter tick-marks, word-level audio seek, and Markdown-styled notes deck.
  3. *Deadlines & Events*: Relative countdowns ("due Friday", "exam in 3 days"), review confirmation, and one-click `.ics` calendar download.
  4. *Important Questions*: Exam hints and conceptual inquiries flagged during lecture with direct audio jump links.
  5. *Speaker Intelligence*: Diarization talk-time distribution bar, speaking pace (WPM), and local voiceprint registration.
  6. *Habits & Emphasis*: Separates key conceptual technical terms from conversational verbal mannerisms.
  7. *Schedule / Timetable*: Interactive 5-day schedule grid with timetable photo upload for local MLX-VLM schedule extraction.
  8. *LoRA Fine-Tuning Studio*: Human-in-the-loop correction pairs with visual diffs and interactive local fine-tuning runner.
- **Strict Model Lifecycle**: ML models (`Silero VAD`, `MLX Whisper Large-v3-Turbo`, `PyAnnote Diarization on CPU`, `MLX-LM Qwen 2.5 7B`) execute sequentially with automatic garbage collection to stay well within 36 GB unified memory.
- **Test Suite**: 69 passing unit and integration tests (`uv run --project server pytest`).
