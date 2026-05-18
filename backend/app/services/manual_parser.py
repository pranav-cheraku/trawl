"""Manual-paste text parser for Trawl.

Splits free-form pasted text into individual feedback items. Blank-line
splitting is preferred (most formatted pastes use it); if the text has no
blank lines, falls back to single-newline splitting.
"""
from __future__ import annotations

import re


_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n+")
_LINE_SPLIT = re.compile(r"\n+")


def parse_paste(text: str) -> list[dict]:
    """Split pasted text into feedback items.

    Splits on blank lines first; falls back to single newlines if only one
    paragraph results. external_id is always None for manual-paste items.
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
