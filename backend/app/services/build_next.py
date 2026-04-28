from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.embedding import embed_query
from app.services.generation import (
    MODEL_ID,
    _format_chunks_for_prompt,
)
from app.services.retrieval import RetrievedChunk, retrieve_chunks

logger = logging.getLogger(__name__)

# Five hardcoded exploratory queries. Cached after first run via embed_query
# (Redis SHA-256 key, 1-hour TTL) so repeated runs pay only the cache lookup.
BUILD_NEXT_QUERIES: list[str] = [
    "What are users complaining about?",
    "What features are users requesting?",
    "What experiences received low ratings?",
    "What do users praise about the product?",
    "Where do users encounter friction or confusion?",
]

TOP_K_PER_QUERY = 10
RETRIEVAL_THRESHOLD = 0.25
CLUSTER_MAX_TOKENS = 4096
SPEC_MAX_TOKENS = 4096
SUMMARY_MAX_TOKENS = 1024


@dataclass
class ClusteredTheme:
    """Output of the Claude clustering call, before persistence.

    ``chunk_indices`` are 0-indexed into the deduped chunk list returned by
    ``_embed_and_retrieve``. ``severity_hint`` is Claude's qualitative
    severity estimate in the range 0..1.
    """

    name: str
    description: str
    chunk_indices: list[int]  # 0-indexed into the deduped chunk list
    severity_hint: float  # 0..1, Claude's qualitative severity estimate

    # Computed at task time after clustering:
    frequency_pct: float = 0.0
    severity_score: float = 0.0
    chunk_count: int = 0


@dataclass
class GeneratedSpec:
    """One spec generated for a theme.

    ``content`` mirrors the same shape as the existing spec generation output
    (``problem``, ``proposed_solution``, ``user_stories``, etc.) so the Celery
    task can persist it via the same ORM path.
    """

    title: str
    content: dict
    build_rank: int = 0  # filled in during global ranking phase


@dataclass
class ThemeWithSpecs:
    """A theme paired with its generated specs (or empty if generation failed)."""

    theme: ClusteredTheme
    specs: list[GeneratedSpec]
    generation_failed: bool


@dataclass
class BuildNextResult:
    """Final output of run_build_next, returned to the Celery task for persistence.

    ``chunk_source_queries`` maps each retained chunk_id to the query string
    that surfaced it with the highest similarity score, for RAG X-Ray attribution.
    ``retrieval_metadata`` is the dict from ``_embed_and_retrieve`` and populates
    the ``build_reports.retrieval_metadata`` JSONB column.
    """

    themes: list[ThemeWithSpecs]
    chunks: list[RetrievedChunk]
    chunk_source_queries: dict[uuid.UUID, str]  # chunk_id → which query surfaced it
    executive_summary: str
    build_order: list[dict] = field(default_factory=list)
    retrieval_metadata: dict = field(default_factory=dict)


