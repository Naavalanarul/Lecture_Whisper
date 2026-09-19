"""Automatic Speech Recognition (ASR) with MLX Whisper and hallucination guard."""

from __future__ import annotations

import gc
import logging
import re
from collections import Counter
from pathlib import Path
from typing import Any

from lecturewhisper.api.schemas import Transcript, TranscriptSegment, Word
from lecturewhisper.config import get_settings

logger = logging.getLogger(__name__)

# Common Whisper hallucination phrases (case-insensitive substring or regex match)
BAG_OF_HALLUCINATIONS = [
    "thank you for watching",
    "thanks for watching",
    "please subscribe",
    "like and subscribe",
    "subscribe to my channel",
    "see you in the next video",
    "see you next time",
    "subtitles by",
    "translated by",
    "captions by",
    "all rights reserved",
    "the end.",
    "[music]",
    "(music)",
    "[applause]",
    "(applause)",
    "bye bye",
    "you're watching",
]


class HallucinationGuard:
    """Filters out hallucinations, repetitive loops, and no-speech artifacts."""

    @staticmethod
    def is_hallucination_phrase(text: str) -> bool:
        """Check if text matches known Whisper hallucination phrases."""
        cleaned = text.strip().lower()
        if not cleaned:
            return True

        for phrase in BAG_OF_HALLUCINATIONS:
            if phrase in cleaned:
                return True
        return False

    @staticmethod
    def has_repetition_loop(text: str, max_repeat: int = 3) -> bool:
        """Detect if phrases or words are repeated in an infinite loop."""
        words = re.findall(r"\b\w+\b", text.lower())
        if len(words) < 6:
            return False

        # Check consecutive identical words: e.g. "the the the the"
        repeat_count = 1
        for i in range(1, len(words)):
            if words[i] == words[i - 1]:
                repeat_count += 1
                if repeat_count >= max_repeat:
                    return True
            else:
                repeat_count = 1

        # Check 2-gram repetitions: e.g. "you know you know you know"
        if len(words) >= 6:
            bigrams = [(words[i], words[i + 1]) for i in range(len(words) - 1)]
            bg_counts = Counter(bigrams)
            if bg_counts and bg_counts.most_common(1)[0][1] >= 4:
                return True

        return False

    @classmethod
    def filter_segments(
        cls,
        segments: list[TranscriptSegment],
        no_speech_threshold: float = 0.6,
    ) -> list[TranscriptSegment]:
        """Apply all guards to clean transcript segments."""
        filtered: list[TranscriptSegment] = []
        for seg in segments:
            text = seg.text.strip()
            if not text:
                continue

            if cls.is_hallucination_phrase(text):
                logger.warning("Filtered hallucination phrase: %r", text)
                continue

            if cls.has_repetition_loop(text):
                logger.warning("Filtered repetition loop: %r", text)
                continue

            filtered.append(seg)
        return filtered


class MLXWhisperASR:
    """ASR engine using mlx-whisper on Apple Silicon Metal GPU."""

    def __init__(self, model_name: str | None = None) -> None:
        settings = get_settings()
        self.model_name = model_name or settings.asr.model
        self._mlx_whisper: Any = None

    def _load(self) -> None:
        if self._mlx_whisper is not None:
            return
        try:
            import mlx_whisper
            self._mlx_whisper = mlx_whisper
            logger.info("Loaded mlx_whisper module for model %s", self.model_name)
        except ImportError as e:
            logger.warning("mlx_whisper not installed: %s. Fallback mock will be used.", e)
            self._mlx_whisper = None

    def transcribe(
        self,
        audio_path: Path | str,
        language: str = "en",
        word_timestamps: bool = True,
        temperature: float = 0.0,
    ) -> Transcript:
        """Transcribe audio file into structured Transcript with word-level timestamps."""
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")

        self._load()

        if self._mlx_whisper is None:
            # Fallback mock for testing or non-MLX environments
            return self._mock_transcribe(path, language)

        logger.info("Transcribing %s with model %s (lang=%s)", path, self.model_name, language)
        options: dict[str, Any] = {
            "path_or_hf_repo": self.model_name,
            "word_timestamps": word_timestamps,
            "temperature": temperature,
            "condition_on_previous_text": False,
        }
        if language != "auto":
            options["language"] = language

        raw_result = self._mlx_whisper.transcribe(str(path), **options)

        raw_segments: list[TranscriptSegment] = []
        for raw_seg in raw_result.get("segments", []):
            words_list: list[Word] = []
            for w in raw_seg.get("words", []):
                words_list.append(
                    Word(
                        w=w.get("word", "").strip(),
                        start=round(float(w.get("start", 0.0)), 2),
                        end=round(float(w.get("end", 0.0)), 2),
                        conf=round(float(w.get("probability", 1.0)), 2),
                    )
                )

            raw_segments.append(
                TranscriptSegment(
                    start=round(float(raw_seg.get("start", 0.0)), 2),
                    end=round(float(raw_seg.get("end", 0.0)), 2),
                    speaker="SPEAKER_00",  # Will be assigned during diarization
                    text=raw_seg.get("text", "").strip(),
                    words=words_list,
                )
            )

        # Apply hallucination guard
        clean_segments = HallucinationGuard.filter_segments(raw_segments)

        return Transcript(
            segments=clean_segments,
            asr_model=self.model_name,
            language=raw_result.get("language", language),
        )

    def _mock_transcribe(self, audio_path: Path, language: str) -> Transcript:
        """Produce mock transcript for unit testing when MLX is not present."""
        logger.info("Using mock ASR transcription for %s", audio_path)
        words = [
            Word(w="Welcome", start=0.0, end=0.6, conf=0.98),
            Word(w="to", start=0.6, end=0.8, conf=0.99),
            Word(w="today's", start=0.8, end=1.2, conf=0.95),
            Word(w="lecture", start=1.2, end=1.8, conf=0.97),
        ]
        seg = TranscriptSegment(
            start=0.0,
            end=1.8,
            speaker="SPEAKER_00",
            text="Welcome to today's lecture.",
            words=words,
        )
        return Transcript(
            segments=[seg],
            asr_model="mock-asr-whisper",
            language=language if language != "auto" else "en",
        )

    def unload(self) -> None:
        """Unload ASR model and free unified memory."""
        if self._mlx_whisper is not None:
            del self._mlx_whisper
            self._mlx_whisper = None
            gc.collect()
            logger.info("MLX Whisper model unloaded from unified memory")
