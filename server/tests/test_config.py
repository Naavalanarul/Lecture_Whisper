"""Tests for Lecture Whisper configuration system."""

from __future__ import annotations

from typing import TYPE_CHECKING

import lecturewhisper.config as config_module
from lecturewhisper.config import (
    DATA_DIR,
    ASRConfig,
    LLMConfig,
    ServerConfig,
    Settings,
    VLMConfig,
    ensure_data_dirs,
    get_settings,
)

if TYPE_CHECKING:
    from pathlib import Path

    import pytest


def test_default_settings_load_without_config_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Default settings should load successfully when no config file exists."""
    non_existent = tmp_path / "nonexistent" / "config.toml"
    monkeypatch.setattr(config_module, "CONFIG_PATH", non_existent)

    settings = get_settings()
    assert isinstance(settings, Settings)
    assert settings.data_dir == DATA_DIR


def test_settings_default_values() -> None:
    """Settings should have the documented default values."""
    settings = Settings()

    assert settings.data_dir == DATA_DIR

    # ASR defaults
    assert isinstance(settings.asr, ASRConfig)
    assert settings.asr.language == "en"
    assert settings.asr.model == "mlx-community/whisper-large-v3-turbo"
    assert settings.asr.model_alt == "mlx-community/whisper-large-v3"

    # LLM defaults
    assert isinstance(settings.llm, LLMConfig)
    assert settings.llm.model == "mlx-community/Qwen2.5-7B-Instruct-4bit"
    assert settings.llm.max_tokens == 4096
    assert settings.llm.temperature == 0.1

    # VLM defaults
    assert isinstance(settings.vlm, VLMConfig)
    assert settings.vlm.model == "mlx-community/Qwen2.5-VL-7B-Instruct-4bit"

    # Server defaults
    assert isinstance(settings.server, ServerConfig)
    assert settings.server.host == "0.0.0.0"
    assert settings.server.port == 8420


def test_ensure_data_dirs_creates_directories(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """ensure_data_dirs should create all required subdirectories."""
    test_data_dir = tmp_path / "lecturewhisper_test_data"
    monkeypatch.setenv("LW_DATA_DIR", str(test_data_dir))

    settings = get_settings()
    assert settings.data_dir == test_data_dir

    expected_subdirs = [
        "storage",
        "models",
        "logs",
        "adapters",
        "storage/recordings",
    ]

    for subdir in expected_subdirs:
        assert not (test_data_dir / subdir).exists()

    ensure_data_dirs(settings)

    for subdir in expected_subdirs:
        assert (test_data_dir / subdir).is_dir()


def test_env_var_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    """Environment variables with LW_ prefix should override settings."""
    monkeypatch.setenv("LW_SERVER__PORT", "9999")
    monkeypatch.setenv("LW_SERVER__HOST", "127.0.0.1")
    monkeypatch.setenv("LW_ASR__LANGUAGE", "fr")
    monkeypatch.setenv("LW_LLM__MAX_TOKENS", "2048")
    monkeypatch.setenv("LW_LLM__TEMPERATURE", "0.7")
    monkeypatch.setenv("LW_VLM__MODEL", "custom-vlm-model")

    settings = get_settings()

    assert settings.server.port == 9999
    assert settings.server.host == "127.0.0.1"
    assert settings.asr.language == "fr"
    assert settings.llm.max_tokens == 2048
    assert settings.llm.temperature == 0.7
    assert settings.vlm.model == "custom-vlm-model"


def test_toml_config_file_loading(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Settings should load values from a TOML configuration file."""
    config_file = tmp_path / "config.toml"
    config_file.write_text(
        """
[server]
port = 7000
host = "192.168.1.100"

[asr]
language = "de"
model = "mlx-community/whisper-small"

[llm]
model = "mlx-community/Qwen2.5-3B-Instruct"
max_tokens = 1024
temperature = 0.5

[vlm]
model = "custom-vlm"
""",
        encoding="utf-8",
    )

    monkeypatch.setattr(config_module, "CONFIG_PATH", config_file)

    settings = get_settings()
    assert settings.server.port == 7000
    assert settings.server.host == "192.168.1.100"
    assert settings.asr.language == "de"
    assert settings.asr.model == "mlx-community/whisper-small"
    assert settings.llm.model == "mlx-community/Qwen2.5-3B-Instruct"
    assert settings.llm.max_tokens == 1024
    assert settings.llm.temperature == 0.5
    assert settings.vlm.model == "custom-vlm"
