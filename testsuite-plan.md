# Lecture Whisper Real-Recording Test Suite Plan

## 1. Overview & Objectives

The goal of this test suite is to evaluate the Lecture Whisper offline neural speech-and-intelligence pipeline against real, multi-hour university lectures spanning diverse acoustic conditions, teaching styles, and accents:
1. **Clean Acoustic Studio/Classroom Lectures** (MIT OpenCourseWare, 2 distinct instructors: male & female).
2. **Interactive Classroom Dialogue** (MICASE: lecturer exposition, student questions, hall reverberation).
3. **Accented Technical Lectures** (TIE / NPTEL: Technical Indian English, non-native phonetic variants, chalkboard acoustics).
4. **Far-Field Acoustic Degradation** (Algorithmic simulation across 3 severities + real Google Pixel 8a recording at 5–8 meters).

All data and evaluation media remain strictly confined to `data/` (gitignored). No media or raw transcripts are committed to Git.

---

## 2. Selected Recordings & Dataset Inventory

| ID | Corpus / Course | Speaker & Topic | Delivery Style & Acoustics | Reference Ground Truth | Raw Download | Normalized Phone Audio (AAC 64k) | Normalized Eval Audio (16k WAV) |
|---|---|---|---|---|---|---|---|
| `mit_6006_lec1` | MIT 6.006 (Spring 2020) | Prof. Erik Demaine (Male)<br>Intro to Algorithms | Chalkboard, dynamic pacing, high energy, technical algorithmic jargon | Official `.srt` caption file (Internet Archive `MIT6.006S20`) | ~107 MB (MP4) | ~22 MB (`.m4a`) | ~88 MB (`.wav`) |
| `mit_60001_lec1` | MIT 6.0001 (Fall 2016) | Dr. Ana Bell (Female)<br>Python & Computation | Slide presentation, steady pedagogical pace, clear microphone | Official `.srt` caption file (Internet Archive `MIT6.0001F16`) | ~101 MB (MP4) | ~24 MB (`.m4a`) | ~96 MB (`.wav`) |
| `micase_bio_lec` | MICASE (`LES155SU099` or `LEL115SU074`) | University of Michigan Faculty & Students<br>Intro Biology / Physics | Multi-speaker, live lecture hall, Q&A interruptions, distant student voices | Official SGML/XML timecoded transcript with speaker tags (`<U WHO="PRF">`, `<U WHO="S1">`) | ~30 MB (MP3 / user) | ~25 MB (`.m4a`) | ~95 MB (`.wav`) |
| `nptel_dc_lec1` | NPTEL / TIE | Prof. Bikash Kumar Dey (IIT Bombay)<br>Digital Communication | Technical Indian English accent, blackboard writing, room ambiance | Official manual transcription (TIE corpus / NPTEL transcript) | ~280 MB (MP4) | ~26 MB (`.m4a`) | ~105 MB (`.wav`) |
| `farfield_sim` | Simulated Far-Field | Derived from `mit_6006_lec1` | 3 Severities: Mild ($RT_{60}=0.4$s), Moderate ($RT_{60}=0.8$s), High ($RT_{60}=1.4$s) | Aligned gold reference | Synthesized locally | ~66 MB (`.m4a` x 3) | ~264 MB (`.wav` x 3) |
| `farfield_pixel` | Hardware Far-Field (Pixel 8a) | Re-recorded `mit_6006_lec1` via Mac `afplay` at 5–8m distance | Real Google Pixel 8a beamforming microphone at 5–8m in residential/classroom room | Aligned gold reference | Captured via ADB | ~22 MB (`.m4a`) | ~88 MB (`.wav`) |

---

## 3. Storage & Disk Footprint Estimation

| Category | Description | Estimated Disk Space |
|---|---|---|
| **Raw Media (`data/raw/`)** | Original MP4 video/audio streams and raw caption/XML files | ~520 MB |
| **Normalized Phone Audio (`data/normalized/m4a/`)** | 16 kHz Mono AAC @ 64 kbps (exact format delivered by Pixel 8a) | ~185 MB |
| **Normalized Eval Audio (`data/normalized/wav/`)** | 16 kHz 16-bit Mono uncompressed WAV for VAD and reference tools | ~740 MB |
| **Unified Transcripts (`data/transcripts/`)** | Standardized JSON segment schema across all sources | ~2 MB |
| **Simulated Degraded Audio (`data/simulated/`)** | Reverb & noise degraded audio at 3 severities | ~330 MB |
| **Review Sheets & Evaluation Logs (`review/`)** | CSV calibration sheets, HTML review pages, and JSON metric dumps | ~5 MB |
| **Total Estimated Disk Usage** | | **~1.78 GB** |

