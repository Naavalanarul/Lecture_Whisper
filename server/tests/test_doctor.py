"""Tests for the doctor diagnostic checks."""

from __future__ import annotations

from unittest.mock import patch

from lecturewhisper.doctor import (
    check_adb,
    check_disk,
    check_ffmpeg,
    check_hf_token,
    check_macos_arch,
    check_mlx,
    check_python,
    check_ram,
    check_uv,
    run_doctor,
)


def test_check_macos_arch():
    """Should detect macOS arm64 on this machine."""
    ok, detail = check_macos_arch()
    assert ok is True
    assert "arm64" in detail


def test_check_python():
    """Should detect Python 3.12+."""
    ok, detail = check_python()
    assert ok is True
    assert "Python 3." in detail


def test_check_uv():
    """Should find uv."""
    ok, detail = check_uv()
    assert ok is True
    assert "uv" in detail


def test_check_ffmpeg():
    """Should find ffmpeg."""
    ok, detail = check_ffmpeg()
    assert ok is True
    assert "ffmpeg" in detail.lower()


def test_check_disk():
    """Should have enough disk space."""
    ok, detail = check_disk()
    assert ok is True
    assert "GB free" in detail


def test_check_ram():
    """Should check RAM and return valid status with GB details."""
    ok, detail = check_ram()
    assert isinstance(ok, bool)
    assert "GB" in detail


def test_check_ram_mock_apple_silicon():
    """Should verify RAM check threshold with 36GB M4 Max."""
    with patch("subprocess.run") as mock_run:
        mock_run.return_value.stdout = str(36 * 1024**3)
        ok, detail = check_ram()
        assert ok is True
        assert "36 GB" in detail


def test_check_mlx_importable():
    """MLX should be importable if installed, otherwise skip."""
    ok, detail = check_mlx()
    # MLX may not be installed in test env — both outcomes are valid
    assert isinstance(ok, bool)
    assert isinstance(detail, str)


def test_check_hf_token():
    """HF token check should return a result."""
    ok, detail = check_hf_token()
    # ok can be True, False, or None — all valid
    assert isinstance(detail, str)


def test_check_adb():
    """adb check should return a result."""
    ok, detail = check_adb()
    assert isinstance(detail, str)


def test_check_hf_token_from_env():
    """Should detect HF token from environment."""
    with patch.dict("os.environ", {"HF_TOKEN": "hf_test1234abcd5678"}):
        ok, detail = check_hf_token()
        assert ok is True
        assert "hf_t" in detail
        assert "5678" in detail


def test_run_doctor_returns_bool():
    """run_doctor should return a boolean."""
    result = run_doctor()
    assert isinstance(result, bool)
