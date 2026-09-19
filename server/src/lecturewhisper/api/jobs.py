"""Job queue — single-worker sequential processing."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class JobState(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobProgress(BaseModel):
    """Progress update for a job."""

    job_id: UUID
    recording_id: UUID
    status: JobState
    stage: str | None = None
    progress: float = 0.0
    error: str | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Job(BaseModel):
    """A processing job in the queue."""

    id: UUID = Field(default_factory=uuid4)
    recording_id: UUID
    status: JobState = JobState.PENDING
    stage: str | None = None
    progress: float = 0.0
    error: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def to_progress(self) -> JobProgress:
        return JobProgress(
            job_id=self.id,
            recording_id=self.recording_id,
            status=self.status,
            stage=self.stage,
            progress=self.progress,
            error=self.error,
            updated_at=self.updated_at,
        )


# Type for SSE broadcast callback
ProgressCallback = Callable[[JobProgress], None]


class JobQueue:
    """Single-worker sequential job queue with SSE progress broadcasting."""

    def __init__(self) -> None:
        self._queue: asyncio.Queue[Job] | None = None
        self._jobs: dict[UUID, Job] = {}
        self._listeners: list[asyncio.Queue[JobProgress]] = []
        self._worker_task: asyncio.Task[None] | None = None
        self._processor: Callable[[Job, ProgressCallback], None] | None = None

    @property
    def queue(self) -> asyncio.Queue[Job]:
        """Get or lazily initialize the queue on the current event loop."""
        if self._queue is None:
            self._queue = asyncio.Queue()
        return self._queue

    def set_processor(
        self, processor: Callable[[Job, ProgressCallback], None]
    ) -> None:
        """Set the function that processes jobs."""
        self._processor = processor

    async def start(self) -> None:
        """Start the worker bound to the active loop."""
        self._queue = asyncio.Queue()
        self._listeners.clear()
        self._worker_task = asyncio.create_task(self._worker())
        logger.info("Job queue worker started")

    async def stop(self) -> None:
        """Stop the worker."""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except (asyncio.CancelledError, Exception):
                pass
            self._worker_task = None
        self._queue = None
        logger.info("Job queue worker stopped")

    async def submit(self, recording_id: UUID) -> Job:
        """Submit a new job for processing."""
        job = Job(recording_id=recording_id)
        self._jobs[job.id] = job
        await self.queue.put(job)
        await self._broadcast(job.to_progress())
        logger.info("Job %s submitted for recording %s", job.id, recording_id)
        return job

    def get_job(self, job_id: UUID) -> Job | None:
        """Get a job by ID."""
        return self._jobs.get(job_id)

    def get_jobs_for_recording(self, recording_id: UUID) -> list[Job]:
        """Get all jobs for a recording."""
        return [j for j in self._jobs.values() if j.recording_id == recording_id]

    def subscribe(self) -> asyncio.Queue[JobProgress]:
        """Subscribe to job progress events. Returns a queue to read from."""
        q: asyncio.Queue[JobProgress] = asyncio.Queue()
        self._listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[JobProgress]) -> None:
        """Unsubscribe from job progress events."""
        if q in self._listeners:
            self._listeners.remove(q)

    async def _broadcast(self, progress: JobProgress) -> None:
        """Broadcast progress to all listeners."""
        for listener in self._listeners:
            try:
                listener.put_nowait(progress)
            except asyncio.QueueFull:
                pass  # Drop if listener is backed up

    async def _update_job(
        self,
        job: Job,
        *,
        status: JobState | None = None,
        stage: str | None = None,
        progress: float | None = None,
        error: str | None = None,
    ) -> None:
        """Update job state and broadcast."""
        if status is not None:
            job.status = status
        if stage is not None:
            job.stage = stage
        if progress is not None:
            job.progress = progress
        if error is not None:
            job.error = error
        job.updated_at = datetime.now(UTC)
        await self._broadcast(job.to_progress())

    async def _worker(self) -> None:
        """Process jobs sequentially."""
        while True:
            if self._queue is None:
                break
            try:
                job = await self._queue.get()
            except asyncio.CancelledError:
                break

            logger.info("Processing job %s", job.id)
            await self._update_job(job, status=JobState.PROCESSING, stage="starting")

            if self._processor is None:
                await self._update_job(
                    job, status=JobState.FAILED, error="No processor configured"
                )
                continue

            try:

                def progress_cb(p: JobProgress) -> None:
                    """Sync callback for pipeline stages to report progress."""
                    job.stage = p.stage
                    job.progress = p.progress
                    job.updated_at = datetime.now(UTC)

                # Run processor in thread to not block the event loop
                await asyncio.to_thread(self._processor, job, progress_cb)
                await self._update_job(
                    job, status=JobState.COMPLETED, progress=1.0, stage="done"
                )
                logger.info("Job %s completed", job.id)
            except Exception as exc:
                logger.exception("Job %s failed", job.id)
                await self._update_job(
                    job, status=JobState.FAILED, error=str(exc)
                )


# Global singleton
job_queue = JobQueue()
