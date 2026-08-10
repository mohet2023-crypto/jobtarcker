import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import jwt
from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()


def _load_env_file() -> None:
    """Load backend/.env into os.environ without adding python-dotenv."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.is_file():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_env_file()


def _get_jwt_secret_key() -> str:
    secret = os.environ.get("JWT_SECRET_KEY", "").strip()
    if not secret:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. "
            "Add a strong secret to backend/.env before using authentication."
        )
    return secret


def _get_jwt_algorithm() -> str:
    return os.environ.get("JWT_ALGORITHM", "HS256").strip() or "HS256"


def _get_access_token_expire_minutes() -> int:
    raw = os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30").strip() or "30"
    return int(raw)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return password_hasher.verify(plain_password, password_hash)


def create_access_token(subject: str | int, expires_minutes: int | None = None) -> str:
    expire_minutes = (
        expires_minutes
        if expires_minutes is not None
        else _get_access_token_expire_minutes()
    )
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, _get_jwt_secret_key(), algorithm=_get_jwt_algorithm())


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        _get_jwt_secret_key(),
        algorithms=[_get_jwt_algorithm()],
    )
