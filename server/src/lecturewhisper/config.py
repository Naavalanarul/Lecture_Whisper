"""Configuration system for Lecture Whisper."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    TomlConfigSettingsSource,
)

DATA_DIR = Path.home() / ".lecturewhisper"
CONFIG_PATH = DATA_DIR / "config.toml"


class ASRConfig(BaseSettings):
    """Configuration for Automatic Speech Recognition (ASR)."""

    language: str = "en"
    model: str = "mlx-community/whisper-large-v3-turbo"
    model_alt: str = "mlx-community/whisper-large-v3"


class LLMConfig(BaseSettings):
    """Configuration for Large Language Model (LLM) note generation."""

    model: str = "mlx-community/Qwen2.5-7B-Instruct-4bit"
    max_tokens: int = 4096
    temperature: float = 0.1


class VLMConfig(BaseSettings):
    """Configuration for Vision-Language Model (VLM) slide and visual extraction."""

    model: str = "mlx-community/Qwen2.5-VL-7B-Instruct-4bit"


class ServerConfig(BaseSettings):
    """Configuration for the Lecture Whisper FastAPI server."""

    host: str = "0.0.0.0"
    port: int = 8420


class Settings(BaseSettings):
    """Lecture Whisper application settings loaded from TOML and environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="LW_",
        env_nested_delimiter="__",
        toml_file=str(CONFIG_PATH),
    )

    data_dir: Path = DATA_DIR
    asr: ASRConfig = Field(default_factory=ASRConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    vlm: VLMConfig = Field(default_factory=VLMConfig)
    server: ServerConfig = Field(default_factory=ServerConfig)

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        """Customise settings sources to include TOML file loading."""
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
            TomlConfigSettingsSource(settings_cls, toml_file=CONFIG_PATH),
        )


def get_settings() -> Settings:
    """Load settings from config file and environment."""
    return Settings()


def ensure_data_dirs(settings: Settings) -> None:
    """Create data directories if they don't exist."""
    for subdir in ["storage", "models", "logs", "adapters", "storage/recordings"]:
        (settings.data_dir / subdir).mkdir(parents=True, exist_ok=True)
