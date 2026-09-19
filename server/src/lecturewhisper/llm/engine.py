"""LLM inference engine using MLX-LM with JSON schema validation and retry logic."""

from __future__ import annotations

import gc
import json
import logging
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from lecturewhisper.config import get_settings
from lecturewhisper.llm.prompts import RETRY_CORRECTION_PROMPT

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMEngine:
    """MLX-LM inference engine with structured JSON validation and memory unloading."""

    def __init__(self, model_name: str | None = None) -> None:
        settings = get_settings()
        self.model_name = model_name or settings.llm.model
        self.max_tokens = settings.llm.max_tokens
        self.temperature = settings.llm.temperature
        self._model: Any = None
        self._tokenizer: Any = None
        self._mlx_lm: Any = None

    def _load(self) -> None:
        if self._model is not None:
            return
        try:
            import mlx_lm

            self._mlx_lm = mlx_lm
            logger.info("Loading MLX-LM model %s on Apple Silicon Metal GPU", self.model_name)
            self._model, self._tokenizer = mlx_lm.load(self.model_name)
            logger.info("MLX-LM model loaded successfully")
        except Exception as e:
            logger.warning("mlx_lm not available or failed to load: %s. Using mock fallback.", e)
            self._model = None
            self._tokenizer = None

    def generate(self, prompt: str, max_tokens: int | None = None) -> str:
        """Raw text generation."""
        self._load()
        if self._model is None or self._tokenizer is None:
            return self._mock_generate(prompt)

        tokens = max_tokens or self.max_tokens
        messages = [{"role": "user", "content": prompt}]
        formatted = self._tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        response = self._mlx_lm.generate(
            self._model,
            self._tokenizer,
            prompt=formatted,
            max_tokens=tokens,
            temp=self.temperature,
        )
        return response.strip()

    def generate_structured(
        self,
        prompt: str,
        schema_cls: type[T],
        max_tokens: int | None = None,
    ) -> tuple[T | None, bool]:
        """
        Generate structured output validated against a Pydantic model.
        Returns: (parsed_instance, needs_review: bool)
        
        If validation fails, retries once with validation error message.
        If it fails again, returns (None or fallback, needs_review=True).
        """
        raw = self.generate(prompt, max_tokens=max_tokens)
        cleaned = self._extract_json_string(raw)

        # First attempt
        try:
            instance = schema_cls.model_validate_json(cleaned)
            return instance, False
        except ValidationError as err1:
            logger.warning("LLM JSON schema validation failed on attempt 1: %s. Retrying...", err1)

            # Retry with error prompt
            retry_prompt = RETRY_CORRECTION_PROMPT.format(
                error_message=str(err1),
                previous_response=cleaned[:500],
            )
            raw_retry = self.generate(retry_prompt, max_tokens=max_tokens)
            cleaned_retry = self._extract_json_string(raw_retry)

            try:
                instance = schema_cls.model_validate_json(cleaned_retry)
                return instance, False
            except ValidationError as err2:
                logger.error("LLM JSON validation failed on attempt 2: %s", err2)
                return None, True

    @staticmethod
    def _extract_json_string(text: str) -> str:
        """Extract JSON object from markdown fenced blocks or raw output."""
        text = text.strip()
        # Remove ```json ... ```
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Find first { and last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]

        return text

    def _mock_generate(self, prompt: str) -> str:
        """Mock responses for testing and offline environments."""
        logger.info("Using mock LLM generation")
        if "overall" in prompt.lower() or "summaries" in prompt.lower():
            return "This lecture covered the foundational concepts of dynamic programming, contrast with greedy approaches, and time complexity bounds."

        # Return sample ChapterNotes JSON
        return json.dumps({
            "title": "Introduction to Dynamic Programming",
            "start": 0.0,
            "end": 82.0,
            "summary": "The instructor introduced the fundamental principles of dynamic programming, emphasizing overlapping subproblems and optimal substructure. Key recursive formulations and memoization techniques were demonstrated.",
            "key_points": [
                "Dynamic programming avoids redundant computations through memoization.",
                "Requires optimal substructure and overlapping subproblems.",
                "Pop quiz and homework deadline announced."
            ],
            "definitions": [
                "Optimal Substructure: An optimal solution to a problem contains optimal solutions to its subproblems."
            ],
            "examples": [
                "Memoized Fibonacci sequence calculation."
            ],
            "formulas": [
                "F(n) = F(n-1) + F(n-2) with F(0)=0, F(1)=1"
            ]
        })

    def unload(self) -> None:
        """Unload LLM model and tokenizer to free unified memory."""
        if self._model is not None:
            del self._model
            del self._tokenizer
            self._model = None
            self._tokenizer = None
            gc.collect()
            logger.info("MLX-LM model unloaded from memory")
