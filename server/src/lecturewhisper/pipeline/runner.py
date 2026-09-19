"""Sequential pipeline runner with memory management and progress reporting."""

from __future__ import annotations

import gc
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from lecturewhisper.api.schemas import SpeakerStats, Transcript
from lecturewhisper.pipeline.audio import get_audio_duration, normalize_to_wav
from lecturewhisper.pipeline.asr import MLXWhisperASR
from lecturewhisper.pipeline.diarize import PyAnnoteDiarizer, align_speakers_to_transcript
from lecturewhisper.pipeline.speakers import SpeakerAnalyzer
from lecturewhisper.pipeline.vad import SileroVAD

logger = logging.getLogger(__name__)


@dataclass
class PipelineProgress:
    """Progress report from a pipeline stage."""

    stage: str
    progress: float
    message: str


@dataclass
class PipelineResult:
    """Full output of Phase 2 offline pipeline."""

    audio_path: Path
    duration_s: float
    transcript: Transcript
    speaker_stats: SpeakerStats
    timings: dict[str, float]  # stage -> duration in seconds


class PipelineRunner:
    """
    Executes heavy ML pipeline stages strictly sequentially:
    Normalize -> VAD -> ASR -> Diarize -> Speaker Stats.
    
    Each model is loaded on-demand and immediately unloaded to stay within unified memory.
    """

    def __init__(self, asr_model: str | None = None) -> None:
        self.asr_model = asr_model

    def process(
        self,
        audio_path: Path | str,
        progress_cb: Callable[[PipelineProgress], None] | None = None,
        language: str = "en",
    ) -> PipelineResult:
        """Run the full offline audio pipeline on an audio file."""
        src = Path(audio_path)
        if not src.exists():
            raise FileNotFoundError(f"Audio file not found: {src}")

        timings: dict[str, float] = {}

        def report(stage: str, prog: float, msg: str) -> None:
            logger.info("[%s - %.0f%%] %s", stage, prog * 100, msg)
            if progress_cb:
                progress_cb(PipelineProgress(stage=stage, progress=prog, message=msg))

        # 1. Normalization
        report("normalizing", 0.05, "Converting audio to 16kHz mono WAV via ffmpeg")
        t0 = time.perf_counter()
        duration_s = get_audio_duration(src)
        wav_path = normalize_to_wav(src)
        timings["normalize"] = round(time.perf_counter() - t0, 3)

        # 2. Voice Activity Detection (VAD)
        report("vad", 0.20, "Running Silero Voice Activity Detection")
        t0 = time.perf_counter()
        vad = SileroVAD()
        try:
            vad_segments = vad.detect_speech(wav_path)
        finally:
            vad.unload()
            gc.collect()
        timings["vad"] = round(time.perf_counter() - t0, 3)

        # 3. Speech Recognition (ASR)
        report("asr", 0.45, "Running MLX Whisper speech-to-text")
        t0 = time.perf_counter()
        asr = MLXWhisperASR(model_name=self.asr_model)
        try:
            transcript = asr.transcribe(wav_path, language=language, word_timestamps=True)
        finally:
            asr.unload()
            gc.collect()
        timings["asr"] = round(time.perf_counter() - t0, 3)

        # 4. Speaker Diarization
        report("diarization", 0.75, "Running speaker diarization on CPU")
        t0 = time.perf_counter()
        diarizer = PyAnnoteDiarizer()
        try:
            turns = diarizer.diarize(wav_path)
            transcript = align_speakers_to_transcript(transcript, turns)
        finally:
            diarizer.unload()
            gc.collect()
        timings["diarize"] = round(time.perf_counter() - t0, 3)

        # 5. Main Speaker Identification
        report("speaker_stats", 0.90, "Identifying main lecturer and computing talk-times")
        t0 = time.perf_counter()
        speaker_stats = SpeakerAnalyzer.identify_lecturer(
            transcript=transcript,
            turns=turns,
            audio_path=wav_path,
        )
        timings["speaker_stats"] = round(time.perf_counter() - t0, 3)

        report("completed", 1.0, "Audio pipeline processing complete")

        return PipelineResult(
            audio_path=src,
            duration_s=duration_s,
            transcript=transcript,
            speaker_stats=speaker_stats,
            timings=timings,
        )
