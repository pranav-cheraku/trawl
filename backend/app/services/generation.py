"""generation.py: Claude-powered answer and spec generation for the RAG pipeline.

All three generation modes (Q&A, feature specs, user stories) use forced tool_choice
so the response is always structured JSON without manual parsing or retry. Every
generated item traces back to source chunks via 1-indexed supporting_feedback_indices.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from anthropic import AsyncAnthropic

from app.config import settings
from app.services.retrieval import RetrievedChunk

if TYPE_CHECKING:
    from app.models.conversation import Message

logger = logging.getLogger(__name__)

MODEL_ID = "claude-sonnet-4-20250514"
MAX_TOKENS = 1024
CLIENT_TIMEOUT_SECONDS = 60.0
MAX_HISTORY_TURNS = 6

SYSTEM_PROMPT = """You are Trawl, an assistant that helps product managers understand user \
feedback. You will be given a question and a numbered list of feedback chunks retrieved \
from the product's feedback corpus.

Rules:
1. Answer using ONLY the information in the provided feedback chunks. If the chunks do \
not contain enough information to answer the question, say so honestly — do not speculate \
or invent facts.
2. Cite chunks inline using the exact form `[Feedback #N]` where N is the 1-indexed chunk \
number. Every factual claim should have at least one citation.
3. When citing multiple chunks for the same claim, write each citation as a SEPARATE \
bracket back-to-back: `[Feedback #1][Feedback #3]`. Do NOT combine them into one bracket. \
Never write forms like `[Feedback #1, #3]`, `[Feedback #1, 3]`, or `[Feedback #1-3]`.
4. Be concise. Product managers are busy. Prefer short paragraphs and bullets over prose \
walls.
5. Format the answer as Markdown. Render bullet lists with `-` at the start of each line \
on its own line. Do NOT use Unicode bullet characters like `•` for list items, and do \
NOT join multiple items together on a single line.
6. When you call the `cite_feedback` tool, include in `supporting_feedback_indices` only \
the chunks that directly back your claims. Do not include chunks you did not actually \
rely on."""

CITE_FEEDBACK_TOOL: dict[str, Any] = {
    "name": "cite_feedback",
    "description": (
        "Return an answer with structured citations to the retrieved feedback chunks."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "answer": {
                "type": "string",
                "description": (
                    "The answer to the user's question. Must cite chunks inline using "
                    "[Feedback #N] where N is the 1-indexed chunk number."
                ),
            },
            "supporting_feedback_indices": {
                "type": "array",
                "items": {"type": "integer", "minimum": 1},
                "description": (
                    "1-indexed chunk numbers that directly support the answer. "
                    "Only include chunks you actually relied on."
                ),
            },
        },
        "required": ["answer", "supporting_feedback_indices"],
    },
}


@dataclass
class GenerationResult:
    """Structured result from a Claude generation call."""

    answer: str
    supporting_indices: list[int]
    model: str
    input_tokens: int
    output_tokens: int


def _format_chunks_for_prompt(chunks: list[RetrievedChunk]) -> str:
    """Render retrieved chunks as a numbered block for the user turn."""
    lines: list[str] = []
    for chunk in chunks:
        header = (
            f"[Feedback #{chunk.retrieval_rank}] "
            f"(source: {chunk.source_type} - {chunk.source_name}, "
            f"similarity: {chunk.similarity_score:.2f})"
        )
        lines.append(header)
        lines.append(chunk.chunk_text.strip())
        lines.append("")
    return "\n".join(lines).rstrip()


def _build_history_messages(
    history: list[Message],
) -> list[dict[str, str]]:
    """Convert stored messages into Anthropic user/assistant turn dicts.

    Keeps only the trailing MAX_HISTORY_TURNS and drops unrecognized roles.
    """
    # Trim to the trailing N turns before filtering roles so the window is stable
    # regardless of how many system or tool messages are interspersed.
    trimmed = history[-MAX_HISTORY_TURNS:] if history else []
    turns: list[dict[str, str]] = []
    for msg in trimmed:
        if msg.role not in ("user", "assistant"):
            continue
        turns.append({"role": msg.role, "content": msg.content})
    return turns


async def generate_answer(
    query: str,
    chunks: list[RetrievedChunk],
    history: list[Message] | None = None,
) -> GenerationResult:
    """Generate a cited answer using forced tool_choice.

    Forced tool_choice guarantees the response matches the cite_feedback schema;
    no JSON parsing or retry is needed because the SDK validates the tool input.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    if not chunks:
        raise ValueError("generate_answer requires at least one retrieved chunk")

    client = AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=CLIENT_TIMEOUT_SECONDS,
    )

    history_turns = _build_history_messages(history or [])
    chunks_block = _format_chunks_for_prompt(chunks)
    user_turn_content = (
        f"Question: {query}\n\n"
        f"Feedback chunks:\n{chunks_block}"
    )
    messages: list[dict[str, Any]] = [
        *history_turns,
        {"role": "user", "content": user_turn_content},
    ]

    response = await client.messages.create(  # type: ignore[call-overload]
        model=MODEL_ID,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        tools=[CITE_FEEDBACK_TOOL],
        tool_choice={"type": "tool", "name": "cite_feedback"},
        messages=messages,
    )

    # Forced tool_choice means exactly one tool_use block will be present.
    tool_block = None
    for block in response.content:
        if block.type == "tool_use" and block.name == "cite_feedback":
            tool_block = block
            break

    if tool_block is None:
        raise RuntimeError(
            "Claude did not return a cite_feedback tool call despite forced tool_choice"
        )

    tool_input = tool_block.input
    if not isinstance(tool_input, dict):
        raise RuntimeError(
            f"cite_feedback tool input is not a dict: {type(tool_input).__name__}"
        )

    answer = tool_input.get("answer", "")
    raw_indices = tool_input.get("supporting_feedback_indices", [])
    if not isinstance(answer, str):
        raise RuntimeError("cite_feedback.answer is not a string")
    if not isinstance(raw_indices, list):
        raise RuntimeError("cite_feedback.supporting_feedback_indices is not a list")

    # Claude occasionally returns an index higher than the chunk count when
    # it has seen many chunks in its context. Clamp to the valid 1-indexed range.
    supporting_indices: list[int] = []
    for idx in raw_indices:
        try:
            i = int(idx)
        except (TypeError, ValueError):
            continue
        if 1 <= i <= len(chunks):
            supporting_indices.append(i)

    logger.info(
        "Claude generated answer: %d chars, %d supporting indices, "
        "%d input tokens, %d output tokens",
        len(answer),
        len(supporting_indices),
        response.usage.input_tokens,
        response.usage.output_tokens,
    )

    return GenerationResult(
        answer=answer,
        supporting_indices=supporting_indices,
        model=MODEL_ID,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )


