# ADR 006: Mobile App v2 Architecture, Stack Inspection, and Technology Selection

## Status
Proposed (Phase 0 Gate — Awaiting User Review)

## Context
The Lecture Whisper mobile app v2 specification requests rebuilding the look, feel, pairing, and connection flow of the Android app in `mobile/`. The prompt notes:
> *"Rebuild the look, feel and connection flow of the Android app in `mobile/` (React Native plus native Kotlin recorder). Keep the existing recording service, chunking and upload logic working... Keep React Native (do not rewrite in Kotlin) unless you justify it in `docs/decisions/`."*

During Phase 0 inspection, the existing codebase in `mobile/` was audited to verify the current React Native version, navigation library, state management, native modules, and SDK targets.

## Phase 0 Inspection Findings

### 1. Existing Mobile Codebase Stack
- **React Native Version**: **None (0.0.0)**. There is no `package.json`, `node_modules`, `metro.config.js`, or React Native JavaScript bundle in `mobile/`.
- **Actual Current Stack**: Pure Native Android (Java 17 + Kotlin 2.0).
  - Main Activity: `MainActivity.java` (1,269 lines), handles UI tabs, timetable view, audio session lists, connection guides, and sidebar drawer.
  - Recording Service: `com.lecturewhisper.recorder.RecorderService.kt` (225 lines), native Android `ForegroundService` with `FOREGROUND_SERVICE_MICROPHONE`, `PARTIAL_WAKE_LOCK`, and hardware-tuned `MediaRecorder.AudioSource.VOICE_RECOGNITION`.
  - Network & Sync: `LaptopSyncClient.java`, executes HTTP/REST synchronization, timetable OCR upload, and multi-part chunk uploads.
  - Stores: `TimetableStore.java`, `RecordingStore.java` backed by SQLite and SharedPreferences.
  - SDK Targets: `minSdkVersion = 26`, `targetSdkVersion = 35`, `compileSdkVersion = 35` (Android 15 / 17 preview ready).
  - Build Pipeline: `mobile/build_release_apk.sh` compiles directly using the Android SDK toolchain (`aapt2`, `javac`, `d8`, `zipalign`, `apksigner`).
  - Distribution Size: Signed release APK is **176 KB** with a 3-second build time.

### 2. Device & ADB Inspection
- **Command**: `adb devices -l` and `adb shell getprop ro.build.version.release`.
- **Result**: `adb: no devices/emulators found`. No physical device is currently plugged into the workstation via USB, and no active emulator is booted.
- **Documented Target**: Google Pixel 8a running **Android 17 / API 35+** (as recorded in `docs/android-findings.md` and `mobile/connect_device.sh`).

### 3. Android Local Network Permission Analysis
- **Platform Context**: Under Android 16/17 (API 35–37), local network discovery is undergoing transition:
  - Apps targeting SDK 35/36 use `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, and `NEARBY_WIFI_DEVICES` (opt-in for local discovery).
  - For future SDK 37, Android introduces `ACCESS_LOCAL_NETWORK` runtime permission for mDNS and local subnet broadcast/unicast sockets.
  - On the Pixel 8a (API 35+), requesting `NEARBY_WIFI_DEVICES` (with `neverForLocation` flag) and standard Wi-Fi multicast lock (`WifiManager.MulticastLock`) is required to reliably resolve `_lecturewhisper._tcp.local` via mDNS and prevent OS power-saving filters from dropping multicast packets.

---

## Architectural Alternatives & Tradeoff Analysis

| Metric | Option A: Modern Native Android (Kotlin/Java + Material 3) | Option B: React Native 0.76+ with New Architecture |
| :--- | :--- | :--- |
| **Existing Code Alignment** | 100% direct drop-in. Preserves `RecorderService.kt`, stores, and existing tested service lifecycle. | Requires creating RN project from scratch, wrapping `RecorderService.kt` in a TurboModule/NativeModule. |
| **APK Footprint** | **~250 KB – 1.2 MB** (Ultra-lightweight). | **~35 MB – 50 MB** (Includes Hermes engine, React runtime, and native C++ JSI bindings). |
| **Build & Compilation Time** | **~3–5 seconds** directly via Android SDK toolchain. | **~2–4 minutes** via Gradle, Metro, and C++ NDK compiler. |
| **Foreground Mic Service Stability** | **Zero abstraction overhead**. Proven background `PARTIAL_WAKE_LOCK` and Android 14+ FGS microphone compliance. | Risk of JS engine sleeping while backgrounded; requires native bridge synchronization. |
| **UI Fidelity & Instagram Aesthetic** | High fidelity with custom native views, spring animations (`DynamicAnimation`), and bottom sheets. | Native feel via Reanimated 3, Gesture Handler, `@gorhom/bottom-sheet`, and FlashList. |
| **Testing** | JUnit 5 + Robolectric / MockWebServer for `ConnectionManager`. | Jest + React Native Testing Library for `ConnectionManager`. |

---

## Decision Proposal for User Approval

We propose two viable paths for the user's explicit sign-off:

### Path 1 (Recommended — Native Excellence):
Implement the complete Instagram-grade UI v2 directly in Native Android (Kotlin/Java):
1. 5-tab Instagram-style bottom navigation + top header with morphing connection status chip.
2. Instagram aesthetic: 48dp touch targets, two hues (Brand Indigo `#6366F1` + Neutrals + Alert Red), no emoji icons, no ALL CAPS, WCAG AA compliance.
3. CameraX + ML Kit QR code scanner in a dedicated viewfinder sheet; support `lecturewhisper://pair` deep links.
4. OkHttp 4 client with `CertificatePinner` pinning the Mac server's self-signed TLS fingerprint from the QR payload.
5. `ConnectionManager` state machine (`NotPaired`, `Searching`, `Connected`, `Syncing`, `Unreachable`) with discovery waterfall (MRU parallel ping $\rightarrow$ mDNS `_lecturewhisper._tcp` $\rightarrow$ /24 subnet scan).
6. Android Keystore secure storage for the persistent device token.

### Path 2 (Strict React Native Rebuild):
Scaffold a fresh React Native 0.76+ project inside `mobile/`, install Reanimated 3, Gesture Handler, `@gorhom/bottom-sheet`, FlashList, `react-native-vision-camera`, write TypeScript views, and bridge the existing Kotlin `RecorderService.kt`.

*The Implementation Plan details both paths with Path 1 as the recommended default to maintain zero bloat, instant compilation, and zero-risk microphone foreground retention.*
