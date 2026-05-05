from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging
import socket
import time
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ── Build the final database URI ──────────────────────────────────
db_uri = settings.SQLALCHEMY_DATABASE_URI

# Heroku, Render, and Neon often provide 'postgres://' which SQLAlchemy 1.4+
# has deprecated in favor of 'postgresql://'
if db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)

# Normalize to psycopg2 driver for production compatibility
if "pg8000" in db_uri:
    db_uri = db_uri.replace("+pg8000", "+psycopg2", 1)
elif "postgresql://" in db_uri and "+psycopg2" not in db_uri:
    db_uri = db_uri.replace("postgresql://", "postgresql+psycopg2://", 1)

# ── Engine arguments ──────────────────────────────────────────────
engine_args = {
    "pool_pre_ping": True,   # Detect dropped connections before use
    "pool_recycle": 1800,    # Recycle connections every 30 min
    "pool_size": 5,
    "max_overflow": 10,
}

if db_uri.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

# PostgreSQL SSL & IPv4: psycopg2 uses connect_args for sslmode
if "postgresql" in db_uri:
    # Strip any sslmode query params — we handle it via connect_args
    for suffix in ["?sslmode=require", "&sslmode=require"]:
        db_uri = db_uri.replace(suffix, "")
    
    connect_args = {"sslmode": "require"}
    
    # ── Force IPv4 resolution ─────────────────────────────────────
    # Render's Docker containers often cannot reach IPv6 addresses.
    # We resolve the DB hostname to an IPv4 address and pass it via
    # psycopg2's 'hostaddr' parameter to bypass IPv6 DNS resolution.
    try:
        parsed = urlparse(db_uri)
        hostname = parsed.hostname
        if hostname and not hostname.replace(".", "").isdigit():
            # Resolve to IPv4 only (AF_INET)
            ipv4_addr = socket.getaddrinfo(hostname, None, socket.AF_INET)[0][4][0]
            connect_args["hostaddr"] = ipv4_addr
            logger.info(f"Resolved {hostname} -> {ipv4_addr} (forced IPv4)")
    except (socket.gaierror, IndexError, Exception) as e:
        logger.warning(f"IPv4 resolution failed for DB host, using default: {e}")
    
    engine_args["connect_args"] = connect_args

logger.info(f"Database URI scheme: {db_uri.split('@')[0].split('://')[0] if '://' in db_uri else 'unknown'}")

engine = create_engine(db_uri, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
