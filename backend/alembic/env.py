from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models.models import Base
from app.core.config import settings

target_metadata = Base.metadata

# Build the database URL from settings
_db_uri = settings.SQLALCHEMY_DATABASE_URI
if _db_uri.startswith("postgres://"):
    _db_uri = _db_uri.replace("postgres://", "postgresql://", 1)
if "pg8000" in _db_uri:
    _db_uri = _db_uri.replace("+pg8000", "+psycopg2", 1)
elif "postgresql://" in _db_uri and "+psycopg2" not in _db_uri:
    _db_uri = _db_uri.replace("postgresql://", "postgresql+psycopg2://", 1)

for suffix in ["?sslmode=require", "&sslmode=require"]:
    _db_uri = _db_uri.replace(suffix, "")


def run_migrations_offline() -> None:
    context.configure(
        url=_db_uri,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connect_args = {}
    if "postgresql" in _db_uri:
        connect_args["sslmode"] = "require"

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
