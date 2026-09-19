# Lecture Whisper — Open Questions

Track items that need verification or user input.

## Library Versions (VERIFIED)

| Library | Version | Status | Notes |
|---|---|---|---|
| `mlx-whisper` | `0.4.3` | ✅ Verified | Word-level timestamps supported, large-v3-turbo supported |
| `pyannote.audio` | `4.0.7` | ✅ Verified | **CPU only** (MPS fails), community model gated on HF |
| `mlx-lm` | `0.31.3` | ✅ Verified | JSON output via `outlines[mlxlm]`, Qwen2.5-7B-Instruct-4bit recommended |
| `mlx-vlm` | `0.7.1` | ✅ Verified | Qwen2.5-VL-7B-Instruct-4bit for timetable parsing |
| `silero-vad` | `6.2.1` | ✅ Verified | CPU only, strict 512-sample chunks at 16kHz |
| `tuspyserver` | `4.2.10` | ✅ Verified | FastAPI tus router for resumable uploads |

## User Questions (awaiting answers)

- [ ] Primary lecture language(s)? (affects ASR model and `asr.language` default)
- [ ] Android version on Pixel 8a? (no device connected via adb to check)
- [ ] HF account with access to pyannote gated models?

## Key Technical Findings

1. **pyannote.audio on MPS**: Does NOT work. Fails with `NotImplementedError` on sparse tensor ops. Must use `torch.device("cpu")`. M4 Max CPU is faster-than-realtime anyway.
2. **Structured LLM output**: `mlx-lm` + `outlines[mlxlm]` provides guaranteed schema-conforming JSON by constraining token logits. We still validate as a safety net.
3. **Silero VAD strict chunks**: Must feed exactly 512 samples (31.25ms) at 16kHz. No other chunk sizes work.
4. **pyannote 4.x**: Introduced `torchcodec` for audio decoding, requires compatible FFmpeg shared libraries.

## Resolved Design Decisions

- [x] ~~Silero VAD PyTorch dependency~~ → Acceptable; PyTorch needed anyway for pyannote
- [x] ~~pyannote on MPS~~ → CPU only; faster than realtime on M4 Max
- [x] ~~Tus server library~~ → `tuspyserver` 4.2.10 (FastAPI router, pure Python)
- [x] ~~LLM structured output~~ → `outlines[mlxlm]` for schema-constrained generation

## Still Open

- [ ] React Native vs Expo → Leaning bare RN (need native Kotlin modules)
- [ ] pyannote model choice: `speaker-diarization-community-1` (CC-BY-4.0) vs `speaker-diarization-3.1` (gated, different license)
