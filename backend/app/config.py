"""Application configuration loaded from environment variables.

Secrets must come from the environment (or an untracked backend/.env file).
Never hardcode production credentials here.
"""

from __future__ import annotations

import os
from pathlib import Path

_ENV_LOADED = False

# Rejected when APP_ENV=production. Safe for local/tests only.
_INSECURE_JWT_SECRETS = frozenset(
    {
        "changeme",
        "change-me",
        "secret",
        "jwt-secret",
        "jwt_secret",
        "dev",
        "development",
        "password",
        "your-secret-key",
        "your_jwt_secret_here",
        "test-only-jwt-secret-key-not-for-production",
    }
)


def load_env_file() -> None:
    """Load backend/.env into os.environ without adding python-dotenv."""
    global _ENV_LOADED
    if _ENV_LOADED:
        return

    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)

    _ENV_LOADED = True


def app_env() -> str:
    load_env_file()
    return os.environ.get("APP_ENV", "development").strip().lower() or "development"


def is_production() -> bool:
    return app_env() == "production"


def get_database_url() -> str:
    load_env_file()
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. "
            "Copy backend/.env.example to backend/.env and configure it, "
            "or export DATABASE_URL."
        )
    return database_url


def get_jwt_secret_key() -> str:
    load_env_file()
    secret = os.environ.get("JWT_SECRET_KEY", "").strip()
    if not secret:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. "
            "Add a strong secret to backend/.env before using authentication."
        )
    return secret


def get_jwt_algorithm() -> str:
    load_env_file()
    return os.environ.get("JWT_ALGORITHM", "HS256").strip() or "HS256"


def get_access_token_expire_minutes() -> int:
    load_env_file()
    raw = os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30").strip() or "30"
    return int(raw)


def get_frontend_origins() -> list[str]:
    """Explicit CORS allowlist. Never returns '*'."""
    load_env_file()

    configured = os.environ.get("FRONTEND_ORIGIN", "").strip()
    origins: set[str] = set()

    if configured:
        for part in configured.split(","):
            origin = part.strip().rstrip("/")
            if origin:
                if origin == "*":
                    raise RuntimeError(
                        "FRONTEND_ORIGIN cannot be '*'. "
                        "Set an explicit frontend origin for credentialed API use."
                    )
                origins.add(origin)

    if is_production():
        if not origins:
            raise RuntimeError(
                "FRONTEND_ORIGIN must be set when APP_ENV=production "
                "(example: https://your-frontend.example.com)."
            )
        return sorted(origins)

    # Development: keep local Vite origins available.
    if not origins:
        origins = {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }
    else:
        twin_origins: set[str] = set()
        for origin in origins:
            if "://localhost" in origin:
                twin_origins.add(
                    origin.replace("://localhost", "://127.0.0.1", 1)
                )
            elif "://127.0.0.1" in origin:
                twin_origins.add(
                    origin.replace("://127.0.0.1", "://localhost", 1)
                )
        origins.update(twin_origins)

    return sorted(origins)


def get_allowed_hosts() -> list[str] | None:
    """Optional TrustedHost allowlist. None means middleware is not installed."""
    load_env_file()
    raw = os.environ.get("ALLOWED_HOSTS", "").strip()
    if not raw:
        return None

    hosts = [host.strip() for host in raw.split(",") if host.strip()]
    if not hosts:
        return None
    if "*" in hosts:
        raise RuntimeError(
            "ALLOWED_HOSTS cannot include '*'. "
            "List explicit hostnames (example: api.example.com,localhost)."
        )
    return hosts


def validate_runtime_config() -> None:
    """Fail fast on unsafe production configuration when the app starts."""
    # Auth is part of this API; require JWT settings whenever the app boots.
    secret = get_jwt_secret_key()
    _ = get_jwt_algorithm()
    _ = get_access_token_expire_minutes()
    _ = get_frontend_origins()

    if is_production():
        lowered = secret.lower()
        if lowered in _INSECURE_JWT_SECRETS or len(secret) < 32:
            raise RuntimeError(
                "JWT_SECRET_KEY is too weak for production. "
                "Use a long random secret (at least 32 characters)."
            )
        if "YOUR_" in secret or secret.startswith("replace"):
            raise RuntimeError(
                "JWT_SECRET_KEY still looks like a placeholder. "
                "Set a real production secret before starting the API."
            )
