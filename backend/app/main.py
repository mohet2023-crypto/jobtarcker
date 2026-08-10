from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.applications.router import router as applications_router
from app.auth.router import router as auth_router
from app.config import (
    get_allowed_hosts,
    get_frontend_origins,
    is_production,
    validate_runtime_config,
)
from app.dashboard.router import router as dashboard_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    validate_runtime_config()
    yield


_production = is_production()

app = FastAPI(
    title="Deadline Dash API",
    description="Job and internship application tracking API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if _production else "/docs",
    redoc_url=None if _production else "/redoc",
    openapi_url=None if _production else "/openapi.json",
)

_allowed_hosts = get_allowed_hosts()
if _allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_frontend_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(dashboard_router)


@app.get("/health")
def health():
    return {"status": "ok"}
