from fastapi import FastAPI

from app.applications.router import router as applications_router
from app.auth.router import router as auth_router
from app.dashboard.router import router as dashboard_router

app = FastAPI(
    title="Deadline Dash API",
    description="Job and internship application tracking API",
    version="1.0.0",
)

app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(dashboard_router)


@app.get("/health")
def health():
    return {"status": "ok"}
