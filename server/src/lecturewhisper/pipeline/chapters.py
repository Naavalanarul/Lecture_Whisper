"""Chaptering and topic segmentation module for transcripts."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from lecturewhisper.api.schemas import ChapterNotes, Transcript, TranscriptSegment

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """A segment of text with start and end timestamps."""

    text: str
    start: float
    end: float


class ChapterSegmenter:
    """
    Segments transcripts into coherent chapters using semantic boundary detection
    or temporal windowing (<= ~3,500 tokens per chapter).
    """

    def __init__(self, max_tokens_per_chapter: int = 3500) -> None:
        self.max_tokens_per_chapter = max_tokens_per_chapter

    def segment_transcript(self, transcript: Transcript) -> list[TextChunk]:
        """
        Partition transcript segments into chapters respecting token budgets.
        Each token is roughly 4 characters or 0.75 words.
        """
        if not transcript.segments:
            return []

        chunks: list[TextChunk] = []
        current_texts: list[str] = []
        current_start: float = transcript.segments[0].start
        current_end: float = transcript.segments[0].end
        current_word_count: int = 0

        # ~2,500 words is ~3,300 tokens, safely within 3,500 token budget
        max_words = int(self.max_tokens_per_chapter * 0.75)

        for seg in transcript.segments:
            words_in_seg = len(seg.text.split())
            if current_word_count + words_in_seg > max_words and current_texts:
                chunks.append(
                    TextChunk(
                        text=" ".join(current_texts),
                        start=current_start,
                        end=current_end,
                    )
                )
                current_texts = [seg.text]
                current_start = seg.start
                current_end = seg.end
                current_word_count = words_in_seg
            else:
                current_texts.append(seg.text)
                current_end = seg.end
                current_word_count += words_in_seg

        if current_texts:
            chunks.append(
                TextChunk(
                    text=" ".join(current_texts),
                    start=current_start,
                    end=current_end,
                )
            )

        logger.info("Segmented transcript into %d chapter chunk(s)", len(chunks))
        return chunks