SPEC_MAX_TOKENS = 4096

FEATURE_SPEC_SYSTEM_PROMPT = """\
You are Trawl, a product analyst that synthesizes user feedback into actionable \
feature specifications. You will be given a numbered list of feedback chunks \
retrieved from a product's feedback corpus.

Analyze the feedback and produce 3-7 distinct feature specs. Each spec should \
represent a clear, actionable product improvement grounded in real user feedback.

Rules:
1. Base every spec ONLY on evidence from the provided feedback chunks. Do not \
invent problems or solutions that are not supported by the data.
2. Cite specific feedback using 1-indexed chunk numbers in \
`supporting_feedback_indices`. Only include chunks you actually relied on.
3. Prioritize specs by frequency and severity of the underlying feedback.
4. Each spec must be distinct — do not create overlapping or duplicate specs.
5. If a focus area is provided, weight specs toward that area but still surface \
other important themes if the data warrants it."""

GENERATE_SPECS_TOOL: dict[str, Any] = {
    "name": "generate_specs",
    "description": (
        "Return a list of feature specifications synthesized from user feedback."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "specs": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Short, descriptive feature title.",
                        },
                        "problem": {
                            "type": "string",
                            "description": (
                                "The user problem this spec addresses, "
                                "grounded in feedback evidence."
                            ),
                        },
                        "proposed_solution": {
                            "type": "string",
                            "description": "Concrete solution description.",
                        },
                        "user_stories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": (
                                "User stories in 'As a [user], I want [action], "
                                "so that [benefit]' format."
                            ),
                        },
                        "acceptance_criteria": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Testable acceptance criteria.",
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["critical", "high", "medium", "low"],
                            "description": (
                                "Priority based on frequency and severity of feedback."
                            ),
                        },
                        "supporting_feedback_indices": {
                            "type": "array",
                            "items": {"type": "integer", "minimum": 1},
                            "description": (
                                "1-indexed chunk numbers that support this spec."
                            ),
                        },
                    },
                    "required": [
                        "title",
                        "problem",
                        "proposed_solution",
                        "user_stories",
                        "acceptance_criteria",
                        "priority",
                        "supporting_feedback_indices",
                    ],
                },
                "description": "List of feature specifications.",
            },
        },
        "required": ["specs"],
    },
}

