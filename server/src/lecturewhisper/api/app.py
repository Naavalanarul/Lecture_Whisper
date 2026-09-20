"""FastAPI application factory."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from lecturewhisper.api.jobs import job_queue

logger = logging.getLogger(__name__)


def get_static_dir() -> Path | None:
    """Find the static UI directory across package, repo, and user data locations."""
    candidates = [
        # 1. Local development checkout: server/static
        Path(__file__).parent.parent.parent.parent / "static",
        # 2. User data directory: ~/.lecturewhisper/static
        Path.home() / ".lecturewhisper" / "static",
        # 3. Package directory (when installed as a package/wheel)
        Path(__file__).parent.parent / "static",
    ]
    for c in candidates:
        if c.exists() and (c / "index.html").exists():
            return c
    return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Start/stop background services and initialize database."""
    from lecturewhisper.store.database import get_default_engine
    from lecturewhisper.demo import should_seed_demo, seed_demo_data
    from sqlmodel import Session

    # Ensure SQLite tables exist
    engine = get_default_engine()
    if should_seed_demo():
        with Session(engine) as session:
            seed_demo_data(session)

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
    app.include_router(health_router)
    app.include_router(recordings_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    app.include_router(timetable_router, prefix="/api")
    app.include_router(pairing_router, prefix="/api")
    app.include_router(upload_router, prefix="/api")

    # Serve built UI if available
    static_dir = get_static_dir()
    if static_dir:
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
    else:
        logger.warning("Static UI directory not found (searched package, repo, and ~/.lecturewhisper/static)")

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Exception) -> Response:
        """Fallback to index.html for Single Page Application routing."""
        if request.url.path.startswith("/api"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        discovered_dir = get_static_dir()
        if discovered_dir and (discovered_dir / "index.html").exists():
            return FileResponse(discovered_dir / "index.html")
        return PlainTextResponse("Not Found", status_code=404)

    return app
