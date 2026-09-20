# Mobile App v2 Skills Map

> **Generated for Lecture Whisper Mobile v2 (Instagram-Grade UI, QR Pairing & Auto-Reconnection)**  
> **Rule Compliance**: All skill names mapped below are strictly verified from `/Users/naavalanarul/antigravity-skills/skills/`, `~/.agents/skills/`, and built-in agent capabilities. No skill names have been fabricated.

---

## 1. Skill Inventory & Verification

| Skill Name | Verified Path | Primary Focus in Mobile v2 |
| :--- | :--- | :--- |
| `react-native-skills` | `/Users/naavalanarul/antigravity-skills/skills/react-native-skills/SKILL.md` | React Native & native module architecture, Reanimated 3 animations, FlashList performance, touch interaction, gesture handling |
| `ui-ux-pro-max` | `/Users/naavalanarul/antigravity-skills/skills/ui-ux-pro-max/SKILL.md` | Instagram-grade design principles, WCAG AA color contrast compliance, 48dp touch targets, bottom sheets, navigation patterns |
| `frontend-design` | `/Users/naavalanarul/antigravity-skills/skills/frontend-design/SKILL.md` | Token hierarchy (Brand Indigo `#6366F1`, Surface, Neutral, Alert Red), light/dark mode parity, typography, SVG icon kits |
| `theme-factory` | `/Users/naavalanarul/antigravity-skills/skills/theme-factory/SKILL.md` | Consistent light and dark color palettes, high-contrast token enforcement, theme switching |
| `test-driven-development` | `/Users/naavalanarul/antigravity-skills/skills/test-driven-development/SKILL.md` | Unit test suite for `ConnectionManager` state machine, server pairing endpoints, token expiry, rate limits |
| `systematic-debugging` | `/Users/naavalanarul/antigravity-skills/skills/systematic-debugging/SKILL.md` | mDNS discovery debugging, TLS pinning validation, Wi-Fi subnet scanning, adb reverse tethering diagnostics |
| `verification-before-completion` | `/Users/naavalanarul/antigravity-skills/skills/verification-before-completion/SKILL.md` | APK compilation verification, adb screencap evidence, contrast audit, manual device test runbook |
| `planning-with-files` | `/Users/naavalanarul/antigravity-skills/skills/planning-with-files/SKILL.md` | Structured phase gating, implementation planning, architectural decision records |
| `executing-plans` | `/Users/naavalanarul/antigravity-skills/skills/executing-plans/SKILL.md` | Rigorous execution of approved phases with review checkpoints |

---

## 2. Phase-by-Phase Skill Application

### Phase 0: Audit, Inspection & Architectural Decision
- **Skills**: `planning-with-files`, `systematic-debugging`, `react-native-skills`
- **Application**:
  - Audit existing `mobile/` codebase (targetSdk 35, compileSdk 35, pure native Android Java/Kotlin stack).
  - Inspect device connectivity via ADB.
  - Document architectural choices and tradeoffs in `docs/decisions/006-mobile-v2-architecture-and-stack.md`.
  - Produce comprehensive Phase 0 report and implementation plan.

### Phase 1: Design Tokens, Tab Shell & Skeleton Views
- **Skills**: `frontend-design`, `theme-factory`, `ui-ux-pro-max`, `react-native-skills`
- **Application**:
  - Define semantic token system matching web v2 (`--accent-indigo`, `--surface-elevated`, `--text-primary`, `--alert-red`).
  - Eliminate dark-on-dark / pale-on-light contrast failures (WCAG AA ratio $\ge 4.5:1$).
  - Build 5-tab Instagram-style bottom navigation (Today, Schedule, Record [raised], Library, Settings).
  - Implement top header with brand mark and morphing connection status chip.

### Phase 2: Record Screen & Microphone Visualizer
- **Skills**: `react-native-skills`, `ui-ux-pro-max`, `frontend-design`
- **Application**:
  - Center raised record trigger with spring physics and scale feedback.
  - Real-time audio amplitude visualizer (waveform bars / pulsing rings).
  - Preserve native Kotlin `RecorderService.kt` foreground microphone service with `VOICE_RECOGNITION` beamforming and 10-minute rotating chunks.
  - Subject tagging selector and high-contrast timer display.

### Phase 3: QR Pairing & Keystore Security
- **Skills**: `test-driven-development`, `systematic-debugging`, `ui-ux-pro-max`
- **Application**:
  - Mac server endpoints: `POST /api/v1/pair/complete`, `GET /api/v1/hello`, TLS certificate generation (`~/.lecturewhisper/tls`), SHA-256 fingerprint pinning.
  - Mac dashboard & CLI: Animated pairing modal with QR code, 6-digit fallback code, 2-minute countdown timer, live device status.
  - Phone pairing: In-app camera QR viewfinder with corner brackets and scan line; deep link registration (`lecturewhisper://pair`).
  - Secure storage: Hardware-backed Android Keystore for device tokens and pinned certificates.

### Phase 4: `ConnectionManager`, Auto-Reconnection & Sync
- **Skills**: `test-driven-development`, `systematic-debugging`, `react-native-skills`
- **Application**:
  - Implement 5-state machine (`NotPaired`, `Searching`, `Connected`, `Syncing`, `Unreachable`).
  - Discovery waterfall: Parallel MRU address ping (1.5s) $\rightarrow$ mDNS `_lecturewhisper._tcp` (4s) $\rightarrow$ Subnet scan /24 (6s) $\rightarrow$ Unreachable with practical tips.
  - Background auto-sync with resumable upload, SHA-256 verification, and progress reporting.
  - Settings screen with connection management, storage cleaner, and hidden Diagnostics view.

### Phase 5: Motion, Haptics, Accessibility & Permissions
- **Skills**: `ui-ux-pro-max`, `react-native-skills`, `frontend-design`
- **Application**:
  - Spring-based touch feedback on all interactive elements (active scale 0.96).
  - Smooth bottom sheets (`@gorhom/bottom-sheet` or native bottom sheets) with swipe-to-dismiss.
  - 48dp minimum touch target size enforcement.
  - Runtime permission rationale flows: Microphone (`RECORD_AUDIO`), Camera (`CAMERA`), Notifications (`POST_NOTIFICATIONS`), and Android local network permission analysis.

### Phase 6: Device Verification & Media Showcase
- **Skills**: `verification-before-completion`, `systematic-debugging`
- **Application**:
  - Compilation of release APK (`build_release_apk.sh`).
  - Automated and manual test runs.
  - Visual verification with screenshots and screen recordings in both Light and Dark modes.
  - Produce comprehensive `docs/manual-device-test.md` runbook for hardware-specific tests.
