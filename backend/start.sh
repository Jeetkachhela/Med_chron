#!/bin/bash
set -e  # Exit immediately on error

# Render start script for the Medical Chronology API

# Determine working directory (Render vs Docker)
cd /opt/render/project/src/backend 2>/dev/null || cd /app 2>/dev/null || true

# Run database migrations
echo "==> Running database migrations..."
if alembic upgrade head; then
    echo "==> Migrations completed successfully."
else
    echo "==> WARNING: Migration failed — starting server anyway (tables may already exist)."
fi

# Create required directories
mkdir -p uploads pdf_cache

# Start the server
echo "==> Starting uvicorn server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
