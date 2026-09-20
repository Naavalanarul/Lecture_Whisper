# 🖥️ Lecture Whisper — Local Server & Offline ML Engine

The backend engine of Lecture Whisper, optimized for Apple Silicon macOS (M-Series processors with unified memory) to execute state-of-the-art speech-to-text, speaker diarization, notes summarization, and academic event extraction 100% locally.

---

## ⚡ Quick Start

### 1. Requirements
- macOS 14+ on Apple Silicon (M1/M2/M3/M4, 16 GB+ unified memory recommended)
- Python 3.12+
- `ffmpeg` (v9.0+)
- `uv` package manager

```bash
brew install ffmpeg python@3.12
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Global Installation
```bash
cd server
uv tool install --force --python 3.12 --reinstall .
```

### 3. Diagnostics
```bash
lecturewhisper doctor
```
Verifies macOS environment, Apple Silicon architecture, Python version, uv, ffmpeg, RAM, MLX Metal imports, and connected adb devices.

### 4. Run Server
```bash
lecturewhisper serve
```
Launches the FastAPI server at `http://localhost:8420`, advertises Bonjour local network service (`_lecturewhisper._tcp`), generates pairing QR codes, and opens the React web dashboard in your default browser.

---

## 🏗️ Technical Architecture & Pipeline

### 1. Strict Sequential Memory Management
Inference on unified memory requires strict isolation to prevent out-of-memory errors:
```
Lossless Stitch -> Normalize (ffmpeg) -> VAD (Silero) -> ASR (MLX Whisper Large-v3-Turbo) -> Diarize (PyAnnote CPU) -> Notes (MLX-LM)
```
Between each stage, `del model; gc.collect()` is executed to ensure peak RAM usage stays bounded and predictable.

### 2. PyAnnote Apple Silicon Fix
`pyannote.audio` sparse clustering ops raise `NotImplementedError` on Apple Silicon MPS backend. Diarization is explicitly forced to run on CPU (`torch.device("cpu")`), avoiding runtime crashes while achieving 6–8x real-time speed.

### 3. SQLite Storage with WAL Mode
All recording metadata, transcripts, notes, chapter timestamps, detected events, and human correction pairs are persisted in SQLite using Write-Ahead Logging (WAL) for high-concurrency read/write access.

### 4. Cryptographic Pairing & Security
- Ephemeral pairing tokens expire in 2 minutes.
- Rate-limited to max 10 requests per minute on `/api/v1/pair/complete`.
- Device tokens (`lw_tok_...`) are stored as SHA-256 hashes in SQLite.
- Self-signed TLS certificates generated at `~/.lecturewhisper/tls/` with SHA-256 fingerprint pinning.

### 5. Resumable Uploads & Auto-Sync
- Endpoints in `/api/recordings/upload` and `/api/files/` support resumable multi-part audio chunk uploads with SHA-256 validation.
- Timetable two-way sync via `/api/timetable/sync`.
- Timetable photo extraction via `/api/timetable/extract`.

---

## 🧪 Testing

Run the full pytest suite (125 tests across API, schemas, stores, pairing, and ML pipelines):

```bash
uv run --project server pytest
```

Output:
```
======================= 125 passed, 2 warnings in 4.17s =======================
```
