from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

MAX_CHUNK_TOKENS = 200
OVERLAP_TOKENS = 100


def chunk_feedback_items(
    items: list[dict],
) -> list[dict]:
    """Split feedback items into chunks for embedding.

    Short items (< MAX_CHUNK_TOKENS) stay whole as a single chunk.
    Long items are split on paragraph boundaries with token overlap.

    Args:
        items: list of dicts with keys 'id' (UUID) and 'content' (str).

    Returns:
        list of dicts with keys: feedback_item_id, chunk_text, chunk_index, token_count.
    """
    all_chunks: list[dict] = []

    for item in items:
        item_id = item["id"]
        content = item["content"]
        tokens = content.split()
        token_count = len(tokens)

        if token_count <= MAX_CHUNK_TOKENS:
            all_chunks.append({
                "feedback_item_id": item_id,
                "chunk_text": content,
                "chunk_index": 0,
                "token_count": token_count,
            })
        else:
            chunks = _split_long_text(content)
            for idx, chunk_text in enumerate(chunks):
                all_chunks.append({
                    "feedback_item_id": item_id,
                    "chunk_text": chunk_text,
                    "chunk_index": idx,
                    "token_count": len(chunk_text.split()),
                })

    logger.info(
        "Chunked %d items into %d chunks", len(items), len(all_chunks)
    )
    return all_chunks


def _split_long_text(text: str) -> list[str]:
    """Split long text on paragraph boundaries with token overlap."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    if not paragraphs:
        return [text]

    # If paragraphs are small enough, merge into chunks up to MAX_CHUNK_TOKENS
    chunks: list[str] = []
    current_tokens: list[str] = []

    for para in paragraphs:
        para_tokens = para.split()

        if len(current_tokens) + len(para_tokens) <= MAX_CHUNK_TOKENS:
            current_tokens.extend(para_tokens)
        else:
            if current_tokens:
                chunks.append(" ".join(current_tokens))
                # Keep overlap from end of current chunk
                overlap = current_tokens[-OVERLAP_TOKENS:] if len(current_tokens) > OVERLAP_TOKENS else []
                current_tokens = overlap + para_tokens
            else:
                # Single paragraph exceeds limit — split by sentences
                sentence_chunks = _split_by_sentences(para)
                chunks.extend(sentence_chunks[:-1])
                last_tokens = sentence_chunks[-1].split() if sentence_chunks else []
                current_tokens = last_tokens

    if current_tokens:
        chunks.append(" ".join(current_tokens))

    return chunks if chunks else [text]


def _split_by_sentences(text: str) -> list[str]:
    """Split text by sentence boundaries when paragraphs are too long."""
    # Simple sentence splitting on period + space
    sentences = []
    current = ""
    for char in text:
        current += char
        if char in ".!?" and len(current.split()) >= 1:
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())

    if not sentences:
        return [text]

    # Merge sentences into chunks
    chunks: list[str] = []
    current_tokens: list[str] = []

    for sentence in sentences:
        sent_tokens = sentence.split()
        if len(current_tokens) + len(sent_tokens) <= MAX_CHUNK_TOKENS:
            current_tokens.extend(sent_tokens)
        else:
            if current_tokens:
                chunks.append(" ".join(current_tokens))
                overlap = current_tokens[-OVERLAP_TOKENS:] if len(current_tokens) > OVERLAP_TOKENS else []
                current_tokens = overlap + sent_tokens
            else:
                # Single sentence exceeds limit — just include it
                chunks.append(" ".join(sent_tokens))
                current_tokens = []

    if current_tokens:
        chunks.append(" ".join(current_tokens))

    return chunks if chunks else [text]
