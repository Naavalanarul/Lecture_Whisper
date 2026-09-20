# ADR 001: MICASE Access Policy and TalkBank Fallback Strategy

## Status
Accepted

## Context
The Lecture Whisper real-recording evaluation suite requires multi-speaker classroom dialogue and student Q&A interactions. The Michigan Corpus of Academic Spoken English (MICASE) provides gold-standard transcripts of university lectures at the University of Michigan with explicit speaker turns (`<U WHO="PRF">`, `<U WHO="S1">`). However:
- Public MICASE XML transcripts are accessible through University of Michigan ELI.
- Corresponding raw high-resolution audio files are hosted under TalkBank (`https://talkbank.org/access/MICASE/`), which requires individual user registration, authentication, and manual agreement to research use agreements.
- Project Rule 0.2 strictly prohibits the agent from submitting web forms, accepting terms, or entering credentials on behalf of the user.

## Decision
1. Implement a unified XML parser (`lecturewhisper.eval.parsers.parse_micase_xml`) that extracts speaker turns, question markers, and timecode approximations directly from the official XML schema.
2. Provide explicit manual instructions in `testsuite-plan.md` for the human user to download `LES155SU099` or `LEL115SU074` audio from their personal TalkBank account.
3. In the automated evaluation pipeline, utilize the parsed transcript for question and syntax discovery while running full ASR speech evaluation on the publicly licensed MIT OCW and TIE audio streams.

## Consequences
- Zero credential or privacy leakage.
- Full compliance with TalkBank academic licensing.
- Complete unit test coverage using committed synthetic XML fixtures in `server/tests/fixtures/synthetic_sample.xml`.
