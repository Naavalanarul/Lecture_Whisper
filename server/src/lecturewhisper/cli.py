"""Lecture Whisper CLI — entrypoint for all commands."""

from __future__ import annotations

import logging
import sys
import webbrowser

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
@click.option("--host", default=None, help="Bind address.")
@click.option("--port", default=None, type=int, help="Port number.")
@click.option("--no-browser", is_flag=True, help="Don't open browser.")
def serve(host: str | None, port: int | None, no_browser: bool) -> None:
    """Start the Lecture Whisper server."""
    import uvicorn

    from lecturewhisper.config import ensure_data_dirs, get_settings

    settings = get_settings()
    ensure_data_dirs(settings)

    bind_host = host or settings.server.host
    bind_port = port or settings.server.port

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    console.print(f"\n[bold]🎙️ Lecture Whisper[/bold]")
    console.print(f"   Server: http://{bind_host}:{bind_port}")
    console.print(f"   Data:   {settings.data_dir}\n")

    # Try to advertise via Bonjour
    _advertise_bonjour(bind_host, bind_port)

    # Show pairing QR
    _show_pairing_qr(bind_host, bind_port)

    # Open browser
    if not no_browser:
        url = f"http://localhost:{bind_port}"
        webbrowser.open(url)

    uvicorn.run(
        "lecturewhisper.api.app:create_app",
        factory=True,
        host=bind_host,
        port=bind_port,
        log_level="info",
    )


def _advertise_bonjour(host: str, port: int) -> None:
    """Try to advertise via mDNS/Bonjour."""
    try:
        import socket

        from zeroconf import ServiceInfo, Zeroconf

        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)

        info = ServiceInfo(
            "_lecturewhisper._tcp.local.",
            f"LectureWhisper ({hostname})._lecturewhisper._tcp.local.",
            addresses=[socket.inet_aton(local_ip)],
            port=port,
            properties={"version": "0.1.0"},
        )
        zc = Zeroconf()
        zc.register_service(info)
        console.print(f"   [green]Bonjour:[/green] advertising _lecturewhisper._tcp")
    except Exception as e:
        console.print(f"   [yellow]Bonjour:[/yellow] not available ({e})")


def _show_pairing_qr(host: str, port: int) -> None:
    """Show a pairing QR code in the terminal."""
    try:
        import json
        import socket
        from uuid import uuid4

        import qrcode  # type: ignore[import-untyped]

        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)

        pairing_data = json.dumps({
            "host": local_ip,
            "port": port,
            "token": str(uuid4()),
            "server_id": hostname,
        })

        qr = qrcode.QRCode(box_size=1, border=1)
        qr.add_data(pairing_data)
        qr.make(fit=True)

        console.print("\n   [bold]Scan to pair:[/bold]")
        # Print QR to terminal
        qr.print_ascii(out=sys.stdout)
        console.print()
    except Exception as e:
        console.print(f"   [yellow]QR:[/yellow] could not generate ({e})")


@cli.command()
@click.argument("audio", type=click.Path(exists=True))
def process(audio: str) -> None:
    """Process an audio file through the pipeline."""
    console.print(f"[yellow]Pipeline not yet implemented — coming in Phase 2[/yellow]")
    console.print(f"Audio file: {audio}")


@cli.command()
def pair() -> None:
    """Show pairing QR code for mobile app."""
    _show_pairing_qr("0.0.0.0", 8420)


@cli.command("eval")
def eval_cmd() -> None:
    """Run evaluation harness."""
    console.print("[yellow]Evaluation not yet implemented — coming in Phase 3[/yellow]")


@cli.command()
def train() -> None:
    """Run fine-tuning pipeline."""
    console.print("[yellow]Training not yet implemented — coming in Phase 8[/yellow]")


@cli.command()
@click.argument("audio", type=click.Path(exists=True))
def bench(audio: str) -> None:
    """Benchmark pipeline stages on an audio file."""
    console.print(f"[yellow]Benchmarking not yet implemented — coming in Phase 2[/yellow]")
    console.print(f"Audio file: {audio}")


if __name__ == "__main__":
    cli()
