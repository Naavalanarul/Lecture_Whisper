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


_zeroconf_instance = None
_zeroconf_service_info = None


def _advertise_bonjour(host: str, port: int) -> None:
    """Try to advertise via mDNS/Bonjour with server_id in TXT records."""
    global _zeroconf_instance, _zeroconf_service_info
    try:
        import atexit
        import socket
        from zeroconf import ServiceInfo, Zeroconf
        from lecturewhisper.security.tls import get_address_candidates

        hostname = socket.gethostname()
        candidates = get_address_candidates()
        ip_addrs = [socket.inet_aton(ip) for ip in candidates if not ip.startswith("127.")]
        if not ip_addrs:
            ip_addrs = [socket.inet_aton("127.0.0.1")]

        info = ServiceInfo(
            "_lecturewhisper._tcp.local.",
            f"LectureWhisper ({hostname})._lecturewhisper._tcp.local.",
            addresses=ip_addrs,
            port=port,
            properties={
                "server_id": hostname,
                "name": hostname,
                "version": "1.0.0",
                "port": str(port),
            },
        )
        zc = Zeroconf()
        zc.register_service(info)
        _zeroconf_instance = zc
        _zeroconf_service_info = info

        def _cleanup():
            try:
                if _zeroconf_instance and _zeroconf_service_info:
                    _zeroconf_instance.unregister_service(_zeroconf_service_info)
                    _zeroconf_instance.close()
            except Exception:
                pass

        atexit.register(_cleanup)
        console.print(f"   [green]Bonjour:[/green] advertising _lecturewhisper._tcp on {', '.join(candidates)} (server_id: {hostname})")
    except Exception as e:
        console.print(f"   [yellow]Bonjour:[/yellow] not available ({e})")


def _show_pairing_qr(host: str, port: int) -> None:
    """Show a pairing QR code and 6-digit fallback in the terminal."""
    try:
        import sys
        import socket
        import qrcode  # type: ignore[import-untyped]
        from lecturewhisper.api.routes.pairing import get_or_create_one_time_token
        from lecturewhisper.security.tls import (
            get_address_candidates,
            get_cert_fingerprint_base64url,
        )

        candidates = get_address_candidates()
        token, code_6digit, exp_unix = get_or_create_one_time_token()
        fp = get_cert_fingerprint_base64url()
        hostname = socket.gethostname()
        ips_joined = ",".join(candidates)

        pairing_url = (
            f"lecturewhisper://pair?v=1&sid={hostname}&n={hostname}&h={ips_joined}"
            f"&p={port}&fp={fp}&t={token}&exp={exp_unix}"
        )

        qr = qrcode.QRCode(box_size=1, border=1)
        qr.add_data(pairing_url)
        qr.make(fit=True)

        console.print("\n   [bold]📱 Lecture Whisper — Pair Your Pixel 8a[/bold]")
        console.print(f"   [dim]Scan with in-app camera or Pixel Camera • Valid for 2 minutes[/dim]\n")
        qr.print_ascii(out=sys.stdout)
        console.print(f"\n   [bold cyan]6-Digit Fallback Code:[/bold cyan] [bold white]{code_6digit}[/bold white]")
        console.print(f"   [dim]Target Host: {candidates[0]}:{port} (Server: {hostname})[/dim]\n")
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


