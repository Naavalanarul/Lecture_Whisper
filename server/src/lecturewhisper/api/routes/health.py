"""Health check and system diagnostics endpoint."""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    """Health check."""
    return {"status": "ok", "service": "lecturewhisper"}


@router.get("/system/mode")
async def system_mode() -> dict[str, Any]:
    """Report whether server is running in seeded demo mode or production capture mode."""
    return {
        "demo_mode": os.environ.get("DEMO_MODE") == "1",
        "service": "lecturewhisper",
        "version": "1.0.0",
    }

