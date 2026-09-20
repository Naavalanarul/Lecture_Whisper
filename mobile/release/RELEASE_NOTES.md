# Lecture Whisper v1.0.0 — Production Release

A zero-cloud, 100% local lecture-notes and academic intelligence system engineered for:
- **Server / Host**: Apple Silicon Mac (macOS, local MLX inference on Apple Metal GPU)
- **Client / Mobile**: Google Pixel 8a (Android 15 / API 35+)

---

## 📱 Android Application Release (`LectureWhisper-v1.0.0-release.apk`)

This release includes the signed production Android APK for **Google Pixel 8a** running **Android 15 (SDK 35)** with the Mobile v2 redesign.

### Key Mobile v2 Features:
- **Instagram-Grade 5-Tab Navigation**: Built with clean, minimalist Instagram-style bottom navigation (Today, Schedule, Record [hero raised], Library, Settings).
- **Strict 2-Hue Visual System**: Brand Indigo (`#6366F1`) and Alert Red (`#EF4444`) with obsidian/paper neutral surfaces, compliant with WCAG AA contrast standards in both light and dark modes.
- **One-Tap QR Camera Pairing & Fallback**: Point the phone camera at the Mac web dashboard or terminal QR code for instantaneous zero-config pairing, backed by 2-minute expiring cryptographic tokens, TLS fingerprint pinning, and a 6-digit numeric fallback.
- **Intelligent 5-State ConnectionManager**: Real-time state machine (`NOT_PAIRED`, `SEARCHING`, `CONNECTED`, `SYNCING`, `UNREACHABLE`) with parallel MRU candidate pings (1.5s timeout), NsdManager Bonjour / mDNS discovery (4s timeout), and automatic background reconnection when Wi-Fi state changes.
- **Native 7-Band Audio Visualizer**: Custom real-time audio amplitude monitoring directly hooked into the microphone stream during recording.
- **Dynamic Timetable Class Banner**: Automatically detects active and upcoming lectures from schedule, auto-tagging audio files with subject, room, and lecturer.
- **Host-Accelerated Timetable Photo OCR**: Capture or upload schedule photos, extract weekly class grids using OCR on the Mac, and instantly populate device schedule.
- **Sliding Storage Diagnostics & Pruning**: Real-time internal storage stats via Android `StatFs` (device free space, app cache footprint in MB, pending uploads) with a one-tap clean-up tool for synced chunks.
- **Foreground Microphone Service**: Uses `foregroundServiceType="microphone"` with ongoing notification and `PARTIAL_WAKE_LOCK` to keep recording resilient against OS background limits.
- **Rotating 10-Minute AAC Chunks**: Audio captured in 16 kHz mono AAC `.m4a` files. Crash-resilient chunk preservation.
- **Zero Cloud Footprint**: Nothing leaves your local LAN. No accounts, no telemetry, no third-party cloud SDKs.

### Sideload via ADB:
```bash
adb devices
adb install -r mobile/release/LectureWhisper-v1.0.0-release.apk
```

### Artifact Verification:
- **File**: `LectureWhisper-v1.0.0-release.apk`
- **File Size**: 197 KB
- **Min SDK**: 26 (Android 8.0+)
- **Target SDK**: 35 (Android 15)
- **Signature Schemes**: APK Signature Scheme v2 & v3 (Verified)
- **SHA-256 Checksum**: `655ebbb57ed4163f77576c0a7786eaaee8fa717bab5d8900dfeb57ff0817e6e9`
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
- **Automated Test Suite**: **125 passing tests** (`uv run --project server pytest`).
- **Architectural Decision Records**: Documented under `docs/decisions/` (ADR 001–005).
