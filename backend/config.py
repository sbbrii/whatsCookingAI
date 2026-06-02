"""Configuration management for What'sCooking AI."""

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


load_dotenv()


BASE_DIR = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    """Application settings loaded from environment variables."""

    groq_api_key: str | None
    upload_folder: Path
    vector_store_dir: Path
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    llm_model: str = "llama-3.3-70b-versatile"


def _resolve_path(value: str, default: str) -> Path:
    """Resolve configured paths relative to the project root."""
    candidate = Path(value or default)
    if candidate.is_absolute():
        return candidate
    return BASE_DIR / candidate


def get_settings() -> Settings:
    """Build application settings from environment variables."""
    return Settings(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        upload_folder=_resolve_path(os.getenv("UPLOAD_FOLDER", ""), "uploads"),
        vector_store_dir=_resolve_path(
            os.getenv("VECTOR_STORE_DIR", ""),
            "index/vector_store",
        ),
    )
