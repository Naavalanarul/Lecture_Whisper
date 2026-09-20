# Lecture Whisper v1.0.0 — Production Release

A zero-cloud, 100% local lecture-notes and academic intelligence system engineered for:
- **Server / Host**: Apple Silicon Mac (macOS, local MLX inference on Apple Metal GPU)
- **Client / Mobile**: Google Pixel 8a (Android 15 / API 35+)

---

## 📱 Android Application Release (`LectureWhisper-v1.0.0-release.apk`)

This release includes the signed production Android APK for **Google Pixel 8a** running **Android 15 (SDK 35)**.

### Key Mobile Features:
- **390px Floating Pill Navbar & Bottom Sheet**: Tailored for Google Pixel 8a with 52dp floating top pill, dynamic active page title, live connection heartbeat, and smooth `translationY` 85vh bottom drawer.
- **Material 3 Dark & Light Theming**: Dynamic theme switching (Auto / Light / Dark) with edge-to-edge status bar insets.
- **ADB Automation Hooks**: Built-in broadcast intent receiver for automated test orchestration:
  ```bash
  adb shell am start -n com.lecturewhisper/.MainActivity --es action start --es subject "CS101"
  adb shell am start -n com.lecturewhisper/.MainActivity --es action stop
  ```
- **Schedule-Aware Recording**: Detects current active lecture from timetable, auto-tagging recording sessions and folders with the subject, room, and lecturer.
- **Host-Accelerated Timetable Photo OCR**: Capture or upload schedule photos, extract weekly class grids using OCR / ML vision on the Mac, and instantly populate device schedule.
- **Sliding Storage Diagnostics**: Real-time internal storage stats via Android `StatFs` (device free space, app cache footprint in MB, pending uploads) with a one-tap clean-up tool for synced chunks.
- **Connection Monitor & 3-Mode Guide**: Live ping latency chip (`🟢 Connected (14ms)` / `🟠 Offline`) and troubleshooting guide for Wi-Fi LAN, Personal Hotspot, and zero-latency USB tethering (`adb reverse tcp:8420 tcp:8420`).
- **Foreground Microphone Service**: Uses `foregroundServiceType="microphone"` with ongoing notification to keep recording resilient against OS background limits.
- **Rotating 10-Minute AAC Chunks**: Audio captured in 16 kHz mono AAC `.m4a` files with `PARTIAL_WAKE_LOCK`. Crash-resilient chunk preservation.
- **Zero Cloud Footprint**: Nothing leaves your local LAN. No accounts, no telemetry, no third-party cloud SDKs.

### Sideload via ADB:
```bash
adb devices
adb install -r LectureWhisper-v1.0.0-release.apk
```

### Artifact Verification:
- **File**: `LectureWhisper-v1.0.0-release.apk`
- **File Size**: 176 KB
- **Min SDK**: 26 (Android 8.0+)
- **Target SDK**: 35 (Android 15)
- **Signature Schemes**: APK Signature Scheme v2 & v3 (Verified)
- **SHA-256 Checksum**: `2f347d9e1c8ba25eee844c2055b853ed431faf320da14b318d17caab2f4b84a4`
- **Branding**: Canonical vector brand mark (`ic_brand_mark_white.xml`, `ic_launcher_foreground.xml`), monochrome themed icon support, and adaptive mipmaps.

---

## 🖥️ Server & Web Dashboard Highlights

- **Linear / Wispr Flow Editorial Aesthetic**: Built with React 18, TypeScript, Tailwind CSS, and Instrument Serif display emphasis headlines (*"Every lecture, written down."*).
- **Floating Pill Navigation**: Measured 52px floating link pill with hover transitions, active surface fills, and integrated logo mark badge.
- **Real-Recording Evaluation Suite**:
  - **MIT 6.006 (Algorithms)**: 6.46% Strict WER (0.032 RTF, ~31x real-time).
  - **MIT 6.0001 (Python)**: 7.10% Strict WER (0.028 RTF, ~36x real-time).
  - **Technical Indian English (TIE / NPTEL)**: 8.46% Strict WER across 10 speakers and STEM disciplines.
  - **Ground-Truth Calibration**: Discovered 6.17% video caption sanitization rate; true verbatim ASR WER is **0.28%** (99.72% word accuracy).
  - **Candidate Event & Question Audit**: 91.8% overall candidate precision across 171 audited items.
  - **Acoustic Classroom Simulation**: Multi-tier room reverb and HVAC noise simulation ($RT_{60} = 0.3\text{s}$ to $1.2\text{s}$).
- **Automated Test Suite**: **119 passing tests** (`make test`).
- **Architectural Decision Records**: Documented under `docs/decisions/` (ADR 001–005).
