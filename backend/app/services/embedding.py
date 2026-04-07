from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
VOYAGE_MODEL = "voyage-3"
BATCH_SIZE = 128


async def embed_texts(
    texts: list[str],
    input_type: str = "document",
) -> list[list[float]]:
    """Embed texts using the Voyage AI API.

    Batches requests to stay within Voyage's limit of 128 texts per call.
    Returns list of 1024-dim float vectors, one per input text.

    Raises httpx.HTTPStatusError on API failure.
    """
    if not settings.VOYAGE_API_KEY:
        raise RuntimeError("VOYAGE_API_KEY is not configured")

    all_embeddings: list[list[float]] = []
    headers = {
        "Authorization": f"Bearer {settings.VOYAGE_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            payload = {
                "input": batch,
                "model": VOYAGE_MODEL,
                "input_type": input_type,
            }

            resp = await client.post(
                VOYAGE_API_URL,
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

            batch_embeddings = [item["embedding"] for item in data["data"]]
            all_embeddings.extend(batch_embeddings)

    logger.info(
        "Embedded %d texts in %d batches",
        len(texts),
        (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE,
    )
    return all_embeddings
