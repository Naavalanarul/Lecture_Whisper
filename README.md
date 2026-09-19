# 🎙️ Lecture Whisper

A personal, fully local lecture-notes system engineered for an **Apple Silicon Mac (M4 Max)** and a **Google Pixel 8a (Android 17)**. 

Privacy-first: **nothing leaves the local area network**. No accounts, no cloud dependencies, no Play Store, no telemetry.

---

## 🏗️ System Architecture

```
┌──────────────────────────┐         Local Wi-Fi / Hotspot        ┌────────────────────────────────┐
│   Google Pixel 8a        │ ──── TUS resumable upload ─────────▶ │   MacBook Pro (M4 Max)         │
│   (Android 17)           │ ◀─── SSE real-time job status ────── │   (macOS Sequoia)              │
│                          │                                      │                                │
│  • React Native UI       │                                      │  • FastAPI local server (:8420)│
│  • Native Kotlin recorder│                                      │  • SQLite WAL database         │
│  • Rotating 10-min chunks│                                      │  • MLX Whisper (Metal GPU)     │
│  • Exact alarm scheduler │                                      │  • PyAnnote Diarization (CPU)  │
│  • Timetable sync        │                                      │  • Qwen 2.5 7B Notes (MLX-LM)  │
│  • mDNS / QR pairing     │                                      │  • Bundled React Web Dashboard │
└──────────────────────────┘                                      └────────────────────────────────┘
```

---

## ⚡ Quick Start (MacBook M4 Max)

### 1. Prerequisites
Ensure Homebrew, Python 3.12, and `uv` are installed:
```bash
brew install ffmpeg python@3.12
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Clone and Setup
```bash
git clone https://github.com/Naavalanarul/Lecture_Whisper.git
cd Lecture_Whisper/server

# Install local package and tool CLI
uv tool install --force .
```

### 3. Run System Diagnostics
```bash
lecturewhisper doctor
```
Verifies Apple Silicon arm64, macOS version, Python 3.12, ffmpeg, RAM, and storage directories.

### 4. Start Server and Web Dashboard
```bash
lecturewhisper serve
```
- Launches the local FastAPI server at `http://localhost:8420`.
- Automatically serves the bundled React + Vite + Tailwind dashboard.
- Advertises Bonjour service `_lecturewhisper._tcp` on the local network.
- Displays the terminal QR code for one-time mobile app pairing.
- Opens your default web browser to the dashboard.

---

## 📱 Mobile App (Google Pixel 8a, Android 17)

### Native Features
- **Microphone Foreground Service**: Enforces `foregroundServiceType="microphone"` using hardware beamforming `VOICE_RECOGNITION`.
- **Rotating Chunks**: Audio is written in 10-minute AAC `.m4a` chunks. A battery crash or reboot loses at most <10 minutes of audio.
- **Scheduling Modes**:
  1. *Alarm Tap (Default)*: Exact alarm triggers high-priority notification with tap-to-record action.
  2. *Class Day*: Pre-warms the service in morning mode and begins recording when class starts.
  3. *Assistant Role*: Integrates via `VoiceInteractionService`.

### Pairing Phone with Laptop
1. Open the app on your Pixel 8a.
2. Tap **Pair Device**.
3. Scan the QR code shown in `lecturewhisper serve` (or `lecturewhisper pair`).
4. The phone receives a secure long-lived device token (`lw_tok_...`) and automatically syncs recordings whenever connected to the same Wi-Fi or phone hotspot.

---

## 🛠️ CLI Reference

| Command | Description |
|---|---|
| `lecturewhisper serve` | Start API server, Bonjour mDNS, and launch web dashboard |
| `lecturewhisper doctor` | Run full hardware, software, and model diagnostic checks |
| `lecturewhisper pair` | Print terminal QR code and one-time pairing token |
| `lecturewhisper process <audio>` | Run offline audio pipeline on an audio file |
| `lecturewhisper bench <audio>` | Benchmark stages (VAD, ASR, Diarization) and save report to `docs/bench-<date>.md` |
| `lecturewhisper eval` | Run evaluation harness on golden fixtures and output precision/recall |
| `lecturewhisper train` | Run LoRA fine-tuning and compare adapter vs baseline |
| `lecturewhisper backup` | Create a compressed `.tar.gz` archive of database, config, and notes |
| `lecturewhisper service install` | Configure macOS `launchd` to automatically run server at login |
| `lecturewhisper service uninstall`| Remove macOS `launchd` login service |

---

## 📊 Pipeline Benchmark & Quality Metrics

To benchmark pipeline execution and memory usage:
```bash
lecturewhisper bench samples/synthetic_sample.wav
```

### Word Error Rate (WER) Script
To calculate Word Error Rate against a reference text:
```bash
python3 eval/wer.py --hyp transcript.json --ref ground_truth.txt
```

### Event & Question Extraction Baseline
```bash
lecturewhisper eval
```
```
==========================================
      LECTURE WHISPER EVALUATION REPORT   
==========================================
Events Extracted:          4 (GT: 3)
Event Precision:           75.0%
Event Recall:              100.0%
Event F1 Score:            85.7%
------------------------------------------
Questions Extracted:       3 (GT: 3)
Question Precision:        100.0%
Question Recall:           100.0%
==========================================
```

---

## 🔒 Security & Privacy Guarantees
- **Zero Cloud Leakage**: All inference runs locally via Apple Silicon Metal GPU (`mlx-whisper`, `mlx-lm`, `mlx-vlm`) and CPU (`pyannote`, `silero-vad`).
- **Device Authentication**: TUS upload and API routes require bearer authentication matching `paireddevicerow` in SQLite.
- **Opt-In Teacher Models**: LoRA teacher generation defaults to local models (`Qwen2.5-14B`). Cloud models trigger explicit user consent prompts.