USER_STORY_SYSTEM_PROMPT = """\
You are Trawl, a product analyst that synthesizes user feedback into structured \
user stories. You will be given a numbered list of feedback chunks retrieved \
from a product's feedback corpus.

Group the feedback into 3-7 themes and generate user stories for each theme. \
Each story must follow the format: "As a [user], I want [action], so that [benefit]".

Rules:
1. Base every story ONLY on evidence from the provided feedback chunks.
2. Cite specific feedback using 1-indexed chunk numbers in \
`supporting_feedback_indices`. Only include chunks you actually relied on.
3. Group related stories under a common theme name.
4. Prioritize by frequency and severity of the underlying feedback.
5. Each story must be distinct and actionable."""

GENERATE_USER_STORIES_TOOL: dict[str, Any] = {
    "name": "generate_user_stories",
    "description": (
        "Return user stories grouped by theme, synthesized from user feedback."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "story_groups": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "theme": {
                            "type": "string",
                            "description": "Theme name grouping related stories.",
                        },
                        "stories": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {
                                        "type": "string",
                                        "description": (
                                            "User story in 'As a [user], I want "
                                            "[action], so that [benefit]' format."
                                        ),
                                    },
                                    "acceptance_criteria": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": (
                                            "Testable acceptance criteria."
                                        ),
                                    },
                                    "priority": {
                                        "type": "string",
                                        "enum": [
                                            "critical",
                                            "high",
                                            "medium",
                                            "low",
                                        ],
                                    },
                                    "supporting_feedback_indices": {
                                        "type": "array",
                                        "items": {
                                            "type": "integer",
                                            "minimum": 1,
                                        },
                                    },
                                },
                                "required": [
                                    "title",
                                    "acceptance_criteria",
                                    "priority",
                                    "supporting_feedback_indices",
                                ],
                            },
                        },
                    },
                    "required": ["theme", "stories"],
                },
            },
        },
        "required": ["story_groups"],
    },
}


@dataclass
class SpecGenerationResult:
    """Structured result from a spec generation call."""

    specs: list[dict[str, Any]]
    model: str
    input_tokens: int
    output_tokens: int


def _clamp_indices(
    raw_indices: list[Any], max_index: int
) -> list[int]:
    """Coerce and filter supporting_feedback_indices to the valid 1-indexed range."""
    clamped: list[int] = []
    for idx in raw_indices:
        try:
            i = int(idx)
        except (TypeError, ValueError):
            continue
        if 1 <= i <= max_index:
            clamped.append(i)
    return clamped