async def _embed_and_retrieve(
    db: AsyncSession,
    project_id: uuid.UUID,
    source_ids: list[uuid.UUID] | None,
) -> tuple[list[RetrievedChunk], dict[uuid.UUID, str], dict]:
    """Embed all 5 queries, retrieve per query, dedupe, and return.

    Runs all 5 ``embed_query`` calls concurrently via ``asyncio.gather``; each
    result is already Redis-cached after the first hit so subsequent runs are
    sub-millisecond. The 5 ``retrieve_chunks`` calls are executed sequentially
    because ``AsyncSession`` / asyncpg is single-flight and cannot safely run
    concurrent statements on the same connection.

    Deduplication keeps the highest-similarity occurrence of each chunk_id across
    queries. The final list is sorted by similarity descending and ``retrieval_rank``
    is reassigned from 1 sequentially.

    Returns:
        A 3-tuple of:
        - ``deduped_chunks`` — deduplicated, sorted list of ``RetrievedChunk``.
        - ``source_query_attribution`` — maps each retained chunk_id to the query
          that surfaced it with the highest similarity (ties broken by query order).
        - ``metadata`` — timing + count dict for the ``retrieval_metadata`` JSONB column.
    """
    start_time = time.monotonic()

    # Embed all 5 queries concurrently. embed_query is Redis-cached so repeated
    # runs against unchanged queries pay only the cache lookup cost.
    query_embeddings: list[list[float]] = await asyncio.gather(
        *(embed_query(q) for q in BUILD_NEXT_QUERIES)
    )

    embed_elapsed_ms = int((time.monotonic() - start_time) * 1000)
    retrieve_start = time.monotonic()

    # Retrieve per query. We serialize because SQLAlchemy AsyncSession is
    # not safe for concurrent statement execution — asyncpg's underlying
    # connection is single-flight. Wall-clock cost is negligible vs. the
    # Claude calls downstream.
    per_query_results: list[tuple[list[RetrievedChunk], int]] = []
    for emb in query_embeddings:
        result = await retrieve_chunks(
            db,
            project_id,
            emb,
            top_k=TOP_K_PER_QUERY,
            threshold=RETRIEVAL_THRESHOLD,
            source_ids=source_ids,
        )
        per_query_results.append(result)

    retrieve_elapsed_ms = int((time.monotonic() - retrieve_start) * 1000)

    # Dedupe by chunk_id, keeping the highest-similarity occurrence.
    # Track which query surfaced each retained chunk for X-Ray attribution.
    deduped: dict[uuid.UUID, RetrievedChunk] = {}
    source_query: dict[uuid.UUID, str] = {}

    for query_text, (chunks, _total) in zip(
        BUILD_NEXT_QUERIES, per_query_results, strict=True
    ):
        for chunk in chunks:
            existing = deduped.get(chunk.chunk_id)
            # Strict `>` so the FIRST query that surfaces a chunk wins on exact ties —
            # gives priority to earlier queries in BUILD_NEXT_QUERIES.
            if existing is None or chunk.similarity_score > existing.similarity_score:
                deduped[chunk.chunk_id] = chunk
                source_query[chunk.chunk_id] = query_text

    # Final list ordered by similarity desc, with rank reassigned from 1.
    ordered = sorted(deduped.values(), key=lambda c: -c.similarity_score)
    # Overwrite per-query retrieval_rank with the global rank across all 5 queries.
    for new_rank, chunk in enumerate(ordered, start=1):
        chunk.retrieval_rank = new_rank

    metadata = {
        "queries": BUILD_NEXT_QUERIES,
        "top_k_per_query": TOP_K_PER_QUERY,
        "threshold": RETRIEVAL_THRESHOLD,
        "raw_total": sum(len(chunks) for chunks, _ in per_query_results),
        "deduped_total": len(ordered),
        "embed_ms": embed_elapsed_ms,
        "retrieve_ms": retrieve_elapsed_ms,
    }

    logger.info(
        "Build Next retrieval: %d raw, %d deduped (project %s, %s sources)",
        metadata["raw_total"],
        len(ordered),
        project_id,
        "all" if source_ids is None else len(source_ids),
    )

    return ordered, source_query, metadata


CLUSTER_THEMES_TOOL: dict = {
    "name": "cluster_feedback_themes",
    "description": (
        "Cluster the provided feedback chunks into 3-6 thematic groups. "
        "Each chunk should belong to exactly one theme. Theme names should "
        "be product-management-friendly (e.g. 'Search Reliability', "
        "'Onboarding Friction')."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "themes": {
                "type": "array",
                "minItems": 1,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Short PM-friendly theme name.",
                        },
                        "description": {
                            "type": "string",
                            "description": "1-2 sentence summary of the theme.",
                        },
                        "chunk_indices": {
                            "type": "array",
                            "items": {"type": "integer", "minimum": 1},
                            "description": (
                                "1-indexed chunk numbers belonging to this theme."
                            ),
                        },
                        "severity_hint": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1,
                            "description": (
                                "Qualitative severity 0-1; combine rating signals, "
                                "frustration language, churn risk."
                            ),
                        },
                    },
                    "required": [
                        "name",
                        "description",
                        "chunk_indices",
                        "severity_hint",
                    ],
                },
            }
        },
        "required": ["themes"],
    },
}

