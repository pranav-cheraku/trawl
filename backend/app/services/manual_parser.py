"""Manual paste parser: split a text blob into individual feedback items.

Strategy:
- Trim outer whitespace.
- Split on one-or-more blank lines (paragraph breaks).
- If only one paragraph results, fall back to splitting on single newlines
  (line-by-line).
- Drop empty results from either split.

Each returned item is a dict with `content` (str) and `external_id` (None).
The `external_id` is None because manual-paste items have no stable upstream
identifier -- they're authored ad-hoc by the user.
"""

from __future__ import annotations

import re


_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n+")
_LINE_SPLIT = re.compile(r"\n+")


def parse_paste(text: str) -> list[dict]:
    """Split a free-form paste into feedback items.

    See module docstring for the splitting rules.
    """
    trimmed = text.strip()
    if not trimmed:
        return []

    paragraphs = [p.strip() for p in _PARAGRAPH_SPLIT.split(trimmed) if p.strip()]
    if len(paragraphs) > 1:
        items = paragraphs
    else:
        items = [s.strip() for s in _LINE_SPLIT.split(trimmed) if s.strip()]

    return [{"content": item, "external_id": None} for item in items]
