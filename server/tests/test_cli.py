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
    assert result.exit_code in (0, 1)
    assert "System Diagnostics" in result.output


def test_pair_command():
    """Pair command should attempt to show QR."""
    runner = CliRunner()
    result = runner.invoke(cli, ["pair"])
    assert result.exit_code == 0


def test_eval_command():
    """Eval command should run evaluation on golden fixtures."""
    runner = CliRunner()
    result = runner.invoke(cli, ["eval"])
    assert result.exit_code == 0
    assert "Evaluation Results" in result.output


def test_train_command():
    """Train command should run fine-tuning and promotion evaluation."""
    runner = CliRunner()
    result = runner.invoke(cli, ["train", "--iters", "5"])
    assert result.exit_code == 0
    assert "LoRA Fine-Tuning Pipeline" in result.output


def test_backup_command(tmp_path):
    """Backup command should create archive."""
    runner = CliRunner()
    archive = str(tmp_path / "test_backup.tar.gz")
    result = runner.invoke(cli, ["backup", "--out", archive])
    assert result.exit_code == 0
    assert "Backup successfully created" in result.output
