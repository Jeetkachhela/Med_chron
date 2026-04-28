from fastapi import APIRouter
from app.api.endpoints import cases

api_router = APIRouter()
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