@cli.group("eval", invoke_without_command=True)
@click.option("--fixtures", default=None, help="Custom fixtures directory.")
@click.pass_context
def eval_cmd(ctx: click.Context, fixtures: str | None) -> None:
    """Run evaluation harness on golden fixtures or scan announcements."""
    if ctx.invoked_subcommand is not None:
        return

    import sys
    from pathlib import Path

    monorepo_root = Path(__file__).parent.parent.parent.parent
    sys.path.insert(0, str(monorepo_root))

    from eval.run_eval import evaluate_fixtures

    fix_dir = Path(fixtures) if fixtures else monorepo_root / "eval" / "fixtures"
    res = evaluate_fixtures(fix_dir, suite=True)

    console.print("\n[bold]📊 Lecture Whisper Evaluation Results[/bold]\n")
    if "benchmark_lectures_count" in res:
        console.print(f"Benchmark Lectures: [bold]{res['benchmark_lectures_count']}[/bold]")
        console.print(f"Event Precision:   [bold green]{res['event_precision'] * 100:.1f}%[/bold green]")
        console.print(f"Event Recall:      [bold green]{res['event_recall'] * 100:.1f}%[/bold green]")
        console.print(f"Event F1 Score:    [bold]{res['event_f1'] * 100:.1f}%[/bold]")
        console.print(f"Question Recall:   [bold green]{res['question_recall'] * 100:.1f}%[/bold green]")
        console.print(f"Mean WER:          [bold]{res.get('mean_wer', 0.0) * 100:.2f}%[/bold]")
        console.print(f"Note Faithfulness: [bold green]{res.get('note_faithfulness', 1.0) * 100:.1f}%[/bold green]\n")
    else:
        console.print(f"Event Precision:   [bold green]{res['event_precision'] * 100:.1f}%[/bold green]")
        console.print(f"Event Recall:      [bold green]{res['event_recall'] * 100:.1f}%[/bold green]")
        console.print(f"Event F1 Score:    [bold]{res['event_f1'] * 100:.1f}%[/bold]")
        console.print(f"Question Recall:   [bold green]{res['question_recall'] * 100:.1f}%[/bold green]")
        if "emphasis_phrases_count" in res:
            console.print(f"Emphasis Phrases:  [bold]{res['emphasis_phrases_count']}[/bold]")
        if "habit_phrases_count" in res:
            console.print(f"Habit Phrases:     [bold]{res['habit_phrases_count']}[/bold]\n")


