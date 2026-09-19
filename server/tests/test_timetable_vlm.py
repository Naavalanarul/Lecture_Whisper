"""Tests for Phase 7 timetable image parsing."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from lecturewhisper.api.schemas import Timetable
from lecturewhisper.pipeline.timetable import TimetableImageParser


def test_timetable_parser_mock(tmp_path: Path) -> None:
    """TimetableImageParser should extract timetable slots from an image."""
    fake_img = tmp_path / "timetable.png"
    fake_img.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)

    parser = TimetableImageParser()
    result = parser.parse_image(fake_img)

    assert isinstance(result, Timetable)
    assert len(result.slots) >= 1
    assert result.confirmed_by_user is False  # UI confirmation required

    first = result.slots[0]
    assert first.weekday in range(7)
    assert first.subject
    assert first.start
    assert first.end


def test_timetable_parser_missing_file() -> None:
    """Should raise FileNotFoundError when image doesn't exist."""
    parser = TimetableImageParser()
    with pytest.raises(FileNotFoundError):
        parser.parse_image(Path("/nonexistent/path/schedule.png"))
