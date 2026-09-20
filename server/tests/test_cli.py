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


def test_eval_announcements_command(tmp_path):
    """Eval announcements command should scan folder and output CSV and HTML."""
    from pathlib import Path
    runner = CliRunner()
    # Create a tiny mock transcript in tmp_path
    mock_transcript = tmp_path / "test_lecture.srt"
    mock_transcript.write_text(
        "1\n00:00:01,000 --> 00:00:04,000\nPROFESSOR: Midterm exam is next Wednesday.\n"
    )
    out_dir = tmp_path / "review"
    result = runner.invoke(cli, ["eval", "announcements", str(tmp_path), "--output", str(out_dir)])
    assert result.exit_code == 0
    assert "Discovered" in result.output
    assert (out_dir / "candidates.csv").exists()
    assert (out_dir / "announcements_review.html").exists()


def test_score_candidates_command(tmp_path):
    """Test score-candidates CLI command with mock audited CSV."""
    runner = CliRunner()
    csv_file = tmp_path / "candidates.csv"
    csv_file.write_text(
        "id,status,human_verified,category\n"
        "ANN-001,VERIFIED,TRUE,exam\n"
        "ANN-002,REJECTED,FALSE,exam\n"
        "ANN-003,PENDING_REVIEW,FALSE,assignment\n"
    )
    result = runner.invoke(cli, ["eval", "score-candidates", str(csv_file)])
    assert result.exit_code == 0
    assert "Overall Human-Audited Precision: 50.0%" in result.output
    assert "Verified (TP):      1" in result.output
    assert "Rejected (FP):      1" in result.output


def test_score_calibration_command(tmp_path):
    """Test score-calibration CLI command with mock audited CSV."""
    runner = CliRunner()
    csv_file = tmp_path / "calibration.csv"
    csv_file.write_text(
        "reference_text,hypothesis_text,human_verified_text\n"
        "hello world,hello world,hello world\n"
    )
    result = runner.invoke(cli, ["eval", "score-calibration", str(csv_file)])
    assert result.exit_code == 0
    assert "Ground Truth Calibration Analysis" in result.output
    assert "ASR Strict WER vs Human Gold Reference:       0.00%" in result.output




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
