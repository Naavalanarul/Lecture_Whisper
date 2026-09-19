# Android Findings & Background Execution Analysis (Pixel 8a, Android 17)

## Hardware & Target Environment
- **Device**: Google Pixel 8a
- **Target OS**: Android 17 (API 35+)
- **Audio Source**: `MediaRecorder.AudioSource.VOICE_RECOGNITION` (hardware DSP beamforming + noise suppression)
- **Audio Format**: AAC mono, 16 kHz / 44.1 kHz, 64 kbps, container format `.m4a`

## Background Recording & Foreground Service Analysis

### Android 14/15/17 Microphone Restrictions
Starting in Android 14 (API 34) and tightened in Android 15/17:
1. `foregroundServiceType="microphone"` is strictly enforced.
2. An app cannot start a foreground service with microphone access while in the background unless it meets specific exemptions (e.g. active notification action pending intent, accessibility service, or assistant role).
3. If an app attempts `startForegroundService` from the background to access the microphone without an exemption, the system throws a `SecurityException: Starting FGS with type microphone callerApp is not in foreground`.

## Analysis of the 3 Scheduling Modes

### Mode 1: Exact Alarm → Notification Tap (Recommended / Most Reliable)
- **Mechanism**:
  - `AlarmManager.setExactAndAllowWhileIdle()` fires at class start time.
  - Broadcast receiver posts a high-priority notification with a full-screen or action button: *"Class starting — tap to record"*.
  - When the user taps the action button, the pending intent triggers an Activity or foreground service start directly from user interaction.
- **Exemption**: User interaction with a notification action is an official platform exemption allowing `microphone` foreground service initiation.
- **Reliability on Pixel**: **High**. Tested and verified across modern Pixel Android builds with `SCHEDULE_EXACT_ALARM` permission.

### Mode 2: Class Day Mode (Pre-warmed Foreground Service)
- **Mechanism**:
  - User opens the app before class (e.g. in the morning).
  - App starts the foreground service while the app is in the foreground (validating `callerApp is in foreground`).
  - The service remains alive in the background with a persistent silent notification.
  - The microphone is opened and recording begins only when the system clock hits the slot start time.
- **Trade-offs**:
  - Requires battery optimization exemption (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).
  - If the OS kills the process under severe memory pressure, it requires sticky restart (`START_STICKY`).
- **Reliability on Pixel**: **Medium-High** if battery optimization is disabled.

### Mode 3: Assistant-Role Mode (`VoiceInteractionService`)
- **Mechanism**:
  - App implements `android.service.voice.VoiceInteractionService`.
  - User explicitly sets Lecture Whisper as the device's Default Digital Assistant in Android Settings (`Settings -> Apps -> Default apps -> Digital assistant app`).
  - Assistant apps hold permanent background audio capture privileges and can activate hotword/session capture from the background.
- **Trade-offs**:
  - **Replaces Google Gemini / Google Assistant** as the device-wide assistant.
  - Very high privilege requirement; strictly experimental.
- **Reliability on Pixel**: **Functional for dedicated recording devices**, but inconvenient on a primary phone.

## Chunking & Crash Recovery Architecture
- The native Kotlin `RecorderService` writes rotating **10-minute AAC chunks** (`chunk_001.m4a`, `chunk_002.m4a`, etc.).
- When a chunk reaches 10 minutes (600,000 ms), the `MediaRecorder` seamlessly rotates to the next chunk file.
- If the phone runs out of battery, reboots, or crashes:
  - All previously finalized 10-minute chunks are safely closed on disk and preserved in local SQLite (`chunks.db`).
  - At most the current active chunk (< 10 minutes) is interrupted.
- On reboot / service restart, the `RecordingChunkManager` scans for unfinalized sessions and marks them ready for background upload.
