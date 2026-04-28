#!/bin/bash
# Render start script for the Medical Chronology API

# Run database migrations
echo "Running database migrations..."
cd /opt/render/project/src/backend || cd /app
alembic upgrade head

# Start the server
echo "Starting uvicorn server..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
