# Skills Map — Lecture Whisper

Mapping of each project phase to available skills discovered in
`/Users/naavalanarul/antigravity-skills/skills/` (100 skill folders) and
`/Users/naavalanarul/antigravity-skills/.agents/` (no rules found, only `plugins/`).

No skills were found in `/Users/naavalanarul/Documents/Projects/Lecture_Whisper/.agents/` (directory does not exist yet).

## Discovery Summary

| Location | Contents |
|---|---|
| `antigravity-skills/skills/` | 100 skill folders with `SKILL.md` each |
| `antigravity-skills/.agents/rules/` | Does not exist |
| `antigravity-skills/.agents/plugins/` | `marketplace.json` only |
| `Lecture_Whisper/.agents/` | Does not exist yet (will create) |

## Phase → Skill Mapping

### Phase 0 — Discovery, Plan, Environment

| Concern | Skill | Notes |
|---|---|---|
| Planning | **writing-plans** | Granular step-by-step plans with test commands and exact file paths |
| Planning | **planning-with-files** | File-based persistent planning (`task_plan.md`, `findings.md`, `progress.md`) |
| Project architecture | **project-development** | LLM pipeline design principles; `acquire→prepare→process→parse→render` stages |
| Context management | **context-fundamentals** | Token budgeting, progressive disclosure |

### Phase 1 — Server Skeleton + CLI

| Concern | Skill | Notes |
|---|---|---|
| Execution | **executing-plans** | Linear checkpointed execution of the approved plan |
| Testing | **test-driven-development** | Red-Green-Refactor for API endpoints and CLI |
| Verification | **verification-before-completion** | Fresh command output before claiming done |
| Debugging | **systematic-debugging** | Four-phase root-cause methodology if issues arise |

### Phase 2 — Offline Pipeline v1

| Concern | Skill | Notes |
|---|---|---|
| Pipeline design | **project-development** | Discrete pipeline stages, idempotent state |
| Testing | **test-driven-development** | Test each pipeline stage independently |
| Evaluation | **evaluation** | Outcome-based measurement framework for WER |
| Advanced eval | **advanced-evaluation** | LLM-judge methodology for hallucination detection |
| Debugging | **systematic-debugging** | For audio/ML pipeline issues |

### Phase 3 — Notes, Events, Questions, Phrases

| Concern | Skill | Notes |
|---|---|---|
| LLM pipeline | **project-development** | Prompt design, token budgets, structured output |
| Evaluation | **evaluation** + **advanced-evaluation** | Precision/recall, LLM-judge for event extraction |
| Testing | **test-driven-development** | Fixture-based tests for extraction |
| Harness design | **harness-engineering** | For the eval harness with locked metrics |

### Phase 4 — Web Dashboard

| Concern | Skill | Notes |
|---|---|---|
| UI design | **frontend-design** | Anti-cliché design, custom palettes, intentional UI |
| UI/UX standards | **ui-ux-pro-max** | Accessibility, contrast ratios, hit targets, design tokens |
| Web guidelines | **web-design-guidelines** | Vercel Web Interface Guidelines audit |
| React patterns | **react-best-practices** | Performance optimisation, bundle size, re-renders |
| React composition | **composition-patterns** | Compound components, variant patterns (React 19) |
| Testing | **webapp-testing** | Playwright-based testing patterns |
| Theme | **theme-factory** | Font + colour theme selection (if applicable) |

### Phase 5 — Pairing and Upload

| Concern | Skill | Notes |
|---|---|---|
| Testing | **test-driven-development** | TDD for upload/pairing protocol |
| Verification | **verification-before-completion** | Integration test evidence |
| Debugging | **systematic-debugging** | Network protocol debugging |

### Phase 6 — Android App (React Native)

| Concern | Skill | Notes |
|---|---|---|
| React Native | **react-native-skills** | Expo/RN best practices, FlashList, native modules |
| UI design | **frontend-design** | Mobile UI design principles |
| UI/UX | **ui-ux-pro-max** | Mobile touch targets, accessibility |
| Testing | **test-driven-development** | Unit tests for queue/upload logic |
| Git workflow | **finishing-a-development-branch** | Branch integration after feature completion |

### Phase 7 — Timetable Image Parsing

| Concern | Skill | Notes |
|---|---|---|
| Pipeline | **project-development** | VLM pipeline stage design |
| Testing | **test-driven-development** | Fixture-based tests with sample images |
| Evaluation | **evaluation** | Cell-level accuracy metrics |

### Phase 8 — Fine-Tuning

| Concern | Skill | Notes |
|---|---|---|
| Eval harness | **harness-engineering** | Locked metrics, editable content, approval gates |
| Eval framework | **evaluation** + **advanced-evaluation** | LLM-judge, regression prevention |
| Self-improvement | **self-improvement-loops** | RSI loop design for adapter training |
| Pipeline | **project-development** | Dataset build, training pipeline |

### Phase 9 — Hardening and Packaging

| Concern | Skill | Notes |
|---|---|---|
| Verification | **verification-before-completion** | Fresh-clone verification |
| Git | **finishing-a-development-branch** | Final branch cleanup |
| Testing | **webapp-testing** | End-to-end smoke tests |

## Skills NOT Used (and Why)

| Skill | Reason for exclusion |
|---|---|
| `baoyu-*` (16 skills) | Social media / content publishing — irrelevant |
| `remotion-*` (11 skills) | Video production — irrelevant |
| `obsidian-*` (3 skills) | Obsidian-specific — irrelevant |
| `mediabunny` | Browser-based media processing — we use ffmpeg server-side |
| `web-artifacts-builder` | Multi-component artifact builder — our UI is a full Vite app, not an artifact |
| `slack-gif-creator` | Slack-specific — irrelevant |
| `supabase-postgres-best-practices` | We use SQLite, not Postgres |
| `mcp-builder` | MCP server creation — irrelevant |
| `hosted-agents` | Cloud agent hosting — irrelevant |
| `algorithmic-art` | Art generation — irrelevant |
| `brand-guidelines` | Brand identity — overkill for personal tool |
| `canvas-design`, `json-canvas` | Canvas-specific — irrelevant |
| `claude-*` (2 skills) | Claude-specific — irrelevant |
| `docx`, `pdf`, `pptx`, `xlsx` | Document format skills — irrelevant |
| `using-git-worktrees` | Useful but adds complexity; will use simple branching |
| `notebooklm` | Google NotebookLM — irrelevant |
| `defuddle` | Content extraction — irrelevant |
| `brainstorming` | Ideation — requirements are fully specified |

## Orchestration Skills (Cross-Phase)

These skills apply throughout the project:

- **writing-plans** — Before each phase
- **executing-plans** — During each phase
- **verification-before-completion** — End of each phase
- **systematic-debugging** — On demand
- **test-driven-development** — All phases with code
- **skill-creator** — If we need to create project-specific skills
- **dispatching-parallel-agents** — For independent parallel work within a phase
- **subagent-driven-development** — For orchestrating implementer subagents

## Rules to Create

Since no `.agents/rules/` exist yet, we will create project rules for:
- `style.md` — Python (ruff, mypy), TypeScript (ESLint), conventional commits
- `safety.md` — No cloud calls, no audio in git, HF token from env only
- `testing.md` — pytest, Playwright, coverage expectations
