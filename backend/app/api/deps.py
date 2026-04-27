from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.core.config import settings
from app.core import security
from app.schemas import schemas
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/v1/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
) -> User:
    """
    Authenticate a user via:
    1. Standard Authorization: Bearer <token> header (preferred)
    2. Query parameter ?token=<token> (for PDF downloads via window.open)
    """
    auth_token = token or token_query
    
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            auth_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user
