# Lecture Whisper UI Audit Report (Phase 0)

This audit documents the visual, structural, typographic, accessibility, and architectural defects identified across all 8 views of the Lecture Whisper web interface (`ui/`). Observations are derived from the 48 visual captures in `docs/ui-screenshots/p0/` across three standard responsive breakpoints (**1440px Desktop**, **1024px Tablet**, **390px Mobile**) in both **Light** and **Dark** themes, in conjunction with full codebase inspection.

---

## 1. Global Shell & Navigation Failures

### 1.1 Responsive Navigation Collapse (<1280px Breakpoint)
- **Defect:** In `Header.tsx`, the primary segmented navigation is wrapped in `hidden xl:flex`.
- **Impact at 1024px (Tablet):** On standard iPads and small laptops (1024px width), the main navigation bar completely vanishes from the header row. The fallback rail (`xl:hidden`) appears as an awkward secondary horizontal scrollbar *under* the header, stealing 48px of precious vertical workspace height.
- **Impact at 390px (Mobile):** The horizontal scroll rail overflows awkwardly. Only 2.5 of the 8 tabs are visible. Badges are partially clipped. There is no hamburger menu, no mobile drawer, and no bottom tab bar.
- **Header Vanity Metrics:** The top brand header contains `"Apple Silicon M4 Max · 36GB Unified"` with a pulsing green circle. This is an irrelevant hardware boast that wastes header width, clutters mobile navigation, and provides zero academic value to the student.

### 1.2 Persistent Floating Audio Player Obstruction
- **Defect:** `AudioPlayer.tsx` is rendered as a fixed floating overlay: `fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none` with an internal container `max-w-4xl mx-auto pointer-events-auto`.
- **Impact:** Across every single screen (Library, Lecture View, Deadlines, Q&A, Speakers, Habits, Schedule, LoRA Studio), the floating player directly covers the bottom 112px of interactive content.
  - On **Lecture View**: Bottom transcript segments and summary notes cannot be read or clicked.
  - On **Schedule View**: Friday afternoon class slots and action buttons are completely concealed.
  - On **LoRA Studio**: The last alignment cards and save actions are blocked.
  - On **390px Mobile**: The player takes up over 25% of the total screen height.
- **Audio State Decoupling:** The player displays chapters (`Administrative Announcements`) and timeline scrubbers even when no audio file is loaded or when viewing views unrelated to the active lecture.

---

## 2. Screen-by-Screen Defect Audit

### Screen 1: Library (`InboxView.tsx`)
- **Vanity Cards Dominance:**
  - The top of the page is occupied by 4 large static cards: *"Total Recorded Lectures"*, *"Audio Hours Captured"*, *"Local Neural Models"*, and *"Data Privacy Guarantee"*.
  - On mobile (390px), these 4 cards stack vertically and take up **100% of the initial viewport**, completely hiding the search bar, filter tabs, upload button, and actual lecture cards behind multiple screenfuls of scrolling.
- **Useless Technical Jargon in Cards:**
  - Cards display raw technical strings: `16kHz Mono AAC lossless sync`, `Large-v3-Turbo + PyAnnote CPU`, and `sha: 9f86d08188...`. Students need course code, lecture title, date, duration, and key topic tags.
- **Intrusive Drag-and-Drop Dropzone:**
  - A massive 120px dashed box (`border-2 border-dashed rounded-2xl p-6`) permanently occupies the center of the page even when lectures are present. In world-class tools (Linear, Notion), drag-and-drop is a non-intrusive full-window drop overlay triggered only when dragging files into the window.
- **Missing Loading Skeleton & Real Empty State:**
  - When loading recordings over slow network, an empty box flashes without skeleton placeholders.
  - Empty state lacks secondary recovery options (e.g. "Download sample lecture", "Pair phone guide").

### Screen 2: Lecture View (`LectureView.tsx`)
- **Performance & Virtualization Absence:**
  - The transcript list maps all segments directly (`filteredSegments.map(...)`) into DOM nodes. In real 60–90 minute university lectures with 1,200–2,000 segments, this causes massive DOM bloat, high memory usage, and scroll lag.
  - Requires `@tanstack/react-virtual` list virtualization with dynamic row heights.
- **Layout Rigidity (No Resizable Split View):**
  - Fixed 7-column / 5-column grid (`grid grid-cols-1 lg:grid-cols-12`) cannot be resized. Users cannot widen the transcript for speed-reading or widen the notes pane for studying.
- **Truncated Chapter Navigation:**
  - Chapter tabs at the top of the notes pane use `overflow-x-auto pb-1 no-scrollbar`. Long chapter titles like `"Dynamic Programming Foundations (38:00)"` are truncated or pushed out of view horizontally with zero affordance.
- **All-Caps Eyebrow Tells:**
  - Headings feature AI-generated design tells: `"AI STUDY NOTES"`, `"KEY POINTS & TAKEAWAYS"`, `"CORE DEFINITIONS"`, `"EXECUTIVE LECTURE SUMMARY"`.

### Screen 3: Deadlines (`EventsView.tsx`)
- **Uncalibrated Color Spaghetti:**
  - Events apply arbitrary colored badges: exams are rose (`bg-rose-500/10`), quizzes are amber (`bg-amber-500/10`), assignments are indigo (`bg-brand-500/10`), seminars are purple (`bg-purple-500/10`).
  - Violates the two-hue discipline (accent + alert only).
