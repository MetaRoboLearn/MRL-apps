# 🐳 Containerisation

This folder contains everything needed to build and run MetaRoboLearn with Docker.

```
containerisation/
├── docker-compose.yml   # Production stack (nginx + backend)
├── .env                 # Your secrets – gitignored, never commit
├── .env.example         # Template – copy to .env and fill in
└── nginx/
    ├── Dockerfile       # Multi-stage: builds React frontend + serves via nginx
    ├── nginx.conf       # HTTP→HTTPS redirect, SPA routing, API/WS proxy
    └── entrypoint.sh    # Auto-generates a self-signed TLS cert on first start
```

The production stack has two services:

| Service | Build | Role |
|---------|-------|------|
| `backend` | `../server` | Flask API (gunicorn + gevent) |
| `nginx` | `nginx/Dockerfile` | HTTPS termination, static SPA, reverse-proxy to backend |

> The database is external. Set `DATABASE_URL` in `.env` to point at your PostgreSQL instance.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin on Linux)
- Git

---

## First-time setup

### 1 · Clone and enter the repo

```bash
git clone <repo-url>
cd MRL-apps
```

### 2 · Configure environment variables

```bash
cp containerisation/.env.example containerisation/.env
```

Open `containerisation/.env` and fill in every value:

```env
# Full SQLAlchemy connection string to your PostgreSQL instance
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>

FLASK_SECRET_KEY=<long-random-hex-string>
FLASK_ENV=production

# URL the browser uses — https://localhost for local, https://yourdomain.com for production
CORS_ORIGIN=https://localhost

# Optional – only needed when a physical robot broker is connected
BROKER_API_URL=http://<broker-host>:8000
BROKER_WS_URL=ws://<broker-host>:8000
BROKER_CLIENT_NAME=mrl-server
BROKER_API_KEY=
```

> **Never commit `containerisation/.env`** – it is already listed in `.gitignore`.

To generate a strong `FLASK_SECRET_KEY` in PowerShell:
```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```
Or on Linux/macOS:
```bash
openssl rand -hex 32
```

### 3 · Build and start the stack

Run all commands from the **project root** (`MRL-apps/`):

```bash
docker compose -f containerisation/docker-compose.yml up --build -d
```

Docker will:
1. Build the Flask backend image
2. Build the nginx image (compiles the React/Vite frontend inside it as a multi-stage build)
3. Start both containers

On the **first start** nginx automatically generates a self-signed TLS certificate and stores it in the `ssl_certs` Docker volume so it persists across restarts.

### 4 · Run database migrations

After the first start (or whenever new migrations are added):

```bash
docker compose -f containerisation/docker-compose.yml exec backend flask db upgrade
```

### 5 · Open the application

| URL | Notes |
|-----|-------|
| `https://localhost` | Web application (HTTPS) |
| `http://localhost` | Automatically redirects to HTTPS |

> Your browser will warn about the self-signed certificate.  
> Click **Advanced → Proceed** (Chrome) or **Accept the Risk** (Firefox).  
> To use a real certificate see [Using a real TLS certificate](#-using-a-real-tls-certificate) below.

---

## Useful commands

```bash
# Live logs for all services
docker compose -f containerisation/docker-compose.yml logs -f

# Logs for a single service
docker compose -f containerisation/docker-compose.yml logs -f backend

# Shell inside the backend container
docker compose -f containerisation/docker-compose.yml exec backend sh

# Stop all containers (data volumes are preserved)
docker compose -f containerisation/docker-compose.yml down

# Stop and wipe all data volumes — DESTRUCTIVE
docker compose -f containerisation/docker-compose.yml down -v
```

---

## 🔄 Redeploying after a new commit

```bash
# 1. Pull the latest code
git pull

# 2. Rebuild changed images (unchanged layers are cached)
docker compose -f containerisation/docker-compose.yml build

# 3. Replace running containers with the new images (~1-2 s downtime)
docker compose -f containerisation/docker-compose.yml up -d --no-deps

# 4. Apply any new database migrations
docker compose -f containerisation/docker-compose.yml exec backend flask db upgrade
```

### What each step does

| Step | Effect |
|------|--------|
| `git pull` | Fetches the latest source code |
| `build` | Rebuilds only images whose source files changed (layer cache speeds this up) |
| `up -d --no-deps` | Recreates containers from new images without touching other services |
| `flask db upgrade` | Applies any pending Alembic migration scripts to the live database |

### Rolling back a bad deploy

```bash
# Find the previous good commit
git log --oneline -5

# Check out that commit
git checkout <previous-sha>

# Rebuild and restart
docker compose -f containerisation/docker-compose.yml build
docker compose -f containerisation/docker-compose.yml up -d --no-deps

# Undo the last database migration if needed
docker compose -f containerisation/docker-compose.yml exec backend flask db downgrade -1
```

---

## 🔒 Using a real TLS certificate

Replace the auto-generated cert with one from Let's Encrypt, mkcert, or your CA:

1. Obtain `server.crt` and `server.key` for your domain.
2. Use a bind-mount in `containerisation/docker-compose.yml` instead of the volume:

```yaml
# nginx service – replace the ssl_certs volume mount with:
volumes:
  - ./certs:/etc/nginx/ssl   # folder must contain server.crt and server.key
```

The entrypoint script skips certificate generation when both files already exist.

---

## 💻 Local development (without HTTPS)

Use the root `docker-compose.yml` for a lightweight dev setup — Vite dev server, Flask with hot-reload, no nginx:

```bash
# Uses the same containerisation/.env for secrets
docker compose up --build
```

| URL | Service |
|-----|---------|
| `http://localhost:3000` | Vite dev frontend |
| `http://localhost:5000` | Flask API |

---

## Logging & diagnostics

The backend logs to stdout (visible via `docker compose logs`).

| Env var | Default | Effect |
|---------|---------|--------|
| `LOG_LEVEL` | `INFO` | Set to `DEBUG` for verbose output, `WARNING` to reduce noise |
| `SQL_ECHO` | `false` | Set to `true` to print every SQL query |

The `/health` endpoint checks DB connectivity and returns:
- `200 {"status":"ok","db":"ok"}` — everything healthy
- `503 {"status":"degraded","db":"error","db_error":"..."}` — DB unreachable
