# 🎨 Lecture Whisper — Production Web Dashboard

The web dashboard interface for Lecture Whisper, built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**.

---

## 🌟 Features & Design Polish

- **Linear / Vercel Aesthetic**: Deep midnight dark surfaces (`#070A12` base, `#0D1322` elevated cards) with fine borders and glowing hover states.
- **Synchronized Audio Player**: Interactive timeline scrubber with chapter boundary tick-marks, hover timestamp preview, playback speed toggles (0.75x–2.0x), and autoscroll "Follow Audio" transcript tracking.
- **8 Dedicated Academic Views**:
  1. **Library & Dropzone**: View recordings, duration, and drag-and-drop audio files for manual offline transcription.
  2. **Lecture View**: Audio-synced transcript reader with search hit highlighting, speaker badges, and Markdown-styled chapter notes.
  3. **Deadlines & Events**: Relative date countdowns ("due Friday", "exam in 3 days"), review confirmation, and one-click `.ics` calendar download.
  4. **Important Questions**: Exam hints and conceptual inquiries flagged during lecture with jump-to-audio timestamps.
  5. **Speaker Intelligence**: Talk-time distribution chart, speaking pace (WPM), and local voiceprint registration.
  6. **Repeated Phrases**: Distinguishes key conceptual technical terms from subconscious verbal fillers.
  7. **Weekly Schedule**: Color-coded weekly timetable with photo upload for local MLX-VLM schedule parsing.
  8. **LoRA Studio**: Human-in-the-loop corrections table with visual word diffs and interactive local fine-tuning runner.
- **Full Keyboard Navigation**: `Space` (Play/Pause), `J` / `←` (Seek -10s), `L` / `→` (Seek +10s), `M` (Mute), `1`-`8` (Switch tabs), `?` (Shortcuts cheat sheet).
- **Tabular Figures**: Timestamps and counters formatted with `tabular-nums` to eliminate jitter during playback.
- **Offline & CDN-Free**: All vector SVG icons and mathematical QR codes generated locally with zero external network requests.

---

## 🛠️ Development & Building

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production assets directly into server/static/
npm run build
```
The build outputs directly to `../server/static/`, which is immediately served by the FastAPI backend at `http://localhost:8000`.
