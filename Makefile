# Lecture Whisper Development and Test Suite Makefile
.PHONY: help testsuite test test-eval farfield-sim apk clean

help:
	@echo "Lecture Whisper Master Makefile"
	@echo "Usage:"
	@echo "  make testsuite      Run comprehensive real-recording evaluation suite (ASR + Discovery)"
	@echo "  make test           Run all pytest unit and integration tests"
	@echo "  make test-eval      Run transcript parsing, ASR eval, and simulation unit tests"
	@echo "  make farfield-sim   Run acoustic classroom degradation simulation (mild, moderate, high)"
	@echo "  make apk            Compile, align, and sign Android release APK with ADB hook"

test:
	uv run --project server pytest

test-eval:
	uv run --project server pytest server/tests/test_transcript_parsers.py server/tests/test_asr_eval.py server/tests/test_discovery.py server/tests/test_simulation.py

testsuite:
	uv run --project server python scripts/run_eval_suite.py
	uv run --project server lecturewhisper eval announcements data/transcripts --output review

farfield-sim:
	uv run --project server python scripts/farfield_run.py --sim-only --audio data/normalized/wav/mit_6006_farfield_slice.wav --transcript data/transcripts/mit_6006_farfield_slice.json

apk:
	cd mobile && ./build_release_apk.sh
