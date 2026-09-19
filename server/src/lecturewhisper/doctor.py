"""System diagnostics for Lecture Whisper."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

from rich.console import Console
from rich.table import Table

console = Console()

# Minimum requirements
MIN_PYTHON = (3, 12)
MIN_DISK_GB = 20
MIN_RAM_GB = 16
DATA_DIR = Path.home() / ".lecturewhisper"


def _check_mark(ok: bool) -> str:
    return "[green]✓[/green]" if ok else "[red]✗[/red]"


def _warn_mark() -> str:
    return "[yellow]![/yellow]"


def check_macos_arch() -> tuple[bool, str]:
    """Check macOS and Apple Silicon."""
    system = platform.system()
    machine = platform.machine()
    if system != "Darwin":
        return False, f"Not macOS (found {system})"
    if machine != "arm64":
        return False, f"Not Apple Silicon (found {machine})"
    mac_ver = platform.mac_ver()[0]
    return True, f"macOS {mac_ver}, {machine}"


def check_python() -> tuple[bool, str]:
    """Check Python version."""
    ver = sys.version_info
    ok = ver >= MIN_PYTHON
    return ok, f"Python {ver.major}.{ver.minor}.{ver.micro}"


def check_uv() -> tuple[bool, str]:
    """Check uv availability."""
    uv = shutil.which("uv")
    if not uv:
        return False, "uv not found — install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    try:
        result = subprocess.run(
            [uv, "--version"], capture_output=True, text=True, timeout=5
        )
        version = result.stdout.strip()
        return True, version
    except Exception as e:
        return False, f"uv found but error: {e}"


def check_ffmpeg() -> tuple[bool, str]:
    """Check ffmpeg availability."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return False, "ffmpeg not found — install with: brew install ffmpeg"
    try:
        result = subprocess.run(
            [ffmpeg, "-version"], capture_output=True, text=True, timeout=5
        )
        first_line = result.stdout.split("\n")[0]
        return True, first_line
    except Exception as e:
        return False, f"ffmpeg found but error: {e}"


def check_disk() -> tuple[bool, str]:
    """Check available disk space."""
    usage = shutil.disk_usage(Path.home())
    free_gb = usage.free / (1024**3)
    ok = free_gb >= MIN_DISK_GB
    return ok, f"{free_gb:.1f} GB free"


def check_ram() -> tuple[bool, str]:
    """Check available RAM."""
    if platform.system() != "Darwin":
        return False, "Cannot check RAM on non-macOS"
    try:
        result = subprocess.run(
            ["sysctl", "-n", "hw.memsize"], capture_output=True, text=True, timeout=5
        )
        ram_bytes = int(result.stdout.strip())
        ram_gb = ram_bytes / (1024**3)
        ok = ram_gb >= MIN_RAM_GB
        return ok, f"{ram_gb:.0f} GB"
    except Exception as e:
        return False, f"Cannot determine RAM: {e}"


def check_mlx() -> tuple[bool, str]:
    """Check MLX framework import."""
    try:
        import mlx.core as mx  # type: ignore[import-untyped]

        backend = mx.default_device()
        return True, f"MLX available, device: {backend}"
    except ImportError:
        return False, "MLX not installed — install with: pip install mlx"
    except Exception as e:
        return False, f"MLX import error: {e}"


def check_hf_token() -> tuple[bool | None, str]:
    """Check Hugging Face token availability."""
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if token:
        masked = token[:4] + "…" + token[-4:]
        return True, f"Found in env: {masked}"

    # Check HF CLI cache
    hf_token_path = Path.home() / ".cache" / "huggingface" / "token"
    if hf_token_path.exists():
        token_text = hf_token_path.read_text().strip()
        if token_text:
            masked = token_text[:4] + "…" + token_text[-4:]
            return True, f"Found in HF cache: {masked}"

    return None, "Not found — needed for pyannote diarization (set HF_TOKEN or run: huggingface-cli login)"


def check_model_cache() -> tuple[bool, str]:
    """Check model cache directory."""
    models_dir = DATA_DIR / "models"
    if models_dir.exists():
        count = sum(1 for _ in models_dir.iterdir())
        return True, f"{models_dir} ({count} items)"
    return True, f"{models_dir} (will be created)"


def check_data_dir() -> tuple[bool, str]:
    """Check/create data directory."""
    if DATA_DIR.exists():
        return True, str(DATA_DIR)
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        (DATA_DIR / "storage").mkdir(exist_ok=True)
        (DATA_DIR / "models").mkdir(exist_ok=True)
        (DATA_DIR / "logs").mkdir(exist_ok=True)
        (DATA_DIR / "adapters").mkdir(exist_ok=True)
        return True, f"{DATA_DIR} (created)"
    except Exception as e:
        return False, f"Cannot create {DATA_DIR}: {e}"


def check_adb() -> tuple[bool | None, str]:
    """Check adb and connected devices (optional)."""
    adb = shutil.which("adb")
    if not adb:
        return None, "adb not found (optional — needed for Android deployment)"
    try:
        result = subprocess.run(
            [adb, "devices"], capture_output=True, text=True, timeout=10
        )
        lines = [
            line
            for line in result.stdout.strip().split("\n")[1:]
            if line.strip() and "offline" not in line
        ]
        if not lines:
            return None, "adb available, no devices connected"

        # Get Android version from first device
        ver_result = subprocess.run(
            [adb, "shell", "getprop", "ro.build.version.release"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        android_ver = ver_result.stdout.strip()
        return True, f"{len(lines)} device(s) connected, Android {android_ver}"
    except Exception as e:
        return None, f"adb error: {e}"


def run_doctor() -> bool:
    """Run all diagnostic checks. Returns True if all critical checks pass."""
    console.print("\n[bold]🩺 Lecture Whisper — System Diagnostics[/bold]\n")

    table = Table(show_header=True, header_style="bold")
    table.add_column("Check", style="dim", width=20)
    table.add_column("Status", width=3, justify="center")
    table.add_column("Details")

    checks: list[tuple[str, tuple[bool | None, str]]] = [
        ("macOS / Arch", check_macos_arch()),
        ("Python", check_python()),
        ("uv", check_uv()),
        ("ffmpeg", check_ffmpeg()),
        ("Disk space", check_disk()),
        ("RAM", check_ram()),
        ("MLX", check_mlx()),
        ("HF Token", check_hf_token()),
        ("Data directory", check_data_dir()),
        ("Model cache", check_model_cache()),
        ("adb (optional)", check_adb()),
    ]

    all_ok = True
    for name, (status, detail) in checks:
        if status is True:
            mark = _check_mark(True)
        elif status is False:
            mark = _check_mark(False)
            all_ok = False
        else:  # None = warning/optional
            mark = _warn_mark()
        table.add_row(name, mark, detail)

    console.print(table)

    if all_ok:
        console.print("\n[bold green]All critical checks passed![/bold green]\n")
    else:
        console.print(
            "\n[bold red]Some checks failed.[/bold red] Fix the issues above before proceeding.\n"
        )

    return all_ok
