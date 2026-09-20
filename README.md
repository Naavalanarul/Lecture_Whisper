<p align="center">
  <a href="https://github.com/Naavalanarul/Lecture_Whisper">
    <img src="logo/logo.png" width="140" height="140" alt="Lecture Whisper Official Logo" />
  </a>
</p>

<h1 align="center">Lecture Whisper</h1>

<p align="center">
  <strong>Zero-Cloud, 100% Local Academic Intelligence &amp; Speech-to-Notes System</strong><br>
  <em>Engineered for Apple Silicon macOS (M4 Max / Unified Memory) &amp; Google Pixel 8a (Android 15 / SDK 35)</em>
</p>

<p align="center">
  <a href="server/tests"><img src="https://img.shields.io/badge/Tests-119%20Passing-10B981?style=flat-square&logo=pytest&logoColor=white" alt="Tests" /></a>
  <a href="eval"><img src="https://img.shields.io/badge/Benchmark-Real%20Lectures%20%2B%20TIE-4F46E5?style=flat-square" alt="Benchmark" /></a>
  <a href="server/pyproject.toml"><img src="https://img.shields.io/badge/Python-3.12%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" /></a>
  <a href="docs/architecture.md"><img src="https://img.shields.io/badge/Hardware-Apple%20Silicon%20M4-black?style=flat-square&logo=apple&logoColor=white" alt="Hardware" /></a>
  <a href="mobile"><img src="https://img.shields.io/badge/Android-SDK%2035%20(Android%2015)-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android" /></a>
  <a href="docs/architecture.md"><img src="https://img.shields.io/badge/Privacy-100%25%20Local%20%7C%20Zero%20Cloud-059669?style=flat-square" alt="Privacy" /></a>
  <a href="https://github.com/Naavalanarul/Lecture_Whisper/releases/latest"><img src="https://img.shields.io/badge/Release-v1.0.0--release-6366F1?style=flat-square" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-gray?style=flat-square" alt="License" /></a>
</p>

---

## 💡 Overview

**Lecture Whisper** turns raw, multi-hour university lectures into structured, faithful study decks and actionable academic intelligence—**completely offline, without a single byte leaving your personal devices**.

- 🔒 **100% Air-Gapped Privacy**: No external accounts, no cloud APIs, no telemetry. Audio, transcripts, timetable data, and generated notes remain on your local hardware.
- ⚡ **Apple Silicon Acceleration**: Harnesses Apple Metal and MLX (`mlx-whisper` Large-v3-Turbo, MLX-LM notes generation, and MLX-VLM timetable vision parsing) with sub-second responsiveness.
- 📱 **Native Android Client (Google Pixel 8a)**: Built for Android 15 (Target SDK 35) with background voice-recognition recording, timetable sync, and zero-latency USB reverse tethering.
- 🎨 **Wispr Flow & Land Onorris Design Craft**: Floating pill navigation bar (52px geometric spec), responsive 390px mobile bottom sheet drawer, light/dark modes, and keyboard shortcuts (`⌘K`, `⌘,`, `g h`, `g l`, `g d`, `g i`, `g s`).

---

## ⚡ Quick Install (macOS / MacBook Pro)

### 🚀 One-Line Installer (Terminal)

Install Lecture Whisper on your MacBook with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/Naavalanarul/Lecture_Whisper/main/install.sh | bash
```

The automated installer:
1. Verifies Apple Silicon (`arm64`) macOS environment.
2. Checks and installs audio engine dependencies (`ffmpeg` via Homebrew).
3. Installs the high-performance Python package manager (`uv`).
4. Builds and links the global `lecturewhisper` CLI and packaged production web dashboard.
5. Configures your shell environment (`~/.zshrc` / `~/.bashrc`).

---

## 🏃 Running Lecture Whisper

Start the local server and web dashboard:

```bash
lecturewhisper serve
```

- Launches the local FastAPI server at `http://127.0.0.1:8420`.
- Automatically opens the modern web application in your default browser.
- Displays a terminal QR code with SHA-256 fingerprint for pairing with your Google Pixel 8a.

### Enable Autostart on Boot (macOS LaunchAgent)

```bash
# Install system background service
lecturewhisper service install

# Check service status
lecturewhisper doctor

# Remove background service
lecturewhisper service uninstall
```

---

## 📱 Google Pixel 8a Android Application

The signed production release APK is built targeting **API 35 (Android 15)** with forward compatibility.

### 📥 Direct Download & Sideload

