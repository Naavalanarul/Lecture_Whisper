"""Lecture Whisper CLI — entrypoint for all commands."""

from __future__ import annotations

import logging
import sys
import webbrowser
from pathlib import Path

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
@click.option("--demo", is_flag=True, default=False, help="Seed demo lecture, schedule, and deadline dataset.")
def serve(host: str | None, port: int | None, no_browser: bool, demo: bool = False) -> None:
    """Start the Lecture Whisper server."""
    import os
    import uvicorn

    if demo:
        os.environ["DEMO_MODE"] = "1"

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
@click.option("--model", default=None, help="Whisper model name.")
@click.option("--out", default=None, help="Output directory for JSON.")
def process(audio: str, model: str | None, out: str | None) -> None:
    """Process an audio file through the offline pipeline."""
    from pathlib import Path

    from lecturewhisper.pipeline.runner import PipelineRunner

    runner = PipelineRunner(asr_model=model)
    console.print(f"[bold]Processing {audio}...[/bold]")
    res = runner.process(audio)

    out_dir = Path(out) if out else Path(audio).parent
    out_dir.mkdir(parents=True, exist_ok=True)
    t_file = out_dir / f"{Path(audio).stem}_transcript.json"
    s_file = out_dir / f"{Path(audio).stem}_speakers.json"

    t_file.write_text(res.transcript.model_dump_json(indent=2), encoding="utf-8")
    s_file.write_text(res.speaker_stats.model_dump_json(indent=2), encoding="utf-8")

    total_t = sum(res.timings.values())
    console.print(f"[green]✓ Completed in {total_t:.2f}s[/green]")
    console.print(f"Saved transcript: {t_file}")
    console.print(f"Saved speaker stats: {s_file}")


@cli.command()
def pair() -> None:
    """Show pairing QR code for mobile app."""
    _show_pairing_qr("0.0.0.0", 8420)


@cli.command("eval")
@click.option("--fixtures", default=None, help="Custom fixtures directory.")
def eval_cmd(fixtures: str | None) -> None:
    """Run evaluation harness on golden fixtures."""
    import sys
    from pathlib import Path

    monorepo_root = Path(__file__).parent.parent.parent.parent
    sys.path.insert(0, str(monorepo_root))

    from eval.run_eval import evaluate_fixtures

    fix_dir = Path(fixtures) if fixtures else monorepo_root / "eval" / "fixtures"
    res = evaluate_fixtures(fix_dir)

    console.print("\n[bold]📊 Lecture Whisper Evaluation Results[/bold]\n")
    console.print(f"Event Precision:   [bold green]{res['event_precision'] * 100:.1f}%[/bold green]")
    console.print(f"Event Recall:      [bold green]{res['event_recall'] * 100:.1f}%[/bold green]")
    console.print(f"Event F1 Score:    [bold]{res['event_f1'] * 100:.1f}%[/bold]")
    console.print(f"Question Recall:   [bold green]{res['question_recall'] * 100:.1f}%[/bold green]")
    console.print(f"Emphasis Phrases:  [bold]{res['emphasis_phrases_count']}[/bold]")
    console.print(f"Habit Phrases:     [bold]{res['habit_phrases_count']}[/bold]\n")


@cli.command()
@click.option("--iters", default=50, type=int, help="Training iterations.")
@click.option("--batch-size", default=2, type=int, help="Batch size.")
def train(iters: int, batch_size: int) -> None:
    """Run LoRA fine-tuning and evaluate against baseline."""
    from pathlib import Path

    from lecturewhisper.train.dataset import create_training_pair, export_dataset
    from lecturewhisper.train.evaluate import AdapterEvaluator
    from lecturewhisper.train.train import LoRATrainer

    console.print("\n[bold]🧠 Lecture Whisper — LoRA Fine-Tuning Pipeline[/bold]\n")

    # 1. Export tiny initial dataset for training
    sample_pairs = create_training_pair(
        prompt="Explain the difference between memoization and tabulation.",
        target_json={
            "summary": "Memoization is top-down caching; tabulation is bottom-up table filling.",
            "key_points": ["Memoization uses recursion + cache", "Tabulation avoids recursion overhead"],
        },
        add_noisy_variant=True,
    )
    dataset_dir = Path.home() / ".lecturewhisper" / "datasets" / "latest"
    train_f, valid_f = export_dataset(dataset_dir, sample_pairs)

    # 2. Train LoRA adapter
    trainer = LoRATrainer()
    result = trainer.train(dataset_dir, iters=iters, batch_size=batch_size)

    console.print(f"[green]✓ Adapter v{result.version} trained in {result.duration_s}s (loss: {result.train_loss:.4f})[/green]")
    console.print(f"   Path: {result.adapter_path}\n")

    # 3. Evaluate adapter against baseline
    evaluator = AdapterEvaluator()
    baseline = evaluator.evaluate_baseline(valid_f)
    adapter_eval = evaluator.evaluate_adapter(result.adapter_path, valid_f)
    decision = evaluator.decide_promotion(baseline, adapter_eval)

    console.print("[bold]Evaluation & Promotion Decision:[/bold]")
    console.print(f"   Baseline Score: {decision.baseline_score}")
    console.print(f"   Adapter Score:  {decision.adapter_score}")
    if decision.promoted:
        console.print(f"   [bold green]Status: PROMOTED[/bold green] — {decision.reason}\n")
    else:
        console.print(f"   [bold yellow]Status: KEPT BASELINE[/bold yellow] — {decision.reason}\n")


