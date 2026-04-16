from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
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
4. Be concise. Product managers are busy — prefer short paragraphs and bullets over prose \
walls.
5. When you call the `cite_feedback` tool, include in `supporting_feedback_indices` only \
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


@dataclass
class StreamEvent:
    """Event yielded by generate_answer_stream."""

    type: str  # "text_delta" or "stream_complete"
    delta: str = ""
    result: GenerationResult | None = field(default=None)


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

    Keeps only the trailing MAX_HISTORY_TURNS, and drops any role we don't
    explicitly recognize.
    """
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
    """Call Claude with tool-forced citations and return a structured result.

    Uses Anthropic tool use to guarantee the response matches our schema:
    {answer: str, supporting_feedback_indices: int[]}. No JSON parsing or
    retry logic needed — the SDK validates the tool input before returning.
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

    # With forced tool_choice, Claude MUST call the tool. Find the tool_use
    # block — there will be exactly one for cite_feedback.
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

    # Defensive: coerce ints + drop out-of-range indices (Claude occasionally
    # cites a chunk number higher than what we gave it when the system prompt
    # is fresh in its memory).
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


# ---------------------------------------------------------------------------
# Streaming generation
# ---------------------------------------------------------------------------

_ANSWER_PREFIX = '"answer":'


def _unescape_json_char(buf: str, pos: int) -> tuple[str, int]:
    """Decode one JSON escape sequence starting at buf[pos] (the backslash).

    Returns (decoded_char, chars_consumed).
    """
    if pos + 1 >= len(buf):
        return ("", 0)  # incomplete escape — wait for more data
    next_ch = buf[pos + 1]
    simple = {'"': '"', "\\": "\\", "/": "/", "n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f"}
    if next_ch in simple:
        return (simple[next_ch], 2)
    if next_ch == "u" and pos + 5 < len(buf):
        hex_str = buf[pos + 2 : pos + 6]
        try:
            return (chr(int(hex_str, 16)), 6)
        except ValueError:
            return (next_ch, 2)
    return (next_ch, 2)


async def generate_answer_stream(
    query: str,
    chunks: list[RetrievedChunk],
    history: list[Message] | None = None,
) -> AsyncGenerator[StreamEvent, None]:
    """Stream a Claude generation, yielding answer text incrementally.

    Uses the same forced tool_choice as generate_answer(). The Anthropic SDK
    emits input_json_delta events with raw JSON fragments; we parse the
    "answer" value incrementally so text can be forwarded to the client
    as it arrives.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    if not chunks:
        raise ValueError("generate_answer_stream requires at least one retrieved chunk")

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

    accumulated_json = ""
    # State machine: 0 = BEFORE_ANSWER, 1 = IN_ANSWER, 2 = DONE
    state = 0
    answer_value_start = -1  # index into accumulated_json where the answer string value begins
    scan_pos = 0  # how far we've scanned in IN_ANSWER state

    try:
        async with client.messages.stream(
            model=MODEL_ID,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=[CITE_FEEDBACK_TOOL],  # type: ignore[list-item]
            tool_choice={"type": "tool", "name": "cite_feedback"},
            messages=messages,  # type: ignore[arg-type]
        ) as stream:
            async for event in stream:
                if not hasattr(event, "type"):
                    continue
                if event.type != "content_block_delta":
                    continue
                delta = getattr(event, "delta", None)
                if delta is None or getattr(delta, "type", None) != "input_json_delta":
                    continue

                partial = delta.partial_json
                accumulated_json += partial

                if state == 0:
                    # Look for the start of the answer string value.
                    # The JSON looks like: {"answer": "...
                    idx = accumulated_json.find(_ANSWER_PREFIX)
                    if idx >= 0:
                        # Find the opening quote of the string value
                        after_colon = idx + len(_ANSWER_PREFIX)
                        quote_pos = accumulated_json.find('"', after_colon)
                        if quote_pos >= 0:
                            state = 1
                            answer_value_start = quote_pos + 1
                            scan_pos = answer_value_start

                if state == 1:
                    new_text_parts: list[str] = []
                    while scan_pos < len(accumulated_json):
                        ch = accumulated_json[scan_pos]
                        if ch == "\\":
                            decoded, consumed = _unescape_json_char(accumulated_json, scan_pos)
                            if consumed == 0:
                                break  # incomplete escape sequence
                            new_text_parts.append(decoded)
                            scan_pos += consumed
                        elif ch == '"':
                            # End of the answer string
                            state = 2
                            scan_pos += 1
                            break
                        else:
                            new_text_parts.append(ch)
                            scan_pos += 1

                    if new_text_parts:
                        yield StreamEvent(type="text_delta", delta="".join(new_text_parts))

            # Stream finished — parse full JSON for indices and build result.
            final_msg = await stream.get_final_message()
            tool_input = json.loads(accumulated_json)
            answer = tool_input.get("answer", "")
            raw_indices = tool_input.get("supporting_feedback_indices", [])

            supporting_indices: list[int] = []
            for idx_val in raw_indices:
                try:
                    i = int(idx_val)
                except (TypeError, ValueError):
                    continue
                if 1 <= i <= len(chunks):
                    supporting_indices.append(i)

            logger.info(
                "Claude streamed answer: %d chars, %d supporting indices, "
                "%d input tokens, %d output tokens",
                len(answer),
                len(supporting_indices),
                final_msg.usage.input_tokens,
                final_msg.usage.output_tokens,
            )

            yield StreamEvent(
                type="stream_complete",
                result=GenerationResult(
                    answer=answer,
                    supporting_indices=supporting_indices,
                    model=MODEL_ID,
                    input_tokens=final_msg.usage.input_tokens,
                    output_tokens=final_msg.usage.output_tokens,
                ),
            )

    except Exception:
        logger.exception("Error during streaming generation")
        raise
