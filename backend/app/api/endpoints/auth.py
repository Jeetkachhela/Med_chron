from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.schemas import schemas
from app.core import security
from app.api.deps import get_current_user
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Simple in-memory rate limiter — Fix #5
_login_attempts: dict[str, list[float]] = {}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300  # 5 minutes


def _check_rate_limit(identifier: str):
    """Prevent brute-force attacks by limiting login attempts."""
    now = time.time()
    attempts = _login_attempts.get(identifier, [])
    # Prune old attempts
    attempts = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {LOGIN_WINDOW_SECONDS // 60} minutes.",
        )
    attempts.append(now)
    _login_attempts[identifier] = attempts


@router.post("/login", response_model=schemas.Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """OAuth2 compatible token login, get an access token for future requests."""
    _check_rate_limit(form_data.username)

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=schemas.UserResponse)
def register_user(
    user_in: schemas.UserCreate, db: Session = Depends(get_db)
):
    """Register a new user with password strength validation."""
    # Check password strength — Fix #5
    pw_error = security.validate_password_strength(user_in.password)
    if pw_error:
        raise HTTPException(status_code=400, detail=pw_error)

    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=schemas.UserResponse)
def get_user_me(current_user: User = Depends(get_current_user)):
    """Get current user details."""
    return current_user
