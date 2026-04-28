import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import get_db
from app.api.api_v1.api import api_router
from app.core.config import settings
from app.db.database import engine, Base

# Database tables are managed by Alembic.
# Run migrations using: alembic upgrade head

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
# allow_origin_regex supports Vercel preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
