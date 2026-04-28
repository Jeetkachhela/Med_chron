import logging
import os
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import get_db
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.db.database import engine, Base

# Database tables are now managed by Alembic.
# Run migrations using: alembic upgrade head

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
# Read from CORS_ORIGINS env var (comma-separated) for production flexibility
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in _cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
@app.head("/")
def root():
    return {"message": "Welcome to the Medical Chronology API"}

@app.get("/debug-db")
def debug_db(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Database connection verified"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
