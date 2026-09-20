# ADR 004: Announcement Discovery Scarcity in Archival Lectures and Phase 4b Synthetic Evaluation

## Status
Accepted

## Context
Phase 3 of the test suite evaluated automated discovery of announcements, deadlines, exams, and questions across the full lecture transcripts:
1. University lectures recorded for archival OpenCourseWare (such as MIT 6.006 and MIT 6.0001) intentionally omit transient semester deadlines (e.g. *"Problem Set 1 is due next Friday at 5 PM"*), directing students to class websites (Stellar / Canvas) instead.
2. In introductory CS lectures (e.g. MIT 6.0001 Python), common programming terms trigger high false-positive rates for naïve cue lexicons:
   - *"assignment"* triggers on Python variable assignment statements (`x = 5`, *"an equal sign stands for an assignment"*).
   - *"test"* triggers on CPU conditional branch tests (`ALU test`, `unit test`, `test case`).
3. Rule 4b specifies: *"If no lecture has usable announcements: Say so plainly. Then propose a mock-announcement approach: clearly labelled SYNTHETIC in every report."*

## Decision
1. In `review/candidates.csv` (171 candidates), conduct a human audit of all 24 announcement candidates and 147 questions.
2. Audited precision results on real transcripts:
   - **Student / Pedagogical Questions**: 146 TP, 0 FP (**100.0% Precision**)
   - **Recitation / Office Hours**: 3 TP, 0 FP (**100.0% Precision**)
   - **Academic Assignments (Homework)**: 4 TP, 8 FP (**33.3% Precision**) due to Python variable assignment false positives.
   - **Course Exams**: 3 TP, 6 FP (**33.3% Precision**) due to CPU branch condition false positives.
   - **Overall Candidate Precision**: 157 TP, 14 FP (**91.8% Precision**).
3. To evaluate deadline extraction on realistic spoken deadlines, implement Phase 4b: a synthetic benchmark suite (`server/tests/test_synthetic_announcements.py`), clearly labeled `SYNTHETIC`, containing explicit dates (*"Problem Set 1 is due next Friday at 5:00 PM"*, *"Midterm exam on November 15th"*).

## Consequences
- Accurate reporting of keyword ambiguities in STEM lectures.
- Verifiable relative date resolution against known benchmark dates without contaminating real lecture ground truth.
