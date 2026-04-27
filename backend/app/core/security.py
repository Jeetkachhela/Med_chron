from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
import bcrypt
from app.core.config import settings
import os

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 hours

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    # Ensure password is not longer than 72 bytes to prevent ValueError
    pw_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode('utf-8')

def validate_password_strength(password: str) -> str | None:
    """Returns error message if password is too weak, None if OK. Fix #5."""
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not any(c.isupper() for c in password):
        return "Password must contain at least one uppercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one digit."
    return None
