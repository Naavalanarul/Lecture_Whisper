"""Human correction loop converting user dashboard edits into gold fine-tuning data."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlmodel import Session, select

from lecturewhisper.store.models import CorrectionRow

logger = logging.getLogger(__name__)


def record_correction(
    db: Session,
    recording_id: UUID,
    field: str,
    original_value: str,
    corrected_value: str,
) -> CorrectionRow:
    """Save an edit made by the user to the SQLite store."""
    corr = CorrectionRow(
        recording_id=recording_id,
        field=field,
        original_value=original_value,
        corrected_value=corrected_value,
    )
    db.add(corr)
    db.commit()
    db.refresh(corr)
    logger.info("Recorded correction for recording %s (field=%s)", recording_id, field)
    return corr


def export_corrections_as_training_pairs(db: Session) -> list[dict[str, str]]:
    """Convert all user corrections in the database into (prompt, completion) pairs."""
    corrections = db.exec(select(CorrectionRow)).all()
    pairs: list[dict[str, str]] = []

    for c in corrections:
        pairs.append({
            "prompt": f"Correct this {c.field}: {c.original_value}",
            "completion": c.corrected_value,
        })

    logger.info("Exported %d human correction pairs from database", len(pairs))
    return pairs
