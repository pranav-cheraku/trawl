# Wraps the sync google-play-scraper package via asyncio.to_thread.
from __future__ import annotations

import asyncio
import logging

from google_play_scraper import Sort, reviews, search  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)


async def search_apps(query: str, limit: int = 8) -> list[dict]:
    """Search Google Play for apps matching query, US English storefront.

    Short single-word queries return a "featured" HTML block that the scraper
    can't parse (appId comes back as None). Prefixing with "search " forces
    the regular result HTML. Verified against bumble, spotify, netflix, etc.
    """

    def _search() -> list[dict]:
        scrape_query = (
            f"search {query.strip()}"
            if " " not in query.strip() and len(query.strip()) < 30
            else query
        )
        results = search(
            scrape_query, country="us", lang="en", n_hits=limit
        )
        # Defensive filter: even with the prefix workaround, occasional
        # ad/feature slots may surface with appId=None.
        return [
            {
                "package_name": app["appId"],
                "track_name": app["title"],
                "artwork_url": app.get("icon", ""),
                "average_rating": app.get("score"),
                "rating_count": app.get("ratings", 0),
                "genre": app.get("genre", ""),
            }
            for app in results
            if app.get("appId") is not None  # ad/feature slots may have appId=None
        ]

    return await asyncio.to_thread(_search)


async def fetch_reviews(
    package_name: str,
    count: int = 500,
) -> list[dict]:
    """Fetch up to count most-recent reviews. title is always None -- Google Play reviews have no title."""

    def _fetch() -> list[dict]:
        result, _ = reviews(
            package_name,
            country="us",
            lang="en",
            sort=Sort.NEWEST,
            count=count,
        )
        return [
            {
                "content": r["content"] or "",
                "title": None,
                "rating": r.get("score", 0),
                "author": r.get("userName", ""),
                "external_id": r["reviewId"],
            }
            for r in result
        ]

    items = await asyncio.to_thread(_fetch)
    logger.info(
        "Google Play: fetched %d reviews for %s (count=%d)",
        len(items),
        package_name,
        count,
    )
    return items
