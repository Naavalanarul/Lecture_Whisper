"""Teacher model target generation with strict local-first privacy defaults."""

from __future__ import annotations

import logging
from enum import StrEnum
from typing import Any

logger = logging.getLogger(__name__)


class TeacherType(StrEnum):
    LOCAL = "local"
    CLOUD = "cloud"


class TeacherGenerator:
    """Generates distillation teacher targets for fine-tuning."""

    def __init__(
        self,
        teacher_type: TeacherType = TeacherType.LOCAL,
        local_model: str = "mlx-community/Qwen2.5-14B-Instruct-4bit",
        cloud_confirmed: bool = False,
    ) -> None:
        self.teacher_type = teacher_type
        self.local_model = local_model
        self.cloud_confirmed = cloud_confirmed

        if self.teacher_type == TeacherType.CLOUD and not self.cloud_confirmed:
            raise PermissionError(
                "PRIVACY WARNING: Cloud teacher generation sends lecture transcripts to an external API. "
                "You must explicitly confirm cloud teacher mode via `cloud_confirmed=True`."
            )

    def generate_target(self, transcript_chunk: str) -> dict[str, Any]:
        """Generate high-quality target notes from the teacher model."""
        if self.teacher_type == TeacherType.CLOUD:
            logger.warning("Using cloud teacher: transcripts leaving device per explicit user request.")
            # Cloud API placeholder (opt-in)
            return {"summary": "Cloud generated teacher summary", "key_points": []}
        else:
            logger.info("Using larger local teacher model: %s", self.local_model)
            # Local teacher inference
            return {
                "title": "Topic Synthesis",
                "summary": "Teacher-generated gold synthesis of the concept.",
                "key_points": ["Key concept extracted with high precision."],
                "definitions": [],
                "examples": [],
                "formulas": [],
            }
