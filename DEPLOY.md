# Deployment (Step 11B + 11C)

Minimal notes for running and deploying Deadline Dash.
Portfolio documentation comes later.

## Chosen production architecture

| Layer | Platform |
| --- | --- |
| Frontend | Vercel (static Vite build) |
| Backend | Render (Python web service) |
| Database | Render managed PostgreSQL |

HTTPS is provided by both platforms.

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

## Production environment variables

### Backend (Render)

- `APP_ENV=production`
- `DATABASE_URL` — from Render PostgreSQL (normalized to `postgresql+psycopg://` at runtime)
- `JWT_SECRET_KEY` — long random secret (Render can generate)
- `JWT_ALGORITHM=HS256`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30`
- `FRONTEND_ORIGIN` — exact deployed frontend origin, e.g. `https://your-app.vercel.app`
- `ALLOWED_HOSTS` — optional; set to the Render hostname, e.g. `deadline-dash-api.onrender.com`

Never commit real values.

### Frontend (Vercel)

- `VITE_API_BASE_URL` — deployed backend origin + `/api/v1`
  Example: `https://deadline-dash-api.onrender.com/api/v1`

Do not put secrets in `VITE_*` variables.

## Deploy order

1. Push this repository to GitHub.
2. Create the Render Blueprint / web service + PostgreSQL from `render.yaml`.
3. Confirm backend health: `GET https://<backend>/health` → `{"status":"ok"}`.
4. Confirm migrations: Render build runs `alembic upgrade head`.
5. Deploy the `frontend/` directory to Vercel.
6. Set Vercel env `VITE_API_BASE_URL` to the Render API `/api/v1` URL and redeploy.
7. Set Render `FRONTEND_ORIGIN` to the Vercel HTTPS origin and restart/redeploy the API.
8. Optionally set Render `ALLOWED_HOSTS` to the API hostname.

## Production commands

### Database migrations

```bash
cd backend
alembic upgrade head
```

On Render this runs during the build via `alembic upgrade head`.

### Backend startup (no --reload)

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend build

```bash
cd frontend
npm run build
```

Vercel runs this automatically. SPA routes are handled by `frontend/vercel.json`.

In production (`APP_ENV=production`), `/docs`, `/redoc`, and `/openapi.json` are disabled (404 is expected).

## Platform UI checklist

### GitHub

1. Create an empty GitHub repository (for example `jobtracker` or `deadline-dash`).
2. From this project folder:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git add DEPLOY.md render.yaml frontend/vercel.json backend/app/config.py
git commit -m "chore: add Render and Vercel deployment configuration"
git push -u origin master
```

### Render

1. Sign in at https://dashboard.render.com
2. **New → Blueprint** → select this GitHub repo (uses `render.yaml`)
   - or manually create a PostgreSQL database + Python Web Service with root dir `backend`
3. Web service settings if created manually:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt && alembic upgrade head`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. After first deploy, open the service URL + `/health` and confirm `{"status":"ok"}`.
5. Set `FRONTEND_ORIGIN` after the Vercel URL exists.
6. Optionally set `ALLOWED_HOSTS` to the Render service hostname (no `https://`).

### Vercel

1. Sign in at https://vercel.com
2. **Add New → Project** → import the GitHub repo.
3. Set Root Directory to `frontend`.
4. Framework preset: Vite.
5. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://<render-service>.onrender.com/api/v1`
6. Deploy.
7. Copy the Vercel HTTPS origin (no trailing slash) into Render `FRONTEND_ORIGIN`, then redeploy/restart the API.
