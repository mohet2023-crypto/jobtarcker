# Deployment readiness (Step 11B)

Minimal notes for running Deadline Dash in development and production.
Portfolio documentation comes later.

## Development

### Backend

```bash
cd backend
# copy .env.example -> .env and fill in local values
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

API docs (development only): http://127.0.0.1:8001/docs  
Health: http://127.0.0.1:8001/health

### Frontend

```bash
cd frontend
# copy .env.example -> .env
npm run dev
```

Default Vite URL: http://localhost:5173

## Production

Do not use `--reload` in production.

### Required backend environment variables

- `APP_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET_KEY` (long random secret; never a placeholder)
- `JWT_ALGORITHM` (typically `HS256`)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`
- `FRONTEND_ORIGIN` (exact frontend origin, e.g. `https://app.example.com`)

Optional:

- `ALLOWED_HOSTS` — comma-separated hostnames for TrustedHostMiddleware  
  (example: `api.example.com`). Leave unset locally.

### Database migrations

```bash
cd backend
alembic upgrade head
```

### Backend startup

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Optional multi-worker example:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2
```

In production (`APP_ENV=production`), interactive docs (`/docs`, `/redoc`, `/openapi.json`) are disabled.

### Frontend build

```bash
cd frontend
# set VITE_API_BASE_URL to the production API base, including /api/v1
npm run build
```

Serve the generated `frontend/dist` directory with your static host or reverse proxy.

`VITE_API_BASE_URL` is the only frontend API base configuration. It is public build-time config, not a secret.