Download the signed APK from [Releases](https://github.com/Naavalanarul/Lecture_Whisper/releases/latest) or install directly via ADB:

```bash
# 1. Connect Google Pixel 8a via USB-C with USB Debugging enabled
adb devices

# 2. Install the signed release APK
adb install -r mobile/release/LectureWhisper-v1.0.0-release.apk

# 3. Enable Zero-Latency Isolated USB Reverse Tethering (:8420)
bash mobile/connect_device.sh
```

**APK Integrity**:
- SHA-256: `eb4224c7f41182bf69a67d22656f1c160d9bb6a82155bfec3ff4c0a72e934497`
- Signatures: Verified with Android APK Signature Schemes v2 &amp; v3.

### Mobile Features:
- **390px Floating Pill Top Bar**: Compact 52dp pill with brand mark badge, active page title, real-time connection status chip, and drawer trigger.
- **Native Bottom Sheet Drawer**: 85vh swipeable sheet with grab handle, full navigation links, theme toggling, cache pruning, and battery optimization shortcuts.
- **Hardware-Tuned Audio**: 16 kHz Mono AAC `@ 64 kbps` using `VOICE_RECOGNITION` audio source for crystal clear speech in noisy lecture halls.
- **Exact Timetable Alarms**: Fires exact background notifications 5 minutes before scheduled classes.
- **Offline Cache & Storage Pruning**: Retains recordings locally until safely synchronized, with one-tap chunk cleanup.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Mobile ["Google Pixel 8a (Android 15 / Target SDK 35)"]
        A[Exact Alarm &amp; Timetable] --> B[RecorderService Foreground]
        B -->|VOICE_RECOGNITION Audio| C[10-min Rotating AAC Chunks]
        C --> D[Resumable tus v1.0.0 Sync Queue]
    end

    D -->|USB Reverse Tethering or Local Wi-Fi :8420| E[FastAPI Local Server :8420]

    subgraph Host ["Apple Silicon MacBook Pro (M4 Max / Unified Memory)"]
        E --> F[SQLite Database WAL Mode]
        E --> G[Single-Worker Sequential JobQueue]
        G --> H[Offline Neural Pipeline Runner]

        subgraph Pipeline ["Sequential Execution (del model; gc.collect())"]
            H --> P0[Server-Side Chunk Stitching]
            P0 --> P1[ffmpeg 16kHz Mono WAV Normalization]
            P1 --> P2[Silero VAD Speech Detection]
            P2 --> P3[MLX Whisper Large-v3-Turbo ASR]
            P3 --> P4[PyAnnote Diarization CPU Enforced]
            P4 --> P5[MLX-LM Notes Map-Reduce &amp; Event Extractor]
        end

        P5 --> I[Transcripts, Notes, Deadlines &amp; Audio Player]
        I --> J[Modern React 18 / Vite Web Dashboard]
    end
```

---

## 📊 Evaluation & Benchmark Suite

## 📊 Real-Recording Test Suite & Benchmark Evaluation

Lecture Whisper includes a comprehensive evaluation suite tested against real university lectures (MIT OpenCourseWare, Technical Indian English / NPTEL, and simulated acoustic classroom degradation). Full report: [`docs/eval/testsuite-report-2026-09-20.md`](docs/eval/testsuite-report-2026-09-20.md).

### 🎯 Measured Performance Matrix

| Benchmark Profile | Corpus & Instructor | Real-Time Factor (RTF) | Strict WER | Filler-Insensitive WER | Validation Status |
|---|---|---|---|---|---|
| **Clean Lecture Hall** | MIT 6.006 (Jason Ku) | **0.032x** ($31\times$ real-time) | **6.46%** | **5.93%** | ✅ Passed |
| **Interactive Discussion**| MIT 6.0001 (Dr. Ana Bell) | **0.028x** ($36\times$ real-time) | **7.10%** | **6.54%** | ✅ Passed |
| **Accented Technical English** | TIE / NPTEL (10 Speakers) | **0.045x** ($22\times$ real-time) | **8.46%** | **8.30%** | ✅ Passed |
| **Acoustic Classroom Simulation (Mild)** | RIR $RT_{60}=0.3$s, SNR 25 dB | **0.066x** ($15\times$ real-time) | **11.86%** | **10.98%** | ✅ Passed |
| **Acoustic Classroom Simulation (Moderate)** | RIR $RT_{60}=0.7$s, SNR 18 dB | **0.032x** ($31\times$ real-time) | **15.25%** | **15.03%** | ✅ Passed |
| **Acoustic Classroom Simulation (High)** | RIR $RT_{60}=1.2$s, SNR 10 dB | **0.032x** ($31\times$ real-time) | **16.95%** | **16.18%** | ✅ Passed |

### 🛠️ Evaluation Commands & Makefile Targets

```bash
# Run end-to-end evaluation suite (ASR scoring + discovery scanner)
make testsuite

# Run classroom acoustic degradation simulation (Mild, Moderate, High)
make farfield-sim

# Scan transcripts for announcements, deadlines, and questions
lecturewhisper eval announcements data/transcripts --output review

# Audit candidate precision and score verified ground truth
lecturewhisper eval score-candidates review/candidates.csv

# Score true calibrated WER against human-verified gold transcripts
lecturewhisper eval score-calibration review/asr-calibration.csv

# Run all 119 unit and integration tests
make test
```

---

## 🛠️ CLI Reference

| Command | Description |
|---|---|
| `lecturewhisper doctor` | Hardware, software, and local neural model diagnostics |
| `lecturewhisper serve [--port 8420]` | Start FastAPI server, advertise mDNS, and launch web dashboard |
| `lecturewhisper pair` | Print terminal ASCII QR code and one-time pairing token |
| `lecturewhisper process <audio>` | Execute offline neural pipeline directly on an audio file |
| `lecturewhisper bench <audio>` | Benchmark individual pipeline stages and compute Real-Time Factor (RTF) |
| `lecturewhisper eval` | Run legacy evaluation harness across golden fixture suite |
| `lecturewhisper eval announcements <folder>` | Scan transcripts for candidate announcements, events, and questions |
| `lecturewhisper eval score-candidates [csv]` | Score precision on human-audited candidate announcements |
| `lecturewhisper eval score-calibration [csv]` | Score true calibrated WER against human-verified gold transcripts |
| `lecturewhisper train` | Run LoRA fine-tuning on human correction pairs with promotion gating |
| `lecturewhisper backup` | Create compressed `.tar.gz` archive of database, config, and notes |
| `lecturewhisper service install` | Configure macOS `launchd` LaunchAgent to start automatically on login |
| `lecturewhisper service uninstall`| Remove macOS `launchd` LaunchAgent service |

---

## 🔬 Key Engineering Decisions

### 1. CPU-Pinned PyAnnote Speaker Diarization
On Apple Silicon, running PyTorch Metal Performance Shaders (`torch.device("mps")`) with PyAnnote's agglomerative clustering and sparse tensors triggers intermittent kernel panics and memory leaks. Diarization is pinned to the high-performance CPU cores, running at ~6–8x real-time speed with 100% crash-free stability.

### 2. Lossless Server-Side Audio Stitching
Mobile 10-minute slices risk truncating words at boundary points. The server indexes chunks sequentially and performs lossless audio stitching prior to Silero VAD and Whisper transcription, ensuring seamless word-level timestamps and zero lost syllables.

### 3. MLX-VLM Timetable Extraction with Offline Fallback
University timetables feature multi-column grids, staggered slots, and color-coded rooms. Lecture Whisper uses **MLX-VLM (`Qwen2.5-VL` / `Qwen2-VL`)** as the primary vision model to extract structured schedules, with Tesseract OCR retained as a fallback. All extracted slots require one-click confirmation in the UI before saving.

### 4. LoRA Fine-Tuning Promotion Gate
The continuous learning engine (`lecturewhisper train`) enforces a strict promotion gate: fine-tuned adapters are scored against the zero-shot prompted baseline on a held-out test split. An adapter is **only promoted** if its composite score (JSON validity, precision, recall, low hallucination rate) strictly beats the baseline.

---

## 💻 Manual Developer Installation (from Source)

### 1. System Requirements
- macOS 14+ on Apple Silicon (M1/M2/M3/M4, 16 GB+ unified memory recommended)
- Python 3.12+
- Homebrew &amp; Node.js 18+

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/Naavalanarul/Lecture_Whisper.git
cd Lecture_Whisper

# Install system dependencies
brew install ffmpeg python@3.12
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install server package with all ML dependencies
cd server
uv tool install --force --python 3.12 --reinstall "./[all]"

# Build web frontend
cd ../ui
npm install
npm run build
```

### 3. Test Suites
```bash
# Run backend pytest suite (73 passing tests)
uv run --project server pytest

# Run multi-lecture benchmark evaluation
python3 eval/run_eval.py

# Recompile Android Release APK
bash mobile/build_release_apk.sh
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
