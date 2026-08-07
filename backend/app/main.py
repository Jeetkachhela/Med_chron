import logging
import os
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
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

# ── Single CORS middleware via manual origin reflection ──────────
# This replaces both the old CORSMiddleware AND the custom middleware
# to avoid duplicate Access-Control-Allow-Origin headers.
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")

    # Handle preflight (OPTIONS) immediately
    if request.method == "OPTIONS":
        response = JSONResponse(content={"status": "ok"}, status_code=200)
    else:
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(f"Unhandled Exception in middleware: {exc}", exc_info=True)
            response = JSONResponse(
                status_code=500,
                content={"detail": "An unexpected server error occurred."}
            )

    # Reflect the requesting origin (or * for non-browser clients)
    response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, User-Agent, X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix="")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )

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

# Catch-all to ensure CORS headers on 404s for the /api prefix
@app.api_route("/api/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def catch_all_api(path_name: str):
    return {"detail": f"Endpoint /api/{path_name} not found. Did you mean /api/v1/{path_name}?"}
