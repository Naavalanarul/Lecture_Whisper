"""Lecture Whisper CLI — entrypoint for all commands."""

from __future__ import annotations

import sys

import click
from rich.console import Console

console = Console()


@click.group()
@click.version_option(package_name="lecturewhisper")
def cli() -> None:
    """Lecture Whisper — Fully local lecture notes system."""


@cli.command()
def doctor() -> None:
    """Run system diagnostics."""
    from lecturewhisper.doctor import run_doctor

    ok = run_doctor()
    sys.exit(0 if ok else 1)


@cli.command()
@click.option("--host", default="0.0.0.0", help="Bind address.")
@click.option("--port", default=8420, type=int, help="Port number.")
@click.option("--no-browser", is_flag=True, help="Don't open browser.")
def serve(host: str, port: int, no_browser: bool) -> None:
    """Start the Lecture Whisper server."""
    # Stub — implemented in Phase 1
    console.print(f"[bold]🎙️ Lecture Whisper server starting on {host}:{port}[/bold]")
    console.print("[yellow]Server not yet implemented — coming in Phase 1[/yellow]")


@cli.command()
@click.argument("audio", type=click.Path(exists=True))
def process(audio: str) -> None:
    """Process an audio file through the pipeline."""
    # Stub — implemented in Phase 2
    console.print(f"[yellow]Pipeline not yet implemented — coming in Phase 2[/yellow]")
    console.print(f"Audio file: {audio}")


@cli.command()
def pair() -> None:
    """Show pairing QR code for mobile app."""
    # Stub — implemented in Phase 5
    console.print("[yellow]Pairing not yet implemented — coming in Phase 5[/yellow]")


@cli.command("eval")
def eval_cmd() -> None:
    """Run evaluation harness."""
    # Stub — implemented in Phase 3/8
    console.print("[yellow]Evaluation not yet implemented — coming in Phase 3[/yellow]")


@cli.command()
def train() -> None:
    """Run fine-tuning pipeline."""
    # Stub — implemented in Phase 8
    console.print("[yellow]Training not yet implemented — coming in Phase 8[/yellow]")


@cli.command()
@click.argument("audio", type=click.Path(exists=True))
def bench(audio: str) -> None:
    """Benchmark pipeline stages on an audio file."""
    # Stub — implemented in Phase 2
    console.print(f"[yellow]Benchmarking not yet implemented — coming in Phase 2[/yellow]")
    console.print(f"Audio file: {audio}")


if __name__ == "__main__":
    cli()
