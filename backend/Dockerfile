# Stage 1: builder
# Installs dependencies into /install so only compiled packages are copied to the final image,
# keeping it free of pip, wheel, and build tools.
FROM python:3.11-slim AS builder

WORKDIR /app

# Copy requirements first so the pip install layer caches across code-only changes.
COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# Stage 2: runtime
FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /install /usr/local

COPY . .

EXPOSE 8000

# docker-compose overrides this CMD for the worker service so both api and worker share one image.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
