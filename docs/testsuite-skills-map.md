# Test Suite Skills Map

This document maps each phase of the Lecture Whisper real-recording test suite task to verified skills available in the environment (`/Users/naavalanarul/antigravity-skills/skills` and `~/.agents/skills/`). No fictitious skill names are used.

---

## 1. Verified Skills Inventory

| Skill Name | Source Path | Primary Capability & Relevance |
|---|---|---|
| `writing-plans` | `/Users/naavalanarul/antigravity-skills/skills/writing-plans` | Rigorous architectural planning, phased milestones, and explicit verification criteria. |
| `planning-with-files` | `/Users/naavalanarul/antigravity-skills/skills/planning-with-files` | Coordinating multi-step state and execution tracking via persistent filesystem documents. |
| `evaluation` | `/Users/naavalanarul/antigravity-skills/skills/evaluation` | Benchmark evaluation, ground truth comparison, WER computation, and quantitative reporting. |
| `advanced-evaluation` | `/Users/naavalanarul/antigravity-skills/skills/advanced-evaluation` | Metric calibration, precision/recall scoring, hallucination detection, and error taxonomy. |
| `test-driven-development` | `/Users/naavalanarul/antigravity-skills/skills/test-driven-development` | Unit testing caption parsers (SRT, VTT, PDF, XML) using tiny synthetic committed fixtures. |
| `harness-engineering` | `/Users/naavalanarul/antigravity-skills/skills/harness-engineering` | Building robust automated CLI drivers, audio degradation pipelines, and ADB automation. |
| `systematic-debugging` | `/Users/naavalanarul/antigravity-skills/skills/systematic-debugging` | Root-cause analysis for audio normalization, timecode drift, chunk stitching, and VAD false positives. |
| `pdf` | `/Users/naavalanarul/antigravity-skills/skills/pdf` | Extracting structured text, line coordinates, and speaker headers from official OCW transcript PDFs. |
| `react-native-skills` | `/Users/naavalanarul/antigravity-skills/skills/react-native-skills` | Android system interactions, ADB activity intent dispatching, and background permission handling. |
| `verification-before-completion` | `/Users/naavalanarul/antigravity-skills/skills/verification-before-completion` | Pre-flight validation, audio hash verification, review sheet generation, and human gate verification. |
| `finishing-a-development-branch` | `/Users/naavalanarul/antigravity-skills/skills/finishing-a-development-branch` | Clean branch checkpoints, reproducible Makefile targets, and atomic git commit management. |
| `shell` | `~/.agents/skills/shell` | Robust POSIX/zsh shell scripting, process management, and audio tool execution (`ffmpeg`, `sox`). |

---

## 2. Phase-to-Skill Mapping

### Phase 0: Plan and Access Check
- **Skills Applied:** `writing-plans`, `planning-with-files`, `evaluation`
- **Focus:**
  - Inspect public open-courseware metadata (MIT OCW archive.org items `MIT6.006S20`, `MIT6.0001F16`).
  - Audit MICASE and TIE terms of use, access restrictions, and licensing.
  - Document required human actions (TalkBank credentials, phone distance placement, calibration review).
  - Pre-commit hook to prevent media and transcript leaks to the public repository.
  - Deliver `testsuite-plan.md` and Phase 0 Gate.

### Phase 1: Acquire and Normalise
- **Skills Applied:** `pdf`, `harness-engineering`, `test-driven-development`
- **Focus:**
  - Download selected public audio and official caption/transcript tracks into gitignored `data/raw/`.
  - Format conversions via `ffmpeg`: 16 kHz Mono AAC ~64 kbps `.m4a` (phone target) and 16 kHz WAV (eval target).
  - Develop unified caption parsers (`srt`, `vtt`, transcript `pdf`, `micase xml`) outputting standardized JSON segment schema.
  - Build and commit synthetic mini-fixtures in `server/tests/fixtures/` and verify unit tests.

### Phase 2: ASR Scoring Against References
- **Skills Applied:** `evaluation`, `advanced-evaluation`, `verification-before-completion`
- **Focus:**
  - Run offline neural pipeline (`mlx-whisper` Large-v3-Turbo + Silero VAD) across all test lectures.
  - Apply identical string normalizers (lowercase, strip punctuation, numerical expansion).
  - Calculate both Strict WER and Filler-Insensitive WER (suppressing *uh*, *um*, *you know*, repeated stammers).
  - Generate 5-minute random window calibration sheets (`review/asr-calibration.csv` + HTML side-by-side player) for human ground truth.
  - Benchmark Real-Time Factor (RTF) and hallucination indicators.

### Phase 3: Announcement, Event, and Question Discovery
- **Skills Applied:** `advanced-evaluation`, `harness-engineering`, `systematic-debugging`
- **Focus:**
  - Implement `lecturewhisper eval announcements <folder>` scanning unified transcripts with configurable cue lexicons and date parsers.
  - Window scoring ($\pm 20\text{s}$) ranking co-occurrences of cues and calendar dates.
  - Question detector utilizing non-lecturer dialogue markers and pedagogical flag phrases.
  - Generate `review/candidates.csv` and review web page.
  - Enforce human-only ground-truth label rule for precision/recall metrics.

### Phase 4: Far-Field and Classroom Realism
- **Skills Applied:** `harness-engineering`, `react-native-skills`, `verification-before-completion`
- **Focus:**
  - **A. Software Simulation:** Synthesize room impulse response reverb and acoustic classroom noise at 3 severities (Mild, Moderate, High) with 64 kbps AAC re-encoding.
  - **B. Real Phone Hardware Path:** Add debug ADB broadcast hook on Google Pixel 8a (`am start ... --es action start|stop`), script `scripts/farfield_run.py` to play reference audio on MacBook via `afplay` at calibrated SPL, automate ADB recording, sync chunks, and measure degradation.

### Phase 5: Synthesis and Final Reporting
- **Skills Applied:** `evaluation`, `finishing-a-development-branch`
- **Focus:**
  - Generate comprehensive report in `docs/eval/testsuite-report-<date>.md`.
  - Add reproducible `make testsuite` target.
  - Ensure zero raw media or unverified ground truth in git history.
