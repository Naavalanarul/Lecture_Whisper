"""Prompt templates for LLM chapter notes and summary generation."""

from __future__ import annotations

CHAPTER_NOTES_PROMPT = """You are an expert academic lecture assistant.
Analyze the following lecture transcript chapter and produce comprehensive, structured study notes.

Chapter Transcript:
{transcript_chunk}

Respond with a JSON object matching this exact schema:
{{
  "title": "Clear, informative title for this topic",
  "start": {start_s},
  "end": {end_s},
  "summary": "Detailed, coherent summary of the main concept explained (3-5 sentences)",
  "key_points": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3"
  ],
  "definitions": [
    "Term: exact definition from lecture",
    "Concept: explanation provided by lecturer"
  ],
  "examples": [
    "Concrete example or problem walked through in lecture"
  ],
  "formulas": [
    "Mathematical formula, equation, or theorem stated (e.g. LaTeX format $E = mc^2$ or code)"
  ]
}}
Only return valid JSON. Do not include markdown code block syntax or explanations outside the JSON.
"""

OVERALL_SUMMARY_PROMPT = """You are an expert academic lecture assistant.
Given the summaries of each chapter in a university lecture, write a concise, high-level overall summary
of the entire lecture (2-4 paragraphs) suitable for exam review.

Chapter Summaries:
{chapter_summaries}

Overall Lecture Summary:
"""

RETRY_CORRECTION_PROMPT = """Your previous JSON response failed schema validation with the following error:
{error_message}

Please fix the error and return a strictly valid JSON object conforming to the schema.
Previous response:
{previous_response}
"""
