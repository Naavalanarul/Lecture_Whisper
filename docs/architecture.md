# Architecture — Lecture Whisper

## System Overview

```
┌─────────────────────┐         LAN (Wi-Fi / Hotspot)        ┌──────────────────────┐
│    Pixel 8a          │ ──── tus resumable upload ────────▶ │   M4 Max MacBook     │
│    (Android 17)      │ ◀─── SSE job status ─────────────── │   (macOS)            │
│                      │                                      │                      │
│  React Native UI     │                                      │  FastAPI server      │
│  Kotlin recorder     │                                      │  SQLite store        │
│  Local chunk queue   │                                      │  ML pipeline         │
│  Timetable capture   │                                      │  React dashboard     │
└─────────────────────┘                                      └──────────────────────┘
```

## Server Pipeline (sequential, memory-managed)

```
Audio file (any format)
  │
  ▼
ffmpeg → 16 kHz mono WAV
  │
  ▼
Silero VAD → speech segments          (CPU, ~1.5 MB model, unload after)
  │
  ▼
MLX Whisper → transcript + words      (Metal GPU, ~3 GB, unload after)
  │
  ▼
pyannote → speaker diarization        (CPU only, ~1 GB, unload after)
  │
  ▼
Speaker detection → main speaker      (CPU, embeddings, unload after)
  │
  ▼
Chaptering → topic segments           (CPU, sentence-transformers, unload after)
  │
  ▼
MLX-LM (Qwen 2.5 7B 4-bit)          (Metal GPU, ~4.5 GB, unload after)
  ├─ Notes (map-reduce per chapter)
  ├─ Events (hybrid: regex+LLM)
  ├─ Questions
  └─ Phrases (n-gram + clustering)
  │
  ▼
SQLite + JSON files
  │
  ▼
Dashboard (React, served by FastAPI)
```

## Key Design Decisions

1. **Sequential model execution**: Models are loaded one at a time and explicitly
   unloaded (`del model; gc.collect()`) to stay within 36 GB unified memory.

2. **CPU for pyannote**: MPS backend fails with sparse tensor operations on Apple
   Silicon. CPU diarization is faster-than-realtime on M4 Max.

3. **Outlines for structured output**: `outlines[mlxlm]` constrains LLM token
   generation to produce valid JSON matching Pydantic schemas. Post-hoc validation
   is kept as a safety net.

4. **Hybrid event extraction**: Regex/lexicon pre-filtering generates candidates,
   LLM verifies and structures them. This reduces LLM calls and improves precision.

5. **tus protocol**: Standard resumable upload protocol. Handles interrupted
   transfers (mobile → laptop over flaky Wi-Fi) without custom logic.

6. **SQLite**: Single user, single device. WAL mode for concurrent reads during
   pipeline writes. No deployment complexity.

7. **Bare React Native**: Expo's managed workflow cannot support custom Kotlin
   foreground services, alarm scheduling, or VoiceInteractionService.

## Data Storage

```
~/.lecturewhisper/
  config.toml           # User configuration
  storage/
    recordings/         # Uploaded audio files (by recording ID)
    transcripts/        # JSON transcript outputs
    notes/              # JSON notes outputs
  models/               # Cached ML models (symlinks to HF cache)
  adapters/             # LoRA adapter versions
  logs/                 # Application logs (rotated)
  lecturewhisper.db     # SQLite database
```

## Network Security

- All communication is LAN-only (no internet required at runtime)
- Pairing via physical QR code scan (one-time token → device token)
- All API endpoints require device token after initial pairing
- No TLS (LAN-only; adding mTLS is a Phase 9 option if needed)
