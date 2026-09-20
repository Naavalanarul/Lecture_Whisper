# ADR 005: Physical ADB Broadcast Hooks and Far-Field Acoustic Simulation Tiers

## Status
Accepted

## Context
Testing classroom far-field degradation requires evaluating two distinct acoustic environments:
1. Controlled parametric degradation across reverb and noise severities.
2. Real-world beamforming microphone acoustics on physical Google Pixel 8a hardware at 5–8 meters distance.

Manual recording via touch screen introduces operator timing jitter and inconsistent starting triggers.

## Decision
1. **Software Simulation (Part A)**:
   - Implement `lecturewhisper.eval.simulation.degrade_audio` simulating 3 classroom tiers:
     - Mild Classroom: $RT_{60} = 0.3$s, SNR = 25 dB
     - Moderate Classroom: $RT_{60} = 0.7$s, SNR = 18 dB
     - Severe Large Hall: $RT_{60} = 1.2$s, SNR = 10 dB
   - Add colored HVAC noise synthesis and 64 kbps AAC re-encoding.
2. **Physical ADB Automation (Part B)**:
   - Implement intent receiver in `MainActivity.java` handling:
     ```bash
     adb shell am start -n com.lecturewhisper/.MainActivity --es action start --es subject "<Subject>"
     adb shell am start -n com.lecturewhisper/.MainActivity --es action stop
     ```
   - Provide `scripts/farfield_run.py` to automate port forwarding, display human placement checklist, play audio through macOS `afplay`, and trigger ADB capture.

## Measured Software Simulation Findings
- Clean Baseline: **6.46% WER**
- Mild Classroom: **11.86% Strict WER**
- Moderate Classroom: **15.25% Strict WER**
- Severe Large Hall: **16.95% Strict WER**

## Consequences
- Clean separation between automated algorithmic simulation and optional physical hardware runs.
- Full automation for hands-free hardware testing when Pixel 8a is attached over ADB.
