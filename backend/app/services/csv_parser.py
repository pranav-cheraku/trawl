from __future__ import annotations

import csv
import io
import logging

logger = logging.getLogger(__name__)


def parse_csv(
    file_content: bytes,
    content_column: str = "content",
) -> list[dict]:
    """Parse a CSV file into feedback items.

    Requires one column designated as the content source (default: "content").
    All other columns are stored as metadata.

    Returns list of dicts with keys: content (str), metadata (dict).
    Raises ValueError if content_column is missing from headers.
    """
    text = file_content.decode("utf-8-sig")  # Handle BOM
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV file is empty or has no headers")

    if content_column not in reader.fieldnames:
        raise ValueError(
            f"Column '{content_column}' not found in CSV. "
            f"Available columns: {', '.join(reader.fieldnames)}"
        )

    items: list[dict] = []
    for row in reader:
        content = (row.get(content_column) or "").strip()
        if not content:
            continue

        metadata = {
            k: v for k, v in row.items()
            if k != content_column and v
        }

        items.append({
            "content": content,
            "metadata": metadata,
        })

    logger.info("Parsed %d items from CSV (content_column=%s)", len(items), content_column)
    return items
