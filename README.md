# Trawl

[![CI](https://github.com/pranav-cheraku/trawl/actions/workflows/ci.yml/badge.svg)](https://github.com/pranav-cheraku/trawl/actions/workflows/ci.yml)
[![Deploy](https://github.com/pranav-cheraku/trawl/actions/workflows/deploy.yml/badge.svg)](https://github.com/pranav-cheraku/trawl/actions/workflows/deploy.yml)

Trawl is a RAG-powered product spec generator. Product managers connect feedback sources (App Store reviews, CSV uploads), query their feedback corpus in natural language, and get auto-generated feature specs displayed in an editable Kanban board with full citation traceability and RAG transparency.

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL 16 + pgvector |
| Queue | Celery + Redis 7 |
| LLM | Anthropic Claude (claude-sonnet-4-20250514) |
| Embeddings | Voyage AI (voyage-3, 1024 dimensions) |
| Auth | NextAuth.js v5 (Google OAuth) + FastAPI JWT |
| Deployment | Vercel (frontend) + Railway (backend) |

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Python 3.11

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/pranav-cheraku/trawl.git
cd trawl

# 2. Set up backend environment variables
cp .env.example .env
# Edit .env with your Anthropic, Voyage AI, and JWT secret values

# 3. Create frontend environment variables
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-this-to-a-random-string
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EOF

# 4. Start backend services (Postgres + Redis + FastAPI + Celery)
docker-compose up -d

# 5. Run database migrations
cd backend && source venv/bin/activate && alembic upgrade head && cd ..

# 6. Start the frontend
cd frontend && npm install && npm run dev
```

The backend API runs on `http://localhost:8000` and the frontend on `http://localhost:3000`.

### Environment Variables

#### Backend (`.env`)

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (asyncpg) |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `VOYAGE_API_KEY` | Voyage AI API key for embeddings |
| `JWT_SECRET` | Shared secret for HS256 JWT signing (must match frontend `NEXTAUTH_SECRET`) |

#### Frontend (`frontend/.env.local`)

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXTAUTH_URL` | Frontend base URL for NextAuth |
| `NEXTAUTH_SECRET` | Must match backend `JWT_SECRET` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Project Structure

```
trawl/
├── frontend/               # Next.js 14 App Router
│   └── src/
│       ├── app/            # Pages and API routes
│       ├── components/     # React components
│       ├── lib/            # API client, auth config
│       └── types/          # TypeScript interfaces
├── backend/                # FastAPI
│   └── app/
│       ├── models/         # SQLAlchemy ORM models
│       ├── schemas/        # Pydantic request/response schemas
│       ├── routers/        # API route handlers
│       ├── middleware/      # JWT auth middleware
│       ├── services/       # Business logic (RAG pipeline)
│       └── tasks/          # Celery background tasks
├── docker-compose.yml      # Local dev: Postgres + Redis + API + Worker
└── .github/workflows/      # CI/CD pipelines
```
