from __future__ import annotations

import asyncio
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
VOYAGE_MODEL = "voyage-4"
BATCH_SIZE = 50
MAX_RETRIES = 5


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

    Voyage recommends input_type="query" for retrieval queries (distinct from
    "document" used when indexing chunks). Returns a single 1024-dim vector.
    """
    vectors = await embed_texts([text], input_type="query")
    return vectors[0]


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
