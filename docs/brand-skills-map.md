# Brand Kit Skills Map

This document maps each phase of the Lecture Whisper brand kit generation and integration task to verified skills available in the environment (`/Users/naavalanarul/antigravity-skills/skills` and `~/.agents/skills/`).

---

## Available Skills Inventory

| Skill Name | Source Path | Primary Focus |
|---|---|---|
| `brand-guidelines` | `/Users/naavalanarul/antigravity-skills/skills/brand-guidelines` | Brand identity, clear space rules, typography standards, logo lockout and asset generation. |
| `canvas-design` | `/Users/naavalanarul/antigravity-skills/skills/canvas-design` | Geometric drawing, SVG coordinate spaces, path optimization, curve precision. |
| `frontend-design` | `/Users/naavalanarul/antigravity-skills/skills/frontend-design` | Web UI asset integration, `<Logo />` React component, dark/light SVG switching, token harmony. |
| `ui-ux-pro-max` | `/Users/naavalanarul/antigravity-skills/skills/ui-ux-pro-max` | High-density icon scaling, WCAG contrast compliance, touch target sizing. |
| `react-native-skills` | `/Users/naavalanarul/antigravity-skills/skills/react-native-skills` | Android asset standards: adaptive icons, monochrome notification drawables, safe-zone compliance. |
| `webapp-testing` | `/Users/naavalanarul/antigravity-skills/skills/webapp-testing` | Browser inspection, Playwright visual validation, manifest verification. |
| `verification-before-completion` | `/Users/naavalanarul/antigravity-skills/skills/verification-before-completion` | IoU / SSIM pixel overlay comparison, legibility contact sheets at 16–512px. |
| `finishing-a-development-branch` | `/Users/naavalanarul/antigravity-skills/skills/finishing-a-development-branch` | Atomic git commits, asset bundling, clean release checkpointing. |

---

## Phase-to-Skill Mapping

### Phase 1: Analyse and Vectorise
- **Skills Applied:** `canvas-design`, `verification-before-completion`
- **Activities:**
  - Copy master source PNG to `brand/source/logo-master.png`.
  - Structural analysis: background, stroke color, symmetry, padding, corner radii, and AI artifact detection.
  - Reconstruct clean vector geometry into `brand/svg/mark.svg` with `fill="currentColor"` and `viewBox="0 0 512 512"`.
  - Render pixel overlay and compute pixel difference (IoU / pixel match percentage) vs. source.
  - Generate legibility contact sheet at 16, 24, 32, 64, and 512px across light, dark, single-colour, and grayscale.
  - Evaluate small-size legibility and build `mark-small.svg` if needed.
  - Phase 1 Gate: Stop and present visual comparison for user approval.

### Phase 2: Brand Kit Specification
- **Skills Applied:** `brand-guidelines`, `canvas-design`
- **Activities:**
  - Define canonical 2-hue color palette tokens (`accent-light`, `accent-dark`, `ink`, `paper`, `ink-dark`).
  - Generate SVG mark variants: `mark.svg`, `mark-accent.svg`, `mark-ink.svg`, `mark-white.svg`, `mark-app.svg`.
  - Typeset "Lecture Whisper" wordmark in UI font (Geist / Inter), convert to outlined paths.
  - Construct horizontal, stacked, and icon-only lockups with defined clear space.
  - Write brand documentation in `docs/brand.md`.

### Phase 3: Web Dashboard and PWA Integration
- **Skills Applied:** `frontend-design`, `ui-ux-pro-max`, `webapp-testing`
- **Activities:**
  - Create `<Logo />` React component supporting `variant="mark | lockup"` and dynamic sizing.
  - Integrate logo into top bar, sidebar, empty states, loading screen, pairing modal, and 404 page.
  - Generate favicons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, PWA maskable icons).
  - Update `site.webmanifest` and HTML meta tags.
  - Generate social preview cards (`og-image.png` 1200×630, GitHub 1280×640).
  - Visual verification via Playwright screenshots.

### Phase 4: Android App Integration
- **Skills Applied:** `react-native-skills`, `verification-before-completion`
- **Activities:**
  - Build Android adaptive icon (`ic_launcher.xml`, `ic_launcher_round.xml`) with foreground vector drawable and `<monochrome>` layer for Android 13+ themed icons.
  - Generate legacy PNG mipmaps (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi).
  - Build monochrome notification small icon (24dp white silhouette vector).
  - Configure Android 12+ SplashScreen API.
  - Update in-app headers and connection screen.
  - Build debug APK and verify resources.

### Phase 5: Repo Polish & Build Script
- **Skills Applied:** `finishing-a-development-branch`
- **Activities:**
  - Update `README.md` with responsive picture lockup.
  - Create reproducible build script `brand/build.py` (or `brand/build.sh`) to regenerate all raster and vector assets.
  - Final atomic git commit.
