"""Notes generation using map-reduce over chapter chunks."""

from __future__ import annotations

import logging
from typing import Any

from lecturewhisper.api.schemas import ChapterNotes, Notes, Transcript
from lecturewhisper.llm.engine import LLMEngine
from lecturewhisper.llm.prompts import CHAPTER_NOTES_PROMPT, OVERALL_SUMMARY_PROMPT
from lecturewhisper.pipeline.chapters import ChapterSegmenter

logger = logging.getLogger(__name__)


class NotesGenerator:
    """Generates structured notes via map-reduce over chapter chunks."""

    def __init__(self, llm_engine: LLMEngine | None = None) -> None:
        self.llm = llm_engine or LLMEngine()
        self.segmenter = ChapterSegmenter(max_tokens_per_chapter=3500)

    def generate(self, transcript: Transcript) -> Notes:
        """Execute map-reduce notes generation."""
        if not transcript.segments:
            return Notes(chapters=[], overall_summary="No speech segments recorded.")

        chunks = self.segmenter.segment_transcript(transcript)
        chapters: list[ChapterNotes] = []

        # Map phase: Generate notes per chapter chunk
        for i, chunk in enumerate(chunks, 1):
            logger.info("Generating notes for chapter %d/%d (%.1fs - %.1fs)", i, len(chunks), chunk.start, chunk.end)
            prompt = CHAPTER_NOTES_PROMPT.format(
                transcript_chunk=chunk.text,
                start_s=chunk.start,
                end_s=chunk.end,
            )

            notes_obj, needs_review = self.llm.generate_structured(prompt, ChapterNotes)

            if notes_obj is not None:
                # Ensure timestamps match chunk boundaries
                notes_obj.start = chunk.start
                notes_obj.end = chunk.end
                chapters.append(notes_obj)
            else:
                # Fallback basic chapter note
                chapters.append(
                    ChapterNotes(
                        title=f"Chapter {i}: {chunk.text[:30]}...",
                        start=chunk.start,
                        end=chunk.end,
                        summary=chunk.text[:300],
                        key_points=["Auto-extracted chapter segment."],
                        definitions=[],
                        examples=[],
                        formulas=[],
                    )
                )

        # Reduce phase: Overall summary from chapter summaries
        chapter_summaries_text = "\n\n".join(
            f"Chapter {i} ({c.title}): {c.summary}"
            for i, c in enumerate(chapters, 1)
        )
        reduce_prompt = OVERALL_SUMMARY_PROMPT.format(
            chapter_summaries=chapter_summaries_text
        )
        overall_summary = self.llm.generate(reduce_prompt)

        return Notes(
            chapters=chapters,
            overall_summary=overall_summary,
        )