@cli.command()
@click.argument("audio", type=click.Path(exists=True))
@click.option("--model", default=None, help="Whisper model to benchmark.")
def bench(audio: str, model: str | None) -> None:
    """Benchmark pipeline stages on an audio file."""
    import resource
    from datetime import date
    from pathlib import Path

    from rich.table import Table

    from lecturewhisper.pipeline.runner import PipelineRunner

    console.print(f"\n[bold]⚡ Benchmarking pipeline on {audio}[/bold]\n")
    runner = PipelineRunner(asr_model=model)
    res = runner.process(audio)

    total_wall_s = sum(res.timings.values())
    rtf = total_wall_s / res.duration_s if res.duration_s > 0 else 0.0
    # On macOS, ru_maxrss is in bytes
    peak_rss_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1024 * 1024)

    # Print Rich Table
    table = Table(title="Pipeline Benchmark Results", show_header=True)
    table.add_column("Stage", style="cyan")
    table.add_column("Time (s)", justify="right")
    table.add_column("% Total", justify="right")

    for stage, t in res.timings.items():
        pct = (t / total_wall_s * 100) if total_wall_s > 0 else 0.0
        table.add_row(stage, f"{t:.2f}", f"{pct:.1f}%")

    table.add_row("Total Pipeline", f"{total_wall_s:.2f}", "100.0%", style="bold green")
    console.print(table)

    console.print(f"Audio Duration:   [bold]{res.duration_s:.2f}s[/bold]")
    rtf_str = f"{1/rtf:.1f}x faster than real-time" if rtf > 0 else "N/A"
    console.print(f"Real-Time Factor: [bold]{rtf:.3f}x[/bold] ({rtf_str})")
    console.print(f"Peak Memory:      [bold]{peak_rss_mb:.1f} MB[/bold]\n")

    # Save docs/bench-<date>.md
    docs_dir = Path("docs")
    if not docs_dir.exists():
        docs_dir = Path(__file__).parent.parent.parent.parent / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    bench_file = docs_dir / f"bench-{today}.md"

    md_content = f"# Benchmark — {today}\n\n"
    md_content += f"- **Audio**: `{audio}`\n"
    md_content += f"- **Audio Duration**: {res.duration_s:.2f} s\n"
    md_content += f"- **Total Wall Time**: {total_wall_s:.2f} s\n"
    md_content += f"- **Real-Time Factor (RTF)**: {rtf:.3f}x\n"
    md_content += f"- **Peak Memory**: {peak_rss_mb:.1f} MB\n"
    md_content += f"- **ASR Model**: {res.transcript.asr_model}\n\n"
    md_content += "| Stage | Time (s) | % Total |\n|---|---:|---:|\n"
    for stage, t in res.timings.items():
        pct = (t / total_wall_s * 100) if total_wall_s > 0 else 0.0
        md_content += f"| {stage} | {t:.2f} | {pct:.1f}% |\n"
    md_content += f"| **Total** | **{total_wall_s:.2f}** | **100.0%** |\n"

    bench_file.write_text(md_content, encoding="utf-8")
    console.print(f"[green]Benchmark saved to {bench_file}[/green]\n")


@cli.command()
@click.option("--out", default=None, help="Output tar.gz archive path.")
def backup(out: str | None) -> None:
    """Create a compressed backup of the Lecture Whisper database, notes, and config."""
    import tarfile
    from datetime import datetime

    from lecturewhisper.config import get_settings

    settings = get_settings()
    data_dir = settings.data_dir
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = Path(out) if out else Path.cwd() / f"lecturewhisper_backup_{timestamp}.tar.gz"

    console.print(f"Creating backup of {data_dir} -> {out_path}...")
    with tarfile.open(out_path, "w:gz") as tar:
        for item in ["lecturewhisper.db", "config.toml", "storage", "adapters"]:
            src = data_dir / item
            if src.exists():
                tar.add(src, arcname=item)

    console.print(
        f"[green]✓ Backup successfully created: {out_path} ({out_path.stat().st_size / (1024*1024):.2f} MB)[/green]\n"
    )


@cli.group()
def service() -> None:
    """Manage macOS launchd background login service."""


@service.command("install")
@click.option("--port", default=8420, type=int, help="Port number for the server.")
def service_install(port: int) -> None:
    """Install macOS launchd agent to automatically run Lecture Whisper at login."""
    import shutil

    launch_agents = Path.home() / "Library" / "LaunchAgents"
    launch_agents.mkdir(parents=True, exist_ok=True)
    plist_path = launch_agents / "com.lecturewhisper.server.plist"

    python_bin = sys.executable

    plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.lecturewhisper.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python_bin}</string>
        <string>-m</string>
        <string>lecturewhisper.cli</string>
        <string>serve</string>
        <string>--port</string>
        <string>{port}</string>
        <string>--no-browser</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{Path.home()}/.lecturewhisper/logs/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>{Path.home()}/.lecturewhisper/logs/launchd_err.log</string>
</dict>
</plist>
"""
    plist_path.write_text(plist_content, encoding="utf-8")
    console.print(f"[green]✓ Installed launchd plist at {plist_path}[/green]")
    console.print(
        "Start service with: [bold]launchctl load ~/Library/LaunchAgents/com.lecturewhisper.server.plist[/bold]\n"
    )


@service.command("uninstall")
def service_uninstall() -> None:
    """Uninstall macOS launchd agent."""
    import subprocess

    plist_path = Path.home() / "Library" / "LaunchAgents" / "com.lecturewhisper.server.plist"
    if plist_path.exists():
        subprocess.run(["launchctl", "unload", str(plist_path)], capture_output=True)
        plist_path.unlink()
        console.print("[green]✓ Uninstalled launchd service.[/green]\n")
    else:
        console.print("[yellow]Service plist not found.[/yellow]\n")


if __name__ == "__main__":
    cli()


