# 🖥️ Lecture Whisper — Local Server & Offline ML Engine

The backend core of Lecture Whisper, optimized for Apple Silicon (M4 Max with 36 GB unified memory, macOS).

---

## ⚡ Quick Start

### 1. Requirements
- macOS on Apple Silicon (M-series processor)
- Python 3.12+
- `ffmpeg` (v9.0+)
- `uv` package manager

```bash
brew install ffmpeg python@3.12
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Installation
```bash
cd server
uv tool install --force --python 3.12 --with mlx --reinstall .
```

### 3. Run System Diagnostics
```bash
lecturewhisper doctor
```

### 4. Start Server & Dashboard
```bash
lecturewhisper serve
```
Launches the FastAPI server at `http://localhost:8420`, starts Bonjour local network advertisement, generates pairing QR codes, and opens the React web dashboard in your default browser.

---

## 🏗️ Technical Architecture

### 1. Strict Memory Management
Inference on 36 GB unified memory requires strict isolation. Models are loaded sequentially and released immediately after each stage:
```
Normalize (ffmpeg) -> VAD (Silero) -> ASR (MLX Whisper) -> Diarize (PyAnnote CPU) -> Notes (MLX-LM)
```
Between each stage, `del model; gc.collect()` is executed to ensure peak RAM usage never exceeds the 36 GB limit.

### 2. PyAnnote Apple Silicon Fix
`pyannote.audio` sparse clustering ops raise `NotImplementedError` on Apple Silicon MPS backend. Diarization is explicitly forced to run on CPU (`torch.device("cpu")`), avoiding runtime crashes.

### 3. SQLite Storage with WAL Mode
All recording metadata, transcripts, notes, chapter timestamps, detected events, and human correction pairs are persisted in SQLite using Write-Ahead Logging (WAL) for high-concurrency read/write access.

### 4. Resumable Uploads (tus v1.0.0)
Endpoints in `/api/recordings/upload/` implement the complete tus v1.0.0 protocol (`POST`, `PATCH`, `HEAD`) with chunked byte offsets, SHA-256 validation, and automatic processing queue handoff.

---

## 🧪 Testing

Run the test suite across API, schemas, store, and ML pipeline mocks:
```bash
uv run --project . pytest
```
Output:
```
======================== 69 passed, 2 warnings in 1.25s ========================
```
