from logging.config import fileConfig

from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models.models import Base
from app.core.config import settings

target_metadata = Base.metadata

# Build the database URL from settings (same normalization as database.py)
_db_uri = settings.SQLALCHEMY_DATABASE_URI
if _db_uri.startswith("postgres://"):
    _db_uri = _db_uri.replace("postgres://", "postgresql://", 1)
if "pg8000" in _db_uri:
    _db_uri = _db_uri.replace("+pg8000", "+psycopg2", 1)
elif "postgresql://" in _db_uri and "+psycopg2" not in _db_uri:
    _db_uri = _db_uri.replace("postgresql://", "postgresql+psycopg2://", 1)

# Strip sslmode from URL — we pass it via connect_args
for suffix in ["?sslmode=require", "&sslmode=require"]:
    _db_uri = _db_uri.replace(suffix, "")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=_db_uri,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    Uses create_engine directly instead of engine_from_config to avoid
    configparser %-interpolation issues with URL-encoded passwords.
    """
    import socket
    from urllib.parse import urlparse

    connect_args = {}
    if "postgresql" in _db_uri:
        connect_args["sslmode"] = "require"

        # Force IPv4 resolution — Render cannot reach IPv6 addresses
        try:
            parsed = urlparse(_db_uri)
            hostname = parsed.hostname
            if hostname and not hostname.replace(".", "").isdigit():
                ipv4_addr = socket.getaddrinfo(hostname, None, socket.AF_INET)[0][4][0]
                connect_args["hostaddr"] = ipv4_addr
        except Exception:
            pass  # Fall back to default resolution

    connectable = create_engine(
        _db_uri,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
