from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# ── Fix for SQLAlchemy 1.4+ ──────────────────────────────────────
# Heroku, Render, and Neon often provide 'postgres://' which SQLAlchemy 1.4+ 
# has deprecated in favor of 'postgresql://'
db_uri = settings.SQLALCHEMY_DATABASE_URI
if db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)

# Force psycopg2 for better compatibility on Render
if "pg8000" in db_uri:
    db_uri = db_uri.replace("pg8000", "psycopg2")
elif "postgresql://" in db_uri:
    db_uri = db_uri.replace("postgresql://", "postgresql+psycopg2://")

engine_args = {
    "pool_pre_ping": True,  # Fix for dropped connections in cloud environments
    "pool_recycle": 3600,
}

if db_uri.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}
# PostgreSQL specific: ensure SSL is handled if needed
if "postgresql" in db_uri and "sslmode" not in db_uri:
    if "?" in db_uri:
        db_uri += "&sslmode=require"
    else:
        db_uri += "?sslmode=require"

engine = create_engine(db_uri, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
