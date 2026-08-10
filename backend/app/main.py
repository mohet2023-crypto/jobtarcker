import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.applications.router import router as applications_router
from app.auth.router import router as auth_router
from app.dashboard.router import router as dashboard_router


def _load_env_file() -> None:
    """Load backend/.env into os.environ without adding python-dotenv."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.is_file():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _cors_origins() -> list[str]:
    """Local Vite origins for development. Keep the allowlist explicit."""
    _load_env_file()

    configured = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").strip()
    origins = {configured} if configured else set()

    # Always allow both localhost and 127.0.0.1 for the same Vite port.
    twin_origins: set[str] = set()
    for origin in origins:
        if "://localhost" in origin:
            twin_origins.add(origin.replace("://localhost", "://127.0.0.1", 1))
        elif "://127.0.0.1" in origin:
            twin_origins.add(origin.replace("://127.0.0.1", "://localhost", 1))
    origins.update(twin_origins)

    if not origins:
        origins = {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }

    return sorted(origins)


app = FastAPI(
    title="Deadline Dash API",
    description="Job and internship application tracking API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
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
