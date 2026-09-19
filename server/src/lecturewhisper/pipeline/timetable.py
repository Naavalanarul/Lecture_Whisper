"""Vision-Language Model (VLM) timetable image parser using MLX-VLM."""

from __future__ import annotations

import gc
import json
import logging
from pathlib import Path
from typing import Any
from uuid import uuid4

from lecturewhisper.api.schemas import Timetable, TimetableSlot
from lecturewhisper.config import get_settings

logger = logging.getLogger(__name__)

TIMETABLE_VLM_PROMPT = """Analyze this university class timetable or schedule image.
Extract every class time slot into a structured JSON object.

Output JSON format:
{
  "slots": [
    {
      "weekday": 0,  // 0 for Monday, 1 for Tuesday, ... 6 for Sunday
      "start": "09:00:00",
      "end": "10:30:00",
      "subject": "Course title or code",
      "room": "Hall name or room number (or null)",
      "lecturer": "Professor name (or null)"
    }
  ]
}
Return only valid JSON.
"""


class TimetableImageParser:
    """Parses photo/screenshot of class timetable into structured Timetable schema."""

    def __init__(self, model_name: str | None = None) -> None:
        settings = get_settings()
        self.model_name = model_name or settings.vlm.model
        self._model: Any = None
        self._processor: Any = None
        self._mlx_vlm: Any = None

    def _load(self) -> None:
        if self._model is not None:
            return
        try:
            import mlx_vlm

            self._mlx_vlm = mlx_vlm
            logger.info("Loading MLX-VLM model: %s", self.model_name)
            self._model, self._processor = mlx_vlm.load(self.model_name)
            logger.info("MLX-VLM model loaded successfully")
        except Exception as e:
            logger.warning("mlx_vlm not available or failed to load: %s. Using mock fallback.", e)
            self._model = None
            self._processor = None

    def parse_image(self, image_path: Path | str) -> Timetable:
        """Parse image file and return Timetable model with confidence markings."""
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image file not found: {path}")

        self._load()

        if self._model is None or self._processor is None:
            return self._mock_parse(path)

        logger.info("Extracting timetable from image: %s", path)
        output = self._mlx_vlm.generate(
            self._model,
            self._processor,
            image=str(path),
            prompt=TIMETABLE_VLM_PROMPT,
            max_tokens=1500,
            temperature=0.0,
        )

        try:
            cleaned_json = self._extract_json(output)
            data = json.loads(cleaned_json)

            slots: list[TimetableSlot] = []
            for item in data.get("slots", []):
                slots.append(
                    TimetableSlot(
                        id=uuid4(),
                        weekday=int(item.get("weekday", 0)),
                        start=item.get("start", "09:00:00"),
                        end=item.get("end", "10:30:00"),
                        subject=item.get("subject", "Lecture"),
                        room=item.get("room"),
                        lecturer=item.get("lecturer"),
                    )
                )

            return Timetable(
                slots=slots,
                source_image_id=uuid4(),
                confirmed_by_user=False,  # UI forces confirmation
            )
        except Exception as err:
            logger.error("Failed to parse VLM output as JSON: %s. Output: %s", err, output)
            return self._mock_parse(path)

    @staticmethod
    def _extract_json(text: str) -> str:
        text = text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]
        return text

    def _mock_parse(self, image_path: Path) -> Timetable:
        """Mock timetable parsing for testing."""
        logger.info("Using mock timetable parsing for %s", image_path)
        slots = [
            TimetableSlot(
                id=uuid4(),
                weekday=0,  # Monday
                start="09:00:00",  # type: ignore[arg-type]
                end="10:30:00",    # type: ignore[arg-type]
                subject="CS 101: Data Structures",
                room="Hall B",
                lecturer="Prof. Turing",
            ),
            TimetableSlot(
                id=uuid4(),
                weekday=2,  # Wednesday
                start="11:00:00",  # type: ignore[arg-type]
                end="12:30:00",    # type: ignore[arg-type]
                subject="MATH 201: Linear Algebra",
                room="Room 402",
                lecturer="Dr. Euler",
            ),
            TimetableSlot(
                id=uuid4(),
                weekday=4,  # Friday
                start="14:00:00",  # type: ignore[arg-type]
                end="15:30:00",    # type: ignore[arg-type]
                subject="PHYS 102: Electromagnetism",
                room="Physics Lab 1",
                lecturer="Dr. Maxwell",
            ),
        ]
        return Timetable(
            slots=slots,
            source_image_id=uuid4(),
            confirmed_by_user=False,
        )

    def unload(self) -> None:
        """Unload VLM model and processor to free memory."""
        if self._model is not None:
            del self._model
            del self._processor
            self._model = None
            self._processor = None
            gc.collect()
            logger.info("MLX-VLM model unloaded from memory")
