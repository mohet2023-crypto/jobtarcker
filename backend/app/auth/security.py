from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.config import (
    get_access_token_expire_minutes,
    get_jwt_algorithm,
    get_jwt_secret_key,
)

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return password_hasher.verify(plain_password, password_hash)


def create_access_token(subject: str | int, expires_minutes: int | None = None) -> str:
    expire_minutes = (
        expires_minutes
        if expires_minutes is not None
        else get_access_token_expire_minutes()
    )
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(
        payload,
        get_jwt_secret_key(),
        algorithm=get_jwt_algorithm(),
    )


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        get_jwt_secret_key(),
        algorithms=[get_jwt_algorithm()],
    )