CLUSTER_SYSTEM_PROMPT = """You are Trawl, a product analyst that clusters \
user feedback into strategic themes for product managers.

Rules:
1. Group the numbered feedback chunks into 3-6 themes by topical similarity. \
Every chunk must belong to exactly one theme.
2. Theme names should be PM-friendly noun phrases (e.g., "Search Reliability", \
"Performance Issues"). Avoid generic labels like "Misc" or "Other".
3. The description is 1-2 short sentences explaining the theme's nature.
4. severity_hint is your qualitative read on impact: how urgent, how widespread, \
how much it threatens retention. 0 = trivial, 1 = company-critical.
5. Return your output via the cluster_feedback_themes tool — no prose."""


async def _cluster_themes(
    chunks: list[RetrievedChunk],
) -> tuple[list[ClusteredTheme], dict]:
    """Call Claude with tool_choice forced to cluster_feedback_themes.

    Returns (themes, metadata). Themes have ``chunk_indices`` rewritten to
    0-indexed for downstream code; ``frequency_pct``, ``severity_score``,
    and ``chunk_count`` computed.

    Severity scoring blends two signals equally (v1):
    - ``frequency_pct``: fraction of all deduped chunks assigned to this theme
      (proxy for how widespread the issue is across the corpus).
    - ``severity_hint``: Claude's qualitative read on urgency/retention risk.
    Blending both avoids over-ranking large-but-trivial themes and
    small-but-critical ones.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    if not chunks:
        raise RuntimeError("Cannot cluster themes from an empty chunk list")

    client = AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=60.0,
    )

    user_message = (
        "Cluster these feedback chunks into themes:\n\n"
        + _format_chunks_for_prompt(chunks)
    )

    start = time.monotonic()
    response = await client.messages.create(  # type: ignore[call-overload]
        model=MODEL_ID,
        max_tokens=CLUSTER_MAX_TOKENS,
        system=CLUSTER_SYSTEM_PROMPT,
        tools=[CLUSTER_THEMES_TOOL],
        tool_choice={"type": "tool", "name": "cluster_feedback_themes"},
        messages=[{"role": "user", "content": user_message}],
    )
    elapsed_ms = int((time.monotonic() - start) * 1000)

    # Extract the tool input — Claude is forced to return exactly one tool_use block.
    tool_input: dict | None = None
    for block in response.content:
        if getattr(block, "type", None) == "tool_use":
            tool_input = dict(block.input)  # type: ignore[arg-type]
            break

    if tool_input is None:
        raise RuntimeError("Claude did not return a cluster_feedback_themes tool call")

    if not isinstance(tool_input, dict):
        raise RuntimeError("cluster_feedback_themes returned non-dict input")
    raw_themes = tool_input.get("themes", [])
    if not isinstance(raw_themes, list):
        raise RuntimeError("cluster_feedback_themes returned non-list themes")
    total_chunks = len(chunks)

    themes: list[ClusteredTheme] = []
    for raw in raw_themes:
        if not isinstance(raw, dict):
            continue  # Skip malformed theme entries silently — defensive.
        # Claude returns 1-indexed; convert to 0-indexed and clamp to valid range.
        zero_indexed = [
            i - 1
            for i in raw.get("chunk_indices", [])
            if isinstance(i, int) and 1 <= i <= total_chunks
        ]
        # Dedupe within the theme (defensive against Claude returning duplicates).
        zero_indexed = sorted(set(zero_indexed))

        chunk_count = len(zero_indexed)
        if chunk_count == 0:
            # Drop empty themes — shouldn't happen with forced tool_choice but defensive.
            continue

        frequency_pct = chunk_count / total_chunks if total_chunks > 0 else 0.0
        severity_hint = float(raw.get("severity_hint", 0.5))
        # Combined score: blend frequency and severity_hint equally for v1.
        severity_score = (frequency_pct + severity_hint) / 2.0

        themes.append(
            ClusteredTheme(
                name=str(raw.get("name", "Untitled theme"))[:255],
                description=str(raw.get("description", "")),
                chunk_indices=zero_indexed,
                severity_hint=severity_hint,
                frequency_pct=frequency_pct,
                severity_score=severity_score,
                chunk_count=chunk_count,
            )
        )

    # Rank themes by severity_score descending so callers can iterate in priority order.
    themes.sort(key=lambda t: -t.severity_score)

    metadata = {
        "cluster_ms": elapsed_ms,
        "cluster_input_tokens": response.usage.input_tokens,
        "cluster_output_tokens": response.usage.output_tokens,
    }

    logger.info(
        "Build Next clustering: %d themes from %d chunks (%dms)",
        len(themes),
        total_chunks,
        elapsed_ms,
    )

    return themes, metadata


THEME_SPEC_TOOL: dict = {
    "name": "generate_theme_specs",
    "description": (
        "Generate 1-3 feature specs for the given theme, each grounded in "
        "the provided feedback chunks. Each spec must cite chunks via "
        "supporting_feedback_indices."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "specs": {
                "type": "array",
                "minItems": 1,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "problem": {"type": "string"},
                        "proposed_solution": {"type": "string"},
                        "user_stories": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "acceptance_criteria": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["critical", "high", "medium", "low"],
                        },
                        "effort_estimate": {
                            "type": "string",
                            "description": "Short rough estimate (e.g. 'S', 'M', 'L', '2 sprints').",
                        },
                        "supporting_feedback_indices": {
                            "type": "array",
                            "items": {"type": "integer", "minimum": 1},
                        },
                    },
                    "required": [
                        "title",
                        "problem",
                        "proposed_solution",
                        "user_stories",
                        "acceptance_criteria",
                        "priority",
                        "effort_estimate",
                        "supporting_feedback_indices",
                    ],
                },
            }
        },
        "required": ["specs"],
    },
}

THEME_SPEC_SYSTEM_PROMPT = """You are Trawl, a product manager drafting \
feature specs from user feedback.

