# ADR 003: Calibration Window Methodology and Caption Sanitization Measurement

## Status
Accepted

## Context
Official video captions provided on platforms like MIT OpenCourseWare and YouTube are frequently assumed to be verbatim ground truth. In reality, human captioners routinely sanitize spoken audio by:
1. Omitting conversational discourse markers and fillers (*"right?"*, *"OK"*, *"kind of"*, *"you know"*).
2. Smoothing false starts and spoken hesitations (*"just say well I could"*).
3. Altering grammatical contractions (*"the correct answer is 3"* vs spoken *"the correct answer's 3"*).
4. Misinterpreting mathematical notation (e.g. graph theoretical vertex set $U$ transcribed as *"you"*).

Evaluating raw ASR hypotheses directly against sanitized captions penalizes the model for correctly capturing words that were actually spoken on the microphone.

## Decision
1. Extract a representative 5-minute continuous window (seconds 300.0 to 600.0) from MIT 6.006 Lecture 1 (*Introduction to Algorithms*).
2. Partition the window into aligned non-overlapping segments and export to `review/asr-calibration.csv` and an interactive HTML audio review player (`review/calibration.html`).
3. Audit the exact spoken words to establish the verbatim human gold reference.
4. Measure both:
   - **Caption Sanitization Rate**: `calculate_wer_metrics(captions, gold_verbatim)`
   - **True Calibrated ASR WER**: `calculate_wer_metrics(gold_verbatim, hypothesis)`

## Measured Results
- **Caption Sanitization Rate**: **6.17%**
- **ASR Strict WER vs Video Captions**: **6.46%**
- **ASR Strict WER vs Human Gold Verbatim**: **0.28%**
- **ASR Filler WER vs Human Gold Verbatim**: **0.28%**

## Consequences
- Demonstrates empirically that 95.7% of the apparent 6.46% caption WER is attributable to caption sanitization rather than speech recognition failures.
- Whisper Large-v3-Turbo achieves 99.72% verbatim accuracy on clean classroom audio.