- **Ambiguous Date Handling Failure:**
  - Dates flagged with `needs_review: true` show an amber border, but provide **no resolution interface**. A student cannot pick between alternative interpretations (e.g. "+7 days vs today") without manually deleting and re-adding the deadline.
- **No Temporal Grouping:**
  - Events are shown as an unsorted grid of cards rather than a structured temporal agenda (*This week*, *Next week*, *Later this term*, *Past*).
- **Missing Bulk Export:**
  - Only allows individual `.ics` download per card; lacks "Export all deadlines to Apple/Google Calendar".

### Screen 4: Q&A (`QuestionsView.tsx`)
- **Hallucinated / Duplicate Card Text:**
  - Card summaries repeat synthetic boilerplate: `"Optimal substructure allows decomposing a global optimum into local subproblem optima..."` is copy-pasted across cards.
- **No Lecturer vs Student Grounding:**
  - Cards do not indicate who asked the question (student vs professor) or whether an answer was actually given in the audio.
  - Missing exact transcript timestamps for both the question trigger and the spoken response.
- **Star Filter State Lost on Reload:**
  - Starred questions are kept in ephemeral in-memory React state (`useState<Set<number>>`) and vanish upon tab switch or page refresh.

### Screen 5: Speakers (`SpeakersView.tsx`)
- **Unreconciled Statistics & Missing Silence Metric:**
  - Talk times sum only to recorded speech, but the total lecture duration is not displayed. Silence time is unaccounted for.
  - Shares are rounded (`round(share, 3)`), causing percentages to occasionally sum to 99% or 101%.
- **Hardcoded Gradient Avatars:**
  - Uses flashy CSS gradients (`from-brand-500 to-cyan-500`, `from-purple-500 to-pink-500`) that scream generic template rather than clean tool design.
- **No Primary Lecturer Thresholding:**
  - Lacks strict rule (>70% speech dominance = Primary lecturer).

### Screen 6: Habits & Repeated Phrases (`PhrasesView.tsx`)
- **Synthetic Placeholders Without Transcript Grounding:**
  - Habit phrases list occurrences (`you know: 12`, `basically: 8`), but clicking them fails to reveal where in the lecture they were uttered.
  - Missing first occurrence timestamp, last occurrence timestamp, and typical inter-arrival frequency.
- **Duplicated Descriptions:**
  - Generic descriptions like "Frequent conversational filler" are duplicated across items.

### Screen 7: Schedule (`TimetableView.tsx`)
- **Truncated Fixed Columns (No Time Axis):**
  - Uses 5 static column boxes without an hourly time axis (07:00–19:00).
  - Slot titles like `"CS 106B Dynamic Programming"` truncate to `"CS 106B Dyna..."` even at 1440px desktop width.
  - Overlapping classes or evening labs cannot be represented accurately.
- **Stuck Tooltip Bug (A8):**
  - Hovering or triggering the "Keyboard shortcuts" modal from the Schedule view causes the browser tooltip to lock permanently on the screen until clicked elsewhere.

### Screen 8: LoRA Studio (`CorrectionsView.tsx`)
- **Severe WCAG Contrast Failures:**
  - The `RAW ASR PREDICTION` box uses pink text (`#F87171`) on a light red background (`#FFE4E6` in light mode), yielding a **1.8:1 contrast ratio**, completely unreadable for students with normal vision or color deficiencies.
- **Promotion Gate Violation (A5):**
  - Shows adapter `v1.0.0-lora-cs-academic` as `"Promoted & Active"` despite having only **3 human correction pairs**! This directly violates the production benchmark gate requiring $\ge 50$ human-verified evaluation pairs and statistically superior WER.

---

## 3. Typography & Styling Audit

| Issue | Existing Implementation | Design System Standard |
|---|---|---|
| **Text sizing** | Arbitrary `text-[10px]`, `text-[11px]`, `text-[15px]` | Modular 1.2 scale: `text-xs` (12px), `text-sm` (14px), `text-base` (15px) |
| **Numeric formatting** | Proportional variable numerals on durations and timestamps | Mandatory `font-variant-numeric: tabular-nums` |
| **Border styling** | Blurry drop shadows + 2px thick borders (`border-white/10`) | 1px hairline borders (`var(--border)`) |
| **Label casing** | ALL-CAPS tracked-out labels (`KEY POINTS`, `CORE DEFINITIONS`) | Sentence case (`Key points`, `Core definitions`) |
| **Radius consistency** | `rounded-2xl` (16px) applied everywhere indiscriminately | Disciplined radius scale: `rounded-md` (6px for buttons/inputs), `rounded-lg` (8px for cards/dialogs) |

---

## 4. Component Duplication & Technical Debt

1. **Multiple Ad-hoc Modals:**
   - `PairingModal.tsx`, `ShortcutsModal.tsx`, `AddDeadlineModal` (inline in `EventsView.tsx`), and `AddSlotModal` (inline in `TimetableView.tsx`) each implement their own custom backdrop, close button, and Esc key listeners. None of them manage focus trapping or return focus on unmount.
2. **Duplicated Formatters:**
   - Duration formatting logic (`formatTime`, `formatDate`, relative time calculation) is duplicated or inconsistently implemented across views.
3. **Hardcoded Demo State:**
   - `App.tsx` seeds fake CS 106B data directly into initial component state whenever server arrays are empty, making fresh installs appear pre-populated without user consent.