*Note: All data is stored in the project's root `data/` directory, which is excluded by `.gitignore` and enforced by `.git/hooks/pre-commit`.*

---

## 4. Exactly What Requires Manual Human Action

To maintain 100% academic compliance, zero credential leakage, and authentic ground-truth integrity, the agent will automate every computational step and hand off only the following manual items:

### 1. MICASE Audio File Access (Account Required)
- **Why**: University of Michigan hosts MICASE transcripts publicly, but audio files are hosted under **TalkBank** (`https://talkbank.org/access/MICASE/`), which requires user authentication and agreement to research terms.
- **Human Action**:
  1. Log into your free account at TalkBank (`https://talkbank.org/`).
  2. Download the audio file for session `LES155SU099` (or `LEL115SU074`).
  3. Place the audio file in `data/raw/micase/`.
- *(Fallback if audio unavailable)*: If you do not wish to request TalkBank audio access, the test suite will evaluate the unified XML parser and run multi-speaker question extraction on the transcript text, while audio tests proceed on the MIT, NPTEL, and far-field recordings.

### 2. Physical Placement for Far-Field Test (Google Pixel 8a)
- **Why**: An authentic far-field acoustic test requires realistic physical distance ($5\text{m} \le d \le 8\text{m}$) and ambient room boundaries that cannot be fully captured by software simulation alone.
- **Human Action**:
  1. Connect your Google Pixel 8a via USB or Wireless ADB (`adb devices`).
  2. Place the phone 5 to 8 meters away from your MacBook Pro speakers.
  3. Run `python3 scripts/farfield_run.py`, which will print an interactive checklist.
  4. Confirm that room noise is normal and press Enter to initiate playback and recording.

### 3. Human Ground-Truth Calibration (ASR WER)
- **Why**: Official video captions on YouTube and OpenCourseWare are frequently sanitized (fillers removed, stammering smoothed, phrases reordered). Evaluating raw ASR against sanitized captions miscalculates the true WER.
- **Human Action**:
  1. For each lecture, the suite extracts a random 5-minute window and prepares `review/asr-calibration.csv` along with a local HTML player (`review/calibration.html`).
  2. Listen to the 5-minute audio slice and type the exact verbatim words into the gold reference column.
  3. Save the file. The evaluation script will then compute true calibrated WER vs. sanitized caption WER.

### 4. Human Verification of Announcements, Events, and Questions
- **Why**: Model-proposed deadlines or exam events must never be counted as ground-truth facts without human confirmation.
- **Human Action**:
  1. Inspect `review/candidates.csv` (or the interactive review webpage generated in `review/candidates.html`).
  2. Mark each candidate row as `VERIFIED_TRUE` or `FALSE_POSITIVE`, and verify the resolved calendar date.
  3. Only human-verified rows will be scored in precision/recall benchmarks.

---

## 5. Execution Phases Overview

```
Phase 0: Plan and Access Check (Current Phase — Commit & Stop for Approval)
    │
    ▼
Phase 1: Acquire and Normalise
    ├── Download archive.org MIT lectures & captions into data/raw/
    ├── Convert to 16 kHz Mono AAC 64k & 16 kHz WAV
    ├── Build unified parser for SRT, VTT, PDF, MICASE XML
    └── Test parsers with synthetic test fixtures committed in server/tests/fixtures/
    │
    ▼
Phase 2: ASR Scoring Against References
    ├── Run MLX Whisper Large-v3-Turbo + Silero VAD on test set
    ├── Compute Strict WER and Filler-Insensitive WER
    ├── Generate review/asr-calibration.csv (5-min window)
    └── Human calibration review
    │
    ▼
Phase 3: Announcement, Event & Question Discovery
    ├── Implement 'lecturewhisper eval announcements'
    ├── Cue lexicon scoring + date parser
    ├── Generate review/candidates.csv & HTML review tool
    └── Human candidate review
    │
    ▼
Phase 4: Far-Field and Classroom Realism
    ├── A. Software simulation (reverb + noise at 3 severities)
    └── B. Real hardware path via Pixel 8a + ADB hook + afplay automation
    │
    ▼
Phase 5: Report & Verification
    ├── Generate docs/eval/testsuite-report-<date>.md
    └── Wire reproducible 'make testsuite' command
```
