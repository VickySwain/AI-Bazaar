# ── Base ─────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Development ───────────────────────────────────────────────────────────────
FROM deps AS development
COPY . .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Production ────────────────────────────────────────────────────────────────
FROM deps AS production
COPY . .

# Create non-root user
RUN groupadd --gid 1001 mlservice && \
    useradd --uid 1001 --gid mlservice --shell /bin/bash mlservice && \
    mkdir -p /app/logs /app/data/models && \
    chown -R mlservice:mlservice /app

USER mlservice

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:8000/health/ping || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--loop", "uvloop", \
     "--http", "httptools", \
     "--no-access-log"]
