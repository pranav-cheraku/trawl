# flake8: noqa: E501
"""Inject a synthetic successful Build Next report into the dev DB.

Use case: visual smoke of the Build Next success-state UI when the Anthropic
API workspace has hit its usage limit (or any time you want a deterministic
report without paying for tokens). Inserts a complete `BuildReport` + 5
themes + 5 specs + 40 `BuildReportChunk` rows that point at real
`feedback_chunks.id` values from the test project.

Run from the backend dir with the venv active:

    cd backend && source venv/bin/activate
    python scripts/inject_synthetic_build_report.py

Outputs the new report id. The PROJECT_ID constant points at the E2E test
project; edit it if you need a different target.
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select

# Make `app.*` imports work when run as `python scripts/inject_*.py`
# from the backend dir.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.build_next import (  # noqa: E402
    BuildReport,
    BuildReportChunk,
    BuildReportSpec,
    BuildTheme,
)
from app.models.chunk import FeedbackChunk  # noqa: E402
from app.models.user import User  # noqa: E402

PROJECT_ID = uuid.UUID("551a07eb-1a76-4bfa-97a6-08159d8bded2")

QUERIES = [
    "What are users complaining about?",
    "What features are users requesting?",
    "What experiences received low ratings?",
    "What do users praise about the product?",
    "Where do users encounter friction or confusion?",
]

# Theme + spec fixtures. Names + descriptions chosen to look like a real PM
# report so the visual smoke tells us what the page actually looks like with
# realistic content.
THEMES = [
    {
        "name": "Search Reliability",
        "description": "Users repeatedly report the in-app search returning irrelevant results, timing out, or failing entirely on common queries.",
        "frequency_pct": 0.34,
        "severity": 0.82,
        "specs": [
            {
                "title": "Rebuild search index against canonical podcast catalog",
                "priority": "critical",
                "effort": "L",
                "problem": "Users report search misses on exact-title queries — the index drifts from the canonical catalog within hours of new episode publishes.",
                "solution": "Migrate from the legacy in-memory index to an Elasticsearch-backed canonical pipeline that re-syncs every 15 minutes.",
                "stories": ["As a listener, I want to find a podcast by typing its exact name and have it appear within 200ms.", "As a discovery user, I want the top result to be the most popular match, not the most recently indexed."],
                "criteria": ["Search returns canonical title hits 100% of the time within 1 hour of publish.", "p99 query latency < 300ms.", "No more than 0.5% queries return zero matches over 7 days."],
            },
            {
                "title": "Add fuzzy fallback for misspelled queries",
                "priority": "high",
                "effort": "M",
                "problem": "Users typing common misspellings ('podkast', 'lex friedmann') get zero results today.",
                "solution": "Add a Levenshtein-distance fallback: if exact-match returns 0 results, run a fuzzy pass with edit-distance ≤ 2.",
                "stories": ["As a user typing fast, I want the search to recover from typos."],
                "criteria": ["Misspelled queries return at least one relevant match in 90% of cases.", "Fuzzy pass adds < 50ms to query latency."],
            },
        ],
    },
    {
        "name": "Onboarding Friction",
        "description": "First-time users frequently abandon the app during the initial setup flow — particularly the permissions prompts and the recommendation seeding step.",
        "frequency_pct": 0.24,
        "severity": 0.61,
        "specs": [
            {
                "title": "Add resume-where-you-left-off prompt",
                "priority": "high",
                "effort": "S",
                "problem": "Users who close the app mid-onboarding return to the start, losing their preferences input.",
                "solution": "Persist onboarding state at every step transition; on next launch, show a 'Continue setup' CTA instead of restarting.",
                "stories": ["As a returning user, I want to pick up onboarding where I left off."],
                "criteria": ["Onboarding completion rate among returning incomplete users improves by 15%.", "Resume CTA shown to 100% of users with partial onboarding state."],
            },
        ],
    },
    {
        "name": "Performance Issues",
        "description": "Slow load times on the home feed and audio buffering on slow connections drive a meaningful share of negative reviews.",
        "frequency_pct": 0.18,
        "severity": 0.58,
        "specs": [
            {
                "title": "Reduce login retry loop on slow connections",
                "priority": "high",
                "effort": "M",
                "problem": "Users on cellular data report being kicked into an infinite login retry loop when the auth token refresh times out.",
                "solution": "Add exponential backoff to token refresh + cache the last-good token for 24h offline use.",
                "stories": ["As a commuter on weak signal, I want to keep listening without re-logging-in."],
                "criteria": ["No login retry attempts > 3 within 60 seconds.", "Offline mode honors cached token for 24h."],
            },
        ],
    },
    {
        "name": "Audio Playback Bugs",
        "description": "Skipping forward by 30s sometimes restarts the episode; downloads occasionally stall at 99%.",
        "frequency_pct": 0.14,
        "severity": 0.45,
        "specs": [
            {
                "title": "Fix 30-second skip resetting episode state",
                "priority": "medium",
                "effort": "S",
                "problem": "On iOS, the 30-second forward-skip button intermittently rewinds to position 0 instead of advancing.",
                "solution": "Audit AVPlayer seek state machine; ensure currentTime+30 is computed from the live position, not a stale snapshot.",
                "stories": ["As a podcast listener, I want skip-forward to advance reliably."],
                "criteria": ["No reports of skip-rewind regression in the next release cycle.", "Unit test covers the seek-after-buffer-ready edge case."],
            },
        ],
    },
    {
        "name": "Discovery & Recommendations",
        "description": "Users want better personalized recommendations, especially for discovering new podcasts beyond top charts.",
        "frequency_pct": 0.10,
        "severity": 0.32,
        "specs": [],
        "spec_generation_failed": True,
    },
]


async def main() -> str:
    async with AsyncSessionLocal() as db:
        # Get the dev user.
        u = await db.execute(select(User).limit(1))
        user = u.scalar_one()
        # Grab some real feedback chunks for the X-Ray.
        c = await db.execute(
            select(FeedbackChunk)
            .where(FeedbackChunk.project_id == PROJECT_ID)
            .limit(40)
        )
        feedback_chunks = list(c.scalars())
        if not feedback_chunks:
            raise RuntimeError("No feedback_chunks for this project. Aborting.")

        completed_at = datetime.utcnow() - timedelta(minutes=5)
        report = BuildReport(
            project_id=PROJECT_ID,
            user_id=user.id,
            status="success",
            task_id="synthetic-fixture",
            executive_summary=(
                "Search reliability dominates user feedback at 34% of the corpus and "
                "carries the highest severity, making it the clear B1 priority. "
                "Onboarding friction (24%) and performance issues (18%) round out the "
                "top three opportunities; tackling all three would address roughly "
                "three-quarters of the negative-rating drivers."
            ),
            build_order=[],  # filled below once spec ids exist
            retrieval_metadata={
                "model": "claude-sonnet-4-20250514",
                "queries": QUERIES,
                "top_k_per_query": 10,
                "deduped_total": len(feedback_chunks),
                "raw_total": 50,
                "embed_ms": 412,
                "retrieve_ms": 138,
                "cluster_ms": 6240,
                "spec_total_ms": 18750,
                "rationale_ms": 1820,
                "summary_ms": 920,
                "total_ms": 28280,
                "partial_failure_themes": 1,
                "token_usage": {"input": 13117, "output": 6049},
            },
            partial_failure=True,
            source_ids=[],
            created_at=datetime.utcnow() - timedelta(minutes=6),
            updated_at=completed_at,
            completed_at=completed_at,
        )
        db.add(report)
        await db.flush()

        theme_models: list[BuildTheme] = []
        for rank, t in enumerate(THEMES, start=1):
            tm = BuildTheme(
                report_id=report.id,
                rank=rank,
                name=t["name"],
                description=t["description"],
                frequency_pct=t["frequency_pct"],
                chunk_count=int(t["frequency_pct"] * len(feedback_chunks)),
                severity_score=t["severity"],
                spec_generation_failed=t.get("spec_generation_failed", False),
            )
            db.add(tm)
            theme_models.append(tm)
        await db.flush()

        # Specs across themes, build_rank assigned globally.
        global_rank = 1
        spec_models: dict[int, BuildReportSpec] = {}
        for tm, t in zip(theme_models, THEMES, strict=True):
            for sp in t["specs"]:
                content = {
                    "problem": sp["problem"],
                    "proposed_solution": sp["solution"],
                    "user_stories": sp["stories"],
                    "acceptance_criteria": sp["criteria"],
                    "priority": sp["priority"],
                    "effort_estimate": sp["effort"],
                    "supporting_feedback_indices": [1, 3, 5, 7, 9],
                }
                m = BuildReportSpec(
                    report_id=report.id,
                    theme_id=tm.id,
                    build_rank=global_rank,
                    title=sp["title"],
                    content=content,
                )
                db.add(m)
                spec_models[global_rank] = m
                global_rank += 1
        await db.flush()

        # Build order with rationales referencing the persisted spec ids.
        rationales = [
            "Highest frequency (34%) and severity (0.82) — every percentage point of search-reliability win compounds across the entire feedback funnel.",
            "Critical underpinning for the index rebuild; should land in the same release.",
            "Onboarding completion is the single biggest lever on day-1 retention; small fix with outsized impact.",
            "Cellular reliability is a retention floor — losing users on weak networks is a churn driver disguised as a UX bug.",
            "Lower frequency but a clear quality bar; ship after the higher-impact items.",
        ]
        build_order = []
        for rank in sorted(spec_models.keys()):
            sm = spec_models[rank]
            build_order.append(
                {
                    "rank": rank,
                    "specId": str(sm.id),
                    "rationale": rationales[rank - 1] if rank <= len(rationales) else "",
                }
            )
        report.build_order = build_order

        # Chunks for the X-Ray. Cycle the source_query list so attribution is
        # spread across all 5 queries.
        for rank, chunk in enumerate(feedback_chunks, start=1):
            db.add(
                BuildReportChunk(
                    report_id=report.id,
                    chunk_id=chunk.id,
                    retrieval_rank=rank,
                    similarity=max(0.25, 0.92 - (rank - 1) * 0.012),
                    source_query=QUERIES[(rank - 1) % len(QUERIES)],
                )
            )

        await db.commit()
        return str(report.id)


report_id = asyncio.run(main())
print(f"Synthetic report id: {report_id}")
