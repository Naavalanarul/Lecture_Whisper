"""Speaker diarization interface and PyAnnote implementation."""

from __future__ import annotations

import gc
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from lecturewhisper.api.schemas import Transcript

logger = logging.getLogger(__name__)


@dataclass
class SpeakerTurn:
    """A single speaker turn segment."""

    speaker: str
    start: float
    end: float

    @property
    def duration(self) -> float:
        return self.end - self.start


class DiarizerProtocol(Protocol):
    """Abstract interface for speaker diarization engines."""

    def diarize(self, audio_path: Path | str) -> list[SpeakerTurn]:
        ...

    def unload(self) -> None:
        ...


class PyAnnoteDiarizer:
    """
    Speaker diarization using PyAnnote Community-1 model.
    
    IMPORTANT: On Apple Silicon, device is explicitly set to CPU because MPS
    triggers NotImplementedError on sparse tensor clustering ops.
    """

    def __init__(
        self,
        model_name: str = "pyannote/speaker-diarization-community-1",
        hf_token: str | None = None,
    ) -> None:
        self.model_name = model_name
        self.hf_token = hf_token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
        self._pipeline = None

    def _load(self) -> None:
        if self._pipeline is not None:
            return

        if not self.hf_token:
            logger.warning("No Hugging Face token found for PyAnnote; diarizer fallback will be used.")
            return

        try:
            import torch
            from pyannote.audio import Pipeline

            logger.info("Loading PyAnnote diarization pipeline: %s", self.model_name)
            self._pipeline = Pipeline.from_pretrained(
                self.model_name,
                token=self.hf_token,
            )
            # Must run on CPU on Apple Silicon to prevent SparseMPS crashes
            self._pipeline.to(torch.device("cpu"))
            logger.info("PyAnnote loaded on CPU")
        except Exception as e:
            logger.warning("Failed to load PyAnnote pipeline: %s. Using fallback.", e)
            self._pipeline = None

    def diarize(self, audio_path: Path | str) -> list[SpeakerTurn]:
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")

        self._load()

        if self._pipeline is None:
            return MockDiarizer().diarize(path)

        logger.info("Running PyAnnote diarization on %s", path)
        diarization = self._pipeline(str(path))

        turns: list[SpeakerTurn] = []
        for turn, speaker in diarization.itertracks(yield_label=True):
            turns.append(
                SpeakerTurn(
                    speaker=str(speaker),
                    start=round(float(turn.start), 2),
                    end=round(float(turn.end), 2),
                )
            )

        logger.info("Diarization produced %d speaker turns", len(turns))
        return turns

    def unload(self) -> None:
        if self._pipeline is not None:
            del self._pipeline
            self._pipeline = None
            gc.collect()
            logger.info("PyAnnote diarizer unloaded from memory")


class MockDiarizer:
    """Mock diarizer for offline development and automated testing."""

    def diarize(self, audio_path: Path | str) -> list[SpeakerTurn]:
        logger.info("Running MockDiarizer on %s", audio_path)
        return [
            SpeakerTurn(speaker="SPEAKER_00", start=0.0, end=3600.0),
        ]

    def unload(self) -> None:
        pass


def align_speakers_to_transcript(
    transcript: Transcript,
    turns: list[SpeakerTurn],
) -> Transcript:
    """
    Align diarization speaker turns with transcript segments.
    Assigns each segment the speaker with the largest temporal overlap.
    """
    if not turns:
        return transcript

    for seg in transcript.segments:
        best_speaker = seg.speaker
        max_overlap = 0.0

        for turn in turns:
            # Overlap between [seg.start, seg.end] and [turn.start, turn.end]
            overlap_start = max(seg.start, turn.start)
            overlap_end = min(seg.end, turn.end)
            overlap = max(0.0, overlap_end - overlap_start)

            if overlap > max_overlap:
                max_overlap = overlap
                best_speaker = turn.speaker

        seg.speaker = best_speaker

    return transcript