You'll be given a theme name + description, and a numbered list of feedback \
chunks belonging to that theme. Generate 1-3 actionable feature specs.

Rules:
1. Each spec must address something concrete users complained about, requested, \
or struggled with — derived from the feedback chunks, not invented.
2. supporting_feedback_indices must be 1-indexed into the chunks I gave you. \
Only include chunks the spec actually relies on.
3. Be terse but specific. PMs are busy.
4. Priority levels: critical (safety/legal/major churn), high (significant UX \
or revenue impact), medium (clear improvement), low (nice-to-have).
5. effort_estimate: a short label like "S", "M", "L", or "2 sprints".

Return your output via the generate_theme_specs tool — no prose."""


async def _generate_theme_specs(
    theme: ClusteredTheme,
    all_chunks: list[RetrievedChunk],
) -> tuple[list[GeneratedSpec], dict]:
    """Call Claude to generate 1-3 specs for one theme.

    The chunks passed to Claude are renumbered locally (1..N for THIS theme)
    so supporting_feedback_indices come back in a small, theme-local range.
    We then translate those indices back to global retrieval ranks before
    persistence.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    if not all_chunks:
        raise RuntimeError("Cannot generate specs from an empty chunk list")

    client = AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=60.0,
    )

    # Slice down to this theme's chunks and renumber 1..N locally.
    theme_chunks = [all_chunks[i] for i in theme.chunk_indices]
    if not theme_chunks:
        # Defensive: cluster_themes should have dropped empty themes already.
        return [], {"spec_ms": 0, "spec_input_tokens": 0, "spec_output_tokens": 0}

    local_lines: list[str] = []
    for local_idx, chunk in enumerate(theme_chunks, start=1):
        local_lines.append(
            f"[Feedback #{local_idx}] (similarity: {chunk.similarity_score:.2f})"
        )
        local_lines.append(chunk.chunk_text.strip())
        local_lines.append("")
    chunk_block = "\n".join(local_lines).rstrip()

    user_message = (
        f"Theme: **{theme.name}**\n\n"
        f"Description: {theme.description}\n\n"
        f"Feedback chunks for this theme:\n\n{chunk_block}"
    )

    start = time.monotonic()
    response = await client.messages.create(  # type: ignore[call-overload]
        model=MODEL_ID,
        max_tokens=SPEC_MAX_TOKENS,
        system=THEME_SPEC_SYSTEM_PROMPT,
        tools=[THEME_SPEC_TOOL],
        tool_choice={"type": "tool", "name": "generate_theme_specs"},
        messages=[{"role": "user", "content": user_message}],
    )
    elapsed_ms = int((time.monotonic() - start) * 1000)

    tool_input: dict | None = None
    for block in response.content:
        if getattr(block, "type", None) == "tool_use":
            tool_input = dict(block.input)  # type: ignore[arg-type]
            break

    if tool_input is None:
        raise RuntimeError("Claude did not return a generate_theme_specs tool call")
    if not isinstance(tool_input, dict):
        raise RuntimeError("generate_theme_specs returned non-dict input")

    raw_specs = tool_input.get("specs", [])
    if not isinstance(raw_specs, list):
        raise RuntimeError("generate_theme_specs returned non-list specs")

    n_local = len(theme_chunks)
    specs: list[GeneratedSpec] = []
    for raw in raw_specs:
        if not isinstance(raw, dict):
            continue  # Skip malformed spec entries silently — defensive.

        if "priority" not in raw:
            logger.warning(
                "Build Next theme spec gen: priority missing for theme=%r, defaulting to 'medium'",
                theme.name,
            )
        if "effort_estimate" not in raw:
            logger.warning(
                "Build Next theme spec gen: effort_estimate missing for theme=%r, defaulting to 'M'",
                theme.name,
            )

        # Translate local 1..N indices back to global retrieval_ranks.
        # `theme_chunks` is a slice of `all_chunks`; each chunk still carries
        # the global retrieval_rank that `_embed_and_retrieve` assigned, so
        # `theme_chunks[i - 1].retrieval_rank` is the global rank.
        local_indices = [
            i
            for i in raw.get("supporting_feedback_indices", [])
            if isinstance(i, int) and 1 <= i <= n_local
        ]
        global_ranks = [
            theme_chunks[i - 1].retrieval_rank for i in local_indices
        ]

        content: dict = {
            "problem": str(raw.get("problem", "")),
            "proposed_solution": str(raw.get("proposed_solution", "")),
            "user_stories": list(raw.get("user_stories", [])),
            "acceptance_criteria": list(raw.get("acceptance_criteria", [])),
            "priority": str(raw.get("priority", "medium")),
            "effort_estimate": str(raw.get("effort_estimate", "M")),
            "supporting_feedback_indices": global_ranks,
        }

        specs.append(
            GeneratedSpec(
                title=str(raw.get("title", "Untitled spec"))[:255],
                content=content,
            )
        )

    metadata = {
        "spec_ms": elapsed_ms,
        "spec_input_tokens": response.usage.input_tokens,
        "spec_output_tokens": response.usage.output_tokens,
    }

    logger.info(
        "Build Next theme spec gen: theme=%r, %d specs (%dms, %d in / %d out tokens)",
        theme.name,
        len(specs),
        elapsed_ms,
        response.usage.input_tokens,
        response.usage.output_tokens,
    )

    return specs, metadata


