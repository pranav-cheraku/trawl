# backend/Dockerfile — Multi-stage build for the FastAPI backend
#
# Stage 1 (builder): installs Python dependencies into an isolated prefix so
# that only the compiled packages — not pip, wheel, or build tools — are copied
# into the final image. This keeps the production image lean.
#
# Stage 2 (production): copies the installed packages and the app source, then
# sets the default entrypoint. docker-compose overrides the CMD for the worker
# service so both api and worker share a single image.

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

COPY requirements.txt .

# Install all dependencies into /install so they can be cleanly copied to the
# final stage without carrying along pip's cache or build artifacts.
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: production ───────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Pull the pre-built packages from the builder stage.
COPY --from=builder /install /usr/local

# Copy application source code.
COPY . .

EXPOSE 8000

# Default command runs the API server. The Celery worker service in
# docker-compose.yml overrides this with its own command.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
