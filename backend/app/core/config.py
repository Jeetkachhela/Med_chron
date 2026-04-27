import os
from typing import List
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Medical Chronology Platform"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Database Configuration
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "chrono_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "chrono_password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "medical_chronology")
    SQLALCHEMY_DATABASE_URI: str = ""

    @classmethod
    def _assemble_db_uri(cls, v: str, values: dict) -> str:
        """Build PostgreSQL URI from parts if SQLALCHEMY_DATABASE_URI not explicitly set."""
        if v and v.strip():
            return v
        server = values.get("POSTGRES_SERVER", "localhost")
        user = values.get("POSTGRES_USER", "chrono_user")
        password = values.get("POSTGRES_PASSWORD", "chrono_password")
        db = values.get("POSTGRES_DB", "medical_chronology")
        return f"postgresql+pg8000://{user}:{password}@{server}/{db}"

    def model_post_init(self, __context) -> None:
        """Assemble DB URI after all fields are loaded — fixes #13."""
        if not self.SQLALCHEMY_DATABASE_URI or not self.SQLALCHEMY_DATABASE_URI.strip():
            self.SQLALCHEMY_DATABASE_URI = (
                f"postgresql+pg8000://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
            )

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")

    # LLM Settings
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "phi3")

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: List[str] = ["application/pdf"]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure SECRET_KEY is set — Fix #2
if not settings.SECRET_KEY or settings.SECRET_KEY == "change_me_to_a_random_secret_key_in_production":
    import secrets
    settings.SECRET_KEY = secrets.token_hex(32)
    import logging
    logging.getLogger(__name__).warning(
        "SECRET_KEY not set in environment — using auto-generated key. "
        "Set SECRET_KEY in .env for production to persist sessions across restarts."
    )