@eval_cmd.command("announcements")
@click.argument("folder", default="data/transcripts", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.option("--output", default="review", help="Output directory for candidates CSV and HTML.")
def announcements_cmd(folder: str, output: str) -> None:
    """Scan transcripts for announcements, deadlines, events, and questions."""
    from pathlib import Path
    from lecturewhisper.eval.parsers import parse_transcript
    from lecturewhisper.eval.discovery import (
        discover_announcements_and_events,
        write_candidates_csv,
        generate_announcements_review_html,
    )

    in_dir = Path(folder)
    out_dir = Path(output)
    out_dir.mkdir(parents=True, exist_ok=True)

    transcript_files = []
    for ext in ("*.json", "*.srt", "*.vtt", "*.pdf", "*.xml"):
        transcript_files.extend(in_dir.glob(ext))

    if not transcript_files:
        console.print(f"[yellow]No transcript files found in {in_dir}[/yellow]")
        return

    all_candidates = []
    for tf in sorted(transcript_files):
        if tf.name in ("tie_eval.json", "tie_concat_list.txt"):
            continue
        try:
            t = parse_transcript(tf)
            cands = discover_announcements_and_events(t)
            all_candidates.extend(cands)
            console.print(f"Scanned [bold]{tf.name}[/bold]: found {len(cands)} candidates.")
        except Exception as e:
            console.print(f"[red]Error parsing {tf.name}: {e}[/red]")

    csv_path = out_dir / "candidates.csv"
    html_path = out_dir / "announcements_review.html"

    write_candidates_csv(all_candidates, csv_path)
    generate_announcements_review_html(all_candidates, html_path)

    console.print(f"\n[bold green]✓ Discovered {len(all_candidates)} candidates across {len(transcript_files)} transcripts.[/bold green]")
    console.print(f"  • Candidate CSV:  [bold]{csv_path}[/bold]")
    console.print(f"  • Review Web UI:  [bold]{html_path}[/bold]\n")


@eval_cmd.command("score-candidates")
@click.argument("csv_path", default="review/candidates.csv", type=click.Path(exists=True, dir_okay=False))
def score_candidates_cmd(csv_path: str) -> None:
    """Score precision of human-audited announcement and question candidates."""
    import csv
    from collections import defaultdict
    from pathlib import Path

    path = Path(csv_path)
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    verified = [r for r in rows if r.get("status") == "VERIFIED"]
    rejected = [r for r in rows if r.get("status") == "REJECTED"]
    pending = [r for r in rows if r.get("status") in ("PENDING_REVIEW", "PENDING", "") and r not in verified and r not in rejected]

    console.print(f"\n[bold]📋 Candidate Audit Summary ({path.name})[/bold]\n")
    console.print(f"Total Candidates:   {total}")
    console.print(f"Verified (TP):      [green]{len(verified)}[/green]")
    console.print(f"Rejected (FP):      [red]{len(rejected)}[/red]")
    console.print(f"Pending Review:     [yellow]{len(pending)}[/yellow]\n")

    audited = len(verified) + len(rejected)
    if audited == 0:
        console.print("[bold yellow]⚠️ No candidates have been human-verified yet![/bold yellow]")
        console.print("In accordance with test suite rules, model predictions cannot be counted as ground truth without human verification.")
        console.print("Please open [bold]review/announcements_review.html[/bold] in your browser to verify candidate rows.\n")
        return

    precision = len(verified) / audited
    console.print(f"Overall Human-Audited Precision: [bold green]{precision * 100:.1f}%[/bold green]")

    cat_tp = defaultdict(int)
    cat_fp = defaultdict(int)
    for r in verified:
        cat_tp[r.get("category", "other")] += 1
    for r in rejected:
        cat_fp[r.get("category", "other")] += 1

    all_cats = sorted(set(list(cat_tp.keys()) + list(cat_fp.keys())))
    console.print("\n[bold]Category Breakdown:[/bold]")
    for cat in all_cats:
        tp = cat_tp[cat]
        fp = cat_fp[cat]
        p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        console.print(f"  • {cat:<18}: {tp} TP, {fp} FP (Precision: {p * 100:.1f}%)")
    console.print("")


@eval_cmd.command("score-calibration")
@click.argument("csv_path", default="review/asr-calibration.csv", type=click.Path(exists=True, dir_okay=False))
def score_calibration_cmd(csv_path: str) -> None:
    """Score true calibrated WER against human-verified gold transcript."""
    import csv
    from pathlib import Path
    from lecturewhisper.eval.asr import calculate_wer_metrics

    path = Path(csv_path)
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    audited_rows = [r for r in rows if r.get("human_verified_text", "").strip()]
    if not audited_rows:
        console.print(f"\n[bold yellow]⚠️ No human-verified verbatim text found in {path.name}[/bold yellow]")
        console.print("Open [bold]review/calibration.html[/bold] to listen and verify the 5-minute calibration window.\n")
        return

    ref_text = " ".join(r["reference_text"] for r in audited_rows)
    gold_text = " ".join(r["human_verified_text"] for r in audited_rows)
    hyp_text = " ".join(r["hypothesis_text"] for r in audited_rows)

    caption_metrics = calculate_wer_metrics(ref_text, hyp_text)
    gold_metrics = calculate_wer_metrics(gold_text, hyp_text)
    sanitization_diff = calculate_wer_metrics(ref_text, gold_text)

    console.print(f"\n[bold]🎙️ Ground Truth Calibration Analysis ({len(audited_rows)} segments)[/bold]\n")
    console.print(f"Caption Sanitization Rate (Gold vs Captions): [bold yellow]{sanitization_diff.strict_wer * 100:.2f}%[/bold yellow]")
    console.print(f"ASR Strict WER vs Video Captions:             [bold]{caption_metrics.strict_wer * 100:.2f}%[/bold]")
    console.print(f"ASR Strict WER vs Human Gold Reference:       [bold green]{gold_metrics.strict_wer * 100:.2f}%[/bold green]")
    console.print(f"ASR Filler WER vs Human Gold Reference:       [bold green]{gold_metrics.filler_insensitive_wer * 100:.2f}%[/bold green]\n")




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
    decision = evaluator.decide_promotion(baseline, adapter_eval, human_pair_count=len(sample_pairs))

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


