# Safety Rules — Lecture Whisper

## Privacy (non-negotiable)
- Audio, transcripts, and notes NEVER leave the LAN
- No telemetry, no analytics, no cloud API calls at runtime
- No external network requests during pipeline processing
- HF model downloads happen at setup time only, not during recording processing

## Secrets
- HF token: read from `HF_TOKEN` env var or macOS keychain only
- Never hardcode tokens, passwords, or API keys
- Never commit `.env`, `.token`, or any secret file
- Never log secrets — redact in all log output

## Audio files
- Never commit audio files to git (any format)
- `samples/` directory: only committed files are synthetic test fixtures (<1 MB)
- User recordings live in `~/.lecturewhisper/storage/` only

## Network
- Server binds to LAN only (0.0.0.0 with no port forwarding)
- Pairing requires physical QR scan (one-time token)
- All API endpoints require device token after pairing
- No HTTPS required (LAN-only; no sensitive data in transit beyond local network)

## Teacher model (Phase 8 only)
- Local teacher model is the default
- Cloud teacher is OPT-IN and requires explicit user confirmation
- If cloud teacher is selected, warn that transcripts will leave the device
