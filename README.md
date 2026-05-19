# Trawl

[![CI](https://github.com/pranav-cheraku/trawl/actions/workflows/ci.yml/badge.svg)](https://github.com/pranav-cheraku/trawl/actions/workflows/ci.yml)

Trawl is a RAG-powered product spec generator. Product managers connect feedback sources, query their feedback corpus in natural language, and get auto-generated feature specs displayed in an editable Kanban board with full citation traceability.

Type an app name, pull 500 reviews, and get a prioritized product roadmap in minutes.

## Features

- **Five feedback connectors:** App Store reviews (multi-country dedupe), Google Play, Reddit (subreddit or keyword), CSV upload, and manual paste.
- **RAG chat with citations:** ask questions of the feedback corpus and get answers with inline `[Feedback #N]` citations that trace back to the exact source reviews.
- **"What Should We Build Next?":** a multi-query pipeline that explores the corpus, clusters themes, drafts prioritized specs, ranks them globally, and writes an executive summary.
- **RAG X-Ray panel:** every spec and answer exposes the retrieved chunks, similarity scores, and source attribution behind it.
- **Kanban specs board:** a four-column board (Backlog, Planned, In Progress, Done) with drag-and-drop, inline editing, citation chips, and CSV / Markdown export.

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL 16 + pgvector |
| Queue | Celery + Redis 7 |
| LLM | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Embeddings | Voyage AI (`voyage-4`, 1024 dimensions) |
| Auth | NextAuth.js v5 (Google OAuth) + FastAPI HS256 JWT |
| Deployment | Vercel (frontend) + Railway (backend + Redis) + Supabase (Postgres) |

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Python 3.11 (newer versions break `asyncpg` / `pydantic-core`)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/pranav-cheraku/trawl.git
cd trawl
```

### 2. Configure environment variables

Trawl uses a **dual `.env` setup** for the backend, plus one file for the frontend. All three are gitignored.

**Root `.env`** is read by `docker-compose`. Hostnames are Docker service names (`db`, `redis`):

```bash
cp .env.example .env
```

Then edit `.env`:

```
DATABASE_URL=postgresql+asyncpg://trawl:trawl@db:5432/trawl
REDIS_URL=redis://redis:6379/0
ANTHROPIC_API_KEY=sk-ant-your-key-here
VOYAGE_API_KEY=pa-your-key-here
JWT_SECRET=change-this-to-a-random-string
```

**`backend/.env`** is read by `uvicorn` and Celery when you run the backend directly on your host (not in Docker). It is identical to the root `.env` except the hostnames are `localhost`:

```
DATABASE_URL=postgresql+asyncpg://trawl:trawl@localhost:5432/trawl
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=sk-ant-your-key-here
VOYAGE_API_KEY=pa-your-key-here
JWT_SECRET=change-this-to-a-random-string
```

If you run Postgres and Redis in Docker but the backend on your host, you need both files. If you run everything in Docker, only the root `.env` is used.

**`frontend/.env.local`** holds the frontend variables:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-this-to-a-random-string
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

`NEXTAUTH_SECRET` must be byte-identical to the backend `JWT_SECRET`: NextAuth signs the session JWT with it and FastAPI verifies it with the same secret.

## Running it

There are two ways to run the stack locally.

### Option A: everything in Docker

```bash
docker-compose up
```

This starts all four backend services: Postgres (with pgvector), Redis, the FastAPI API, and the Celery worker. The API hot-reloads via a volume mount. Run the database migrations once the containers are up (see [Database migrations](#database-migrations)).

The frontend is not containerized. Start it separately:

```bash
cd frontend && npm install && npm run dev
```

### Option B: run each service yourself

This is the usual day-to-day setup: infrastructure in Docker, application processes on your host so they restart fast.

**1. Start Postgres and Redis:**

```bash
docker-compose up db redis
```

**2. Start the backend API** (new terminal):

```bash
cd backend
python3.11 -m venv venv          # first run only
source venv/bin/activate
pip install -r requirements.txt  # first run only
uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/health`. It should return `{"status":"healthy"}`. If `curl localhost:8000/health` hangs, restart with `--host 0.0.0.0` (the default binds to `127.0.0.1` only, and `localhost` may resolve to IPv6).

**3. Start the Celery worker** (new terminal, only needed for ingestion, spec generation, and Build Next):

```bash
cd backend
source venv/bin/activate
celery -A app.celery_app worker -B --loglevel=info
```

The `-B` flag embeds Celery beat in the worker, which runs the daily account-cleanup task. If you started the worker via `docker-compose up`, run `docker-compose stop worker` before starting a local one: two workers on the same Redis queue cause stale task execution.

**4. Start the frontend** (new terminal):

```bash
cd frontend
npm install   # first run only
npm run dev
```

The API runs on `http://localhost:8000` and the frontend on `http://localhost:3000`. Interactive API docs are at `http://localhost:8000/docs`.

## Database migrations

Migrations are managed with Alembic. After cloning, or after pulling model changes:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

To create a new migration after changing a model:

```bash
alembic revision --autogenerate -m "description"
```

## Environment Variables

### Backend (`.env` and `backend/.env`)

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `REDIS_URL` | Redis connection string (Celery broker and query cache) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `VOYAGE_API_KEY` | Voyage AI API key for embeddings |
| `JWT_SECRET` | Shared HS256 secret for JWT signing; must match the frontend `NEXTAUTH_SECRET` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXTAUTH_URL` | Frontend base URL for NextAuth |
| `NEXTAUTH_SECRET` | Must match the backend `JWT_SECRET` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Development commands

| Task | Command |
| :--- | :--- |
| Frontend dev server | `cd frontend && npm run dev` |
| Frontend lint | `cd frontend && npm run lint` |
| Frontend type check | `cd frontend && npx tsc --noEmit` |
| Backend lint | `cd backend && flake8 app/` |
| Backend type check | `cd backend && mypy app/` |
| Backend tests | `cd backend && pytest` |
| Reset the database | `docker-compose down -v && docker-compose up db redis` |

CI runs the frontend lint / type check and the backend flake8 / mypy on every push to `main` and on pull requests. Run both backend checks locally: flake8 short-circuits the CI job, so a mypy failure can be hidden if flake8 fails first.

## Project Structure

```
trawl/
├── frontend/                   # Next.js 14 App Router
│   └── src/
│       ├── app/                # Route groups: (app), (legal), demo, api
│       ├── components/         # React components, grouped by feature
│       ├── lib/                # API client, auth config, hooks, helpers
│       ├── content/            # Markdown for the docs and legal pages
│       └── types/              # TypeScript interfaces
├── backend/                    # FastAPI + Celery
│   ├── app/
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── routers/            # API route handlers
│   │   ├── middleware/         # JWT auth and demo-access middleware
│   │   ├── services/           # RAG pipeline, connectors, parsers
│   │   ├── tasks/              # Celery background tasks
│   │   └── celery_app.py       # Celery + Redis configuration
│   ├── alembic/versions/       # Database migrations
│   ├── scripts/                # Demo seeding and utility scripts
│   ├── tests/                  # pytest suite
│   └── Dockerfile              # Multi-stage Python 3.11 image (api + worker)
├── docker-compose.yml          # Local stack: Postgres + Redis + api + worker
└── .github/workflows/          # CI (lint + type check)
```

## RAG Pipeline

1. **Ingest:** App Store / Google Play / Reddit / CSV / manual paste land in the database as feedback items.
2. **Chunk:** feedback-aware splitting (short text stays whole, long text splits on paragraphs with overlap).
3. **Embed:** Voyage `voyage-4`, with query embeddings cached in Redis.
4. **Retrieve:** pgvector cosine similarity, with an optional source filter.
5. **Generate:** Claude produces structured specs and cited answers.
6. **Transparency:** retrieval metadata is stored alongside each spec and answer to power the RAG X-Ray panel.

## Deployment

Trawl runs in production across three platforms. The frontend deploys to Vercel, the FastAPI API and Celery worker run on Railway (alongside a Railway Redis service), and Postgres with pgvector is hosted on Supabase. Vercel and Railway each deploy automatically on push to `main` via their own GitHub integrations; there is no deploy workflow in this repo. Production secrets live in the Railway and Vercel dashboards, never in the repository.
