"""Job status and SSE event routes."""

from __future__ import annotations

import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from lecturewhisper.api.jobs import job_queue

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
async def list_jobs() -> list[dict]:
    """List all jobs."""
    return [
        job.model_dump(mode="json") for job in job_queue._jobs.values()
    ]


@router.get("/{job_id}")
async def get_job(job_id: UUID) -> dict:
    """Get a specific job."""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.model_dump(mode="json")


@router.get("/events/stream")
async def job_events() -> EventSourceResponse:
    """SSE stream of all job progress events."""

    async def event_generator():  # type: ignore[no-untyped-def]
        queue = job_queue.subscribe()
        try:
            while True:
                progress = await queue.get()
                yield {
                    "event": "job_progress",
                    "data": json.dumps(progress.model_dump(mode="json"), default=str),
                }
        except asyncio.CancelledError:
            job_queue.unsubscribe(queue)
            raise

    return EventSourceResponse(event_generator())


@router.get("/{job_id}/events")
async def job_events_by_id(job_id: UUID) -> EventSourceResponse:
    """SSE stream for a specific job's progress events."""

    async def event_generator():  # type: ignore[no-untyped-def]
        queue = job_queue.subscribe()
        try:
            while True:
                progress = await queue.get()
                if progress.job_id == job_id:
                    yield {
                        "event": "job_progress",
                        "data": json.dumps(
                            progress.model_dump(mode="json"), default=str
                        ),
                    }
                    if progress.status in ("completed", "failed"):
                        break
        except asyncio.CancelledError:
            job_queue.unsubscribe(queue)
            raise

    return EventSourceResponse(event_generator())
