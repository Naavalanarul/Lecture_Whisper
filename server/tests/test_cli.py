"""Tests for the CLI module."""

from __future__ import annotations

from click.testing import CliRunner

from lecturewhisper.cli import cli


def test_cli_version():
    """CLI should show version."""
    runner = CliRunner()
    result = runner.invoke(cli, ["--version"])
    assert result.exit_code == 0
    assert "0.1.0" in result.output


def test_cli_help():
    """CLI should show help text."""
    runner = CliRunner()
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "Lecture Whisper" in result.output


def test_doctor_command():
    """Doctor command should run without crashing."""
    runner = CliRunner()
    result = runner.invoke(cli, ["doctor"])
    # Exit code depends on system state, but it shouldn't crash
    assert result.exit_code in (0, 1)
    assert "System Diagnostics" in result.output


def test_serve_stub():
    """Serve command stub should print placeholder."""
    runner = CliRunner()
    result = runner.invoke(cli, ["serve"])
    assert "Phase 1" in result.output


def test_pair_stub():
    """Pair command stub should print placeholder."""
    runner = CliRunner()
    result = runner.invoke(cli, ["pair"])
    assert "Phase 5" in result.output


def test_eval_stub():
    """Eval command stub should print placeholder."""
    runner = CliRunner()
    result = runner.invoke(cli, ["eval"])
    assert "Phase 3" in result.output


def test_train_stub():
    """Train command stub should print placeholder."""
    runner = CliRunner()
    result = runner.invoke(cli, ["train"])
    assert "Phase 8" in result.output