async def _generate_all_theme_specs(
    themes: list[ClusteredTheme],
    chunks: list[RetrievedChunk],
) -> tuple[list[ThemeWithSpecs], dict]:
    """Generate specs for all themes concurrently with partial-failure tolerance.

    Per-theme failures are caught individually. If a theme's spec gen
    raises, we record ``generation_failed=True`` and yield no specs. The
    caller decides whether all-failed → run failure or some-succeeded →
    partial success.

    Concurrent gather is safe here because each call hits the Anthropic
    API over its own HTTP request — no shared DB session, unlike retrieval.
    """
    # asyncio.gather with return_exceptions=True so one failure doesn't
    # cancel the others.
    results = await asyncio.gather(
        *(_generate_theme_specs(t, chunks) for t in themes),
        return_exceptions=True,
    )

    pairs: list[ThemeWithSpecs] = []
    total_input_tokens = 0
    total_output_tokens = 0
    total_spec_ms = 0

    for theme, result in zip(themes, results, strict=True):
        if isinstance(result, BaseException):
            logger.warning(
                "Spec generation failed for theme %s: %s",
                theme.name,
                result,
            )
            pairs.append(
                ThemeWithSpecs(theme=theme, specs=[], generation_failed=True)
            )
            continue
        specs, meta = result
        total_input_tokens += meta["spec_input_tokens"]
        total_output_tokens += meta["spec_output_tokens"]
        total_spec_ms += meta["spec_ms"]
        pairs.append(
            ThemeWithSpecs(theme=theme, specs=specs, generation_failed=False)
        )

    metadata = {
        "spec_total_ms": total_spec_ms,
        "spec_input_tokens": total_input_tokens,
        "spec_output_tokens": total_output_tokens,
    }
    return pairs, metadata