async def generate_feature_specs(
    chunks: list[RetrievedChunk],
    project_context: str | None = None,
) -> SpecGenerationResult:
    """Generate feature specifications from retrieved feedback chunks.

    Uses forced tool_choice to guarantee structured JSON output.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    if not chunks:
        raise ValueError("generate_feature_specs requires at least one chunk")

    client = AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=CLIENT_TIMEOUT_SECONDS,
    )

    chunks_block = _format_chunks_for_prompt(chunks)
    user_content = f"Feedback chunks:\n{chunks_block}"
    if project_context:
        user_content = f"Focus area: {project_context}\n\n{user_content}"

    response = await client.messages.create(  # type: ignore[call-overload]
        model=MODEL_ID,
        max_tokens=SPEC_MAX_TOKENS,
        system=FEATURE_SPEC_SYSTEM_PROMPT,
        tools=[GENERATE_SPECS_TOOL],
        tool_choice={"type": "tool", "name": "generate_specs"},
        messages=[{"role": "user", "content": user_content}],
    )

    tool_block = None
    for block in response.content:
        if block.type == "tool_use" and block.name == "generate_specs":
            tool_block = block
            break

    if tool_block is None:
        raise RuntimeError(
            "Claude did not return a generate_specs tool call"
        )

    tool_input = tool_block.input
    if not isinstance(tool_input, dict):
        raise RuntimeError(
            f"generate_specs tool input is not a dict: {type(tool_input).__name__}"
        )

    raw_specs = tool_input.get("specs", [])
    if not isinstance(raw_specs, list):
        raise RuntimeError("generate_specs.specs is not a list")

    specs: list[dict[str, Any]] = []
    for spec in raw_specs:
        if not isinstance(spec, dict):
            continue
        if not spec.get("title"):
            continue
        spec["supporting_feedback_indices"] = _clamp_indices(
            spec.get("supporting_feedback_indices", []), len(chunks)
        )
        specs.append(spec)

    logger.info(
        "Generated %d feature specs (%d input tokens, %d output tokens)",
        len(specs),
        response.usage.input_tokens,
        response.usage.output_tokens,
    )

    return SpecGenerationResult(
        specs=specs,
        model=MODEL_ID,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )


async def generate_user_stories(
    chunks: list[RetrievedChunk],
    project_context: str | None = None,
) -> SpecGenerationResult:
    """Generate user stories grouped by theme from retrieved feedback chunks.

    Flattens the grouped output into individual spec dicts for uniform
    storage in the specs table.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    if not chunks:
        raise ValueError("generate_user_stories requires at least one chunk")

    client = AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=CLIENT_TIMEOUT_SECONDS,
    )

    chunks_block = _format_chunks_for_prompt(chunks)
    user_content = f"Feedback chunks:\n{chunks_block}"
    if project_context:
        user_content = f"Focus area: {project_context}\n\n{user_content}"

    response = await client.messages.create(  # type: ignore[call-overload]
        model=MODEL_ID,
        max_tokens=SPEC_MAX_TOKENS,
        system=USER_STORY_SYSTEM_PROMPT,
        tools=[GENERATE_USER_STORIES_TOOL],
        tool_choice={"type": "tool", "name": "generate_user_stories"},
        messages=[{"role": "user", "content": user_content}],
    )

    tool_block = None
    for block in response.content:
        if block.type == "tool_use" and block.name == "generate_user_stories":
            tool_block = block
            break

    if tool_block is None:
        raise RuntimeError(
            "Claude did not return a generate_user_stories tool call"
        )

    tool_input = tool_block.input
    if not isinstance(tool_input, dict):
        raise RuntimeError(
            f"generate_user_stories tool input is not a dict: "
            f"{type(tool_input).__name__}"
        )

    story_groups = tool_input.get("story_groups", [])
    if not isinstance(story_groups, list):
        raise RuntimeError("generate_user_stories.story_groups is not a list")

    # Flatten grouped output into individual spec dicts. The theme name is
    # promoted to a top-level field so rows are compatible with the specs table.
    specs: list[dict[str, Any]] = []
    for group in story_groups:
        if not isinstance(group, dict):
            continue
        theme = group.get("theme", "Untitled Theme")
        for story in group.get("stories", []):
            if not isinstance(story, dict):
                continue
            if not story.get("title"):
                continue
            story["supporting_feedback_indices"] = _clamp_indices(
                story.get("supporting_feedback_indices", []), len(chunks)
            )
            specs.append({
                "title": story["title"],
                "theme": theme,
                "acceptance_criteria": story.get("acceptance_criteria", []),
                "priority": story.get("priority", "medium"),
                "supporting_feedback_indices": story["supporting_feedback_indices"],
            })

    logger.info(
        "Generated %d user stories across %d themes "
        "(%d input tokens, %d output tokens)",
        len(specs),
        len(story_groups),
        response.usage.input_tokens,
        response.usage.output_tokens,
    )

    return SpecGenerationResult(
        specs=specs,
        model=MODEL_ID,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )
