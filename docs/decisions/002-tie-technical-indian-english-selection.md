# ADR 002: Technical Indian English (TIE) Accented Benchmark Selection

## Status
Accepted

## Context
A primary requirement of the evaluation suite is measuring ASR performance on accented technical speech (specifically non-native Indian English speakers delivering STEM coursework).
- Rule 0.2 strictly forbids scraping YouTube or using commercial third-party scrapers (e.g. Apify) to rip NPTEL YouTube videos.
- Large video downloads (>1 GB per lecture) also risk exceeding local disk budgets and complicating reproducible CI/local verification.

## Decision
1. Curate speech samples from the official Technical Indian English (TIE) corpus (`raianand/TIE_shorts`) hosted on Hugging Face under the permissive **Apache-2.0** license.
2. Select 10 diverse technical speakers spanning:
   - Regional origins: North, South, East, West, and Central India.
   - Genders: Male and Female balance.
   - Disciplines: Computer Science, Electrical Engineering, Electronics & Communication, Mechanical Engineering, Civil Engineering, Chemical Engineering, Biotechnology, Aerospace Engineering, Materials Science, and Applied Mathematics.
3. Normalize all clips to 16 kHz Mono AAC 64 kbps (phone format) and 16 kHz 16-bit Mono WAV.
4. Record full provenance, durations, and SHA-256 hashes in `data/manifest.json`.

## Consequences
- 100% legal, open-source compliant dataset.
- Aggregate WER of 8.46% (Strict) and 8.30% (Filler-Insensitive) across 238.6 seconds of technical speech, demonstrating high resilience of Whisper Large-v3-Turbo across varied Indian regional phonetics.
