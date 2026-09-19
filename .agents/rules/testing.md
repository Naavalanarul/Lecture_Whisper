# Testing Rules — Lecture Whisper

## Python (pytest)
- Test directory mirrors source: `server/tests/` → `server/src/lecturewhisper/`
- Test files: `test_<module>.py`
- Fixtures in `conftest.py` at appropriate level
- Use `tmp_path` for file-based tests
- Mock external resources (models, ffmpeg) in unit tests
- Integration tests that load real models: mark with `@pytest.mark.slow`
- Run: `uv run pytest server/tests/`

## Frontend (Playwright)
- Smoke tests for each page
- Test against `lecturewhisper serve` (production build), not dev server
- Run: `npx playwright test`

## Mobile (Jest + Kotlin)
- Jest for React Native components
- JUnit for Kotlin native modules
- Queue/upload logic must have unit tests

## General
- Every phase ends with all tests passing
- No mocking of the thing under test
- Test the contract (inputs/outputs), not the implementation
- Fixtures committed to `eval/` and `samples/` (synthetic only, < 1 MB each)
