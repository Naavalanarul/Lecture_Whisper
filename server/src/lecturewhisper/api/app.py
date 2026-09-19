"""FastAPI application factory."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from lecturewhisper.api.jobs import job_queue

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent.parent.parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Start/stop background services and initialize database."""
    from lecturewhisper.store.database import get_default_engine

    # Ensure SQLite tables exist
    get_default_engine()

    await job_queue.start()
    logger.info("Lecture Whisper server started")
    yield
    await job_queue.stop()
    logger.info("Lecture Whisper server stopped")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Lecture Whisper",
        description="Fully local lecture notes system",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS — local network only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[
            "Location",
            "Upload-Offset",
            "Tus-Resumable",
            "Tus-Version",
            "Tus-Extension",
            "Tus-Max-Size",
            "Upload-Expires",
            "Upload-Length",
        ],
    )

    # Register routes
    from lecturewhisper.api.routes.health import router as health_router
    from lecturewhisper.api.routes.recordings import router as recordings_router
    from lecturewhisper.api.routes.job_routes import router as jobs_router
    from lecturewhisper.api.routes.timetable import router as timetable_router
    from lecturewhisper.api.routes.pairing import router as pairing_router
    from lecturewhisper.api.routes.upload import router as upload_router

    app.include_router(health_router, prefix="/api")
    app.include_router(recordings_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    app.include_router(timetable_router, prefix="/api")
    app.include_router(pairing_router, prefix="/api")
    app.include_router(upload_router, prefix="/api")

    # Serve built UI if available
    if STATIC_DIR.exists():
        app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
    else:
        logger.warning("Static UI directory not found at %s", STATIC_DIR)

    return app
