# Data Licences and Usage Restrictions

This document establishes the licensing terms, academic compliance, and data governance policies for audio recordings and reference transcripts utilized in the Lecture Whisper evaluation test suite.

---

## ⚠️ Strict Public Repository Policy

Lecture Whisper is a **PUBLIC repository**. Under no circumstances should real university lecture audio, video, raw transcripts, or student voice recordings be committed to Git.
- All evaluation media, raw downloads, cached WAV files, and candidate sheets reside **strictly under `data/` and `review/`**, which are gitignored.
- Enforced automatically via `.git/hooks/pre-commit` ([`scripts/pre-commit-check.sh`](file:///Users/naavalanarul/Documents/Projects/Lecture_Whisper/scripts/pre-commit-check.sh)).
- Only tiny, mock synthetic audio files (`synthetic_*.wav`, duration < 2.0s) generated purely for parser unit testing may be committed to `server/tests/fixtures/`.

---

## 1. MIT OpenCourseWare (MIT OCW)

- **Source**: MIT OpenCourseWare via Internet Archive and `ocw.mit.edu`.
- **Licence**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International ([CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)).
- **Permitted Uses**:
  - Educational, personal evaluation, non-commercial benchmarking and research.
  - Transformation into normalized audio formats (16 kHz mono) for local pipeline benchmarking.
- **Restrictions**:
  - **No Commercial Exploitation**: Audio and transcripts cannot be sold or incorporated into commercial cloud services.
  - **Attribution Required**: All benchmarks derived from MIT OCW materials must attribute the course name, instructors, and MIT OpenCourseWare.
  - **No Redistribution**: Do not rehost or redistribute raw media files in the public repository.
- **Citation**:
  - MIT 6.006 (Introduction to Algorithms, Spring 2020), Instructors: Erik Demaine, Jason Ku, Justin Solomon. MIT OpenCourseWare.
  - MIT 6.0001 (Introduction to Computer Science and Programming in Python, Fall 2016), Instructor: Dr. Ana Bell. MIT OpenCourseWare.

---

## 2. Michigan Corpus of Academic Spoken English (MICASE)

- **Source**: English Language Institute (ELI), University of Michigan (`quod.lib.umich.edu/m/micase/`).
- **Licence / Terms of Use**:
  - Available free of charge for non-commercial study, academic research, and teaching.
  - Commercial use (inclusion in commercial training or commercial tools) strictly prohibited without explicit advance permission and licensing from the Regents of the University of Michigan.
- **Access Protocol**:
  - Transcripts: Publicly searchable and downloadable for research use in XML format.
  - Sound Recordings: Audio recordings are managed via **TalkBank** (`talkbank.org`). Because TalkBank requires individual user authentication, credentials and download authorization must be handled manually by the user. The automated agent will **never** submit user credentials, accept agreements, or bypass authentication.
- **Redistribution Policy**:
  - Raw audio and transcript segments remain strictly confined to the local `data/` directory.
- **Recommended Citation**:
  > Simpson, R. C., Briggs, S. L., Ovens, J., & Swales, J. M. (2002). *The Michigan Corpus of Academic Spoken English*. Ann Arbor, MI: The Regents of the University of Michigan.

---

## 3. Technical Indian English (TIE) / NPTEL MOOC Corpus

- **Source**: National Programme on Technology Enhanced Learning (NPTEL), IITs & IISc; TIE corpus curated by Rai et al. (`raianand1991/TIE` and `raianand/TIE_shorts` on Hugging Face).
- **Licence**:
  - Original NPTEL course videos: National Programme on Technology Enhanced Learning educational use.
  - TIE dataset: Creative Commons Attribution-ShareAlike 2.0 Generic ([CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/)) / Apache-2.0 for `TIE_shorts`.
- **Permitted Uses**:
  - Acoustic and accented ASR research, non-commercial speech recognition evaluation.
- **Restrictions**:
  - Do not scrape YouTube or violate YouTube Terms of Service. Downloads are sourced from official direct archives (archive.org NPTEL collections, direct NPTEL downloads, or Hugging Face dataset releases).
- **Citation**:
  > Rai, A. K., et al. "A Deep Dive into the Disparity of Word Error Rates across Thousands of NPTEL MOOC Videos."

---

## 4. Far-Field Simulation & Room Impulse Responses

- **Synthesized Reverb & Room Noise**:
  - Room impulse responses generated via mathematical image-source models (pure algorithmic synthesis) or CC0 public-domain acoustic impulse responses.
  - Classroom ambient noise generated using synthetic pink/brown noise and crowd babble with CC0 / MIT licenses.
