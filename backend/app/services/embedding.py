from __future__ import annotations

import asyncio
import hashlib
import json
import logging

import httpx
import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
VOYAGE_MODEL = "voyage-4"
BATCH_SIZE = 50
MAX_RETRIES = 5

CACHE_TTL_SECONDS = 3600  # 1 hour
CACHE_KEY_PREFIX = "trawl:embed:query:"

_redis_client: aioredis.Redis | None = None  # type: ignore[type-arg]


def _get_redis() -> aioredis.Redis | None:  # type: ignore[type-arg]
    """Return a lazy-initialized async Redis client.

    Returns None if REDIS_URL is not configured. Uses short timeouts
    so Redis issues never block the request path.
    """
    global _redis_client
    if _redis_client is None and settings.REDIS_URL:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis_client


async def close_redis() -> None:
    """Close the cached Redis client and clear the singleton.

    Celery tasks must call this from inside their ``asyncio.run()`` body
    so the per-loop Redis client is disposed before the loop closes.
    Without this, the singleton survives across tasks holding Futures
    bound to a now-dead loop, raising "attached to a different loop"
    on the next task. FastAPI does not need to call this — its event
    loop lives for the worker's entire lifetime.
    """
    global _redis_client
    client = _redis_client
    _redis_client = None
    if client is not None:
        try:
            await client.aclose()
        except Exception:
            logger.warning("Failed to close Redis client", exc_info=True)


async def embed_texts(
    texts: list[str],
    input_type: str = "document",
) -> list[list[float]]:
    """Embed texts using the Voyage AI API.

    Batches requests (50 per call) with rate-limit retry and backoff.
    Returns list of 1024-dim float vectors, one per input text.
    """
    if not settings.VOYAGE_API_KEY:
        raise RuntimeError("VOYAGE_API_KEY is not configured")

    all_embeddings: list[list[float]] = []
    total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
    headers = {
        "Authorization": f"Bearer {settings.VOYAGE_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            payload = {
                "input": batch,
                "model": VOYAGE_MODEL,
                "input_type": input_type,
            }

            batch_embeddings = await _post_with_retry(
                client, payload, headers, batch_num, total_batches
            )
            all_embeddings.extend(batch_embeddings)

            # Pause between batches to stay under rate limits
            if i + BATCH_SIZE < len(texts):
                await asyncio.sleep(3.0)

    logger.info("Embedded %d texts in %d batches", len(texts), total_batches)
    return all_embeddings


async def embed_query(text: str) -> list[float]:
    """Embed a single search query using Voyage AI query mode.

    Results are cached in Redis for CACHE_TTL_SECONDS using a SHA-256 hash
    of the query text as the key. Redis failures are transparent — on any
    Redis error, we fall through to the Voyage API.
    """
    cache_key = CACHE_KEY_PREFIX + hashlib.sha256(text.encode()).hexdigest()
    redis = _get_redis()

    # --- Try cache read ---
    if redis is not None:
        try:
            cached = await redis.get(cache_key)
            if cached is not None:
                logger.debug("Embedding cache HIT for query: %s…", text[:60])
                result: list[float] = json.loads(cached)
                return result
            logger.info("Embedding cache MISS for query: %s…", text[:60])
        except Exception:
            logger.warning("Redis read failed, falling through to Voyage API", exc_info=True)

    # --- Voyage API call ---
    vectors = await embed_texts([text], input_type="query")
    embedding = vectors[0]

    # --- Try cache write ---
    if redis is not None:
        try:
            await redis.set(cache_key, json.dumps(embedding), ex=CACHE_TTL_SECONDS)
        except Exception:
            logger.warning("Redis write failed, embedding not cached", exc_info=True)

    return embedding


async def _post_with_retry(
    client: httpx.AsyncClient,
    payload: dict,
    headers: dict,
    batch_num: int,
    total_batches: int,
) -> list[list[float]]:
    """POST to Voyage API with exponential backoff on 429."""
    for attempt in range(MAX_RETRIES):
        resp = await client.post(
            VOYAGE_API_URL, json=payload, headers=headers
        )
        if resp.status_code == 429:
            wait = 2 ** (attempt + 1)  # 2, 4, 8, 16, 32 seconds
            logger.warning(
                "Rate limited on batch %d/%d, retrying in %ds (attempt %d/%d)",
                batch_num, total_batches, wait, attempt + 1, MAX_RETRIES,
            )
            await asyncio.sleep(wait)
            continue
        resp.raise_for_status()
        data = resp.json()
        return [item["embedding"] for item in data["data"]]

    # Final attempt — let it raise if still 429
    resp = await client.post(VOYAGE_API_URL, json=payload, headers=headers)
    resp.raise_for_status()
    data = resp.json()
    return [item["embedding"] for item in data["data"]]
