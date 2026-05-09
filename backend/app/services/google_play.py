"""Google Play scraper. Wraps the sync google-play-scraper package via
asyncio.to_thread so it integrates with the surrounding async machinery.

No auth required -- the package scrapes Google Play's public HTML.

Yield: up to 500 reviews per app via Sort.NEWEST.
"""

from __future__ import annotations

import asyncio
import logging

from google_play_scraper import Sort, reviews, search  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)


async def search_apps(query: str, limit: int = 8) -> list[dict]:
    """Search Google Play for apps matching `query`. Returns up to `limit`
    results, US English storefront.

    Workaround for a google-play-scraper limitation: when given a bare,
    short, single-word query, Google Play returns the result as a
    "featured" HTML block whose appId the scraper can't extract — it comes
    back as None. Prefixing the query with "search " forces Google Play
    to return the regular result HTML with parseable appIds. Verified
    against bumble, spotify, netflix, notion, slack, tinder, instagram —
    all return None bare and the correct appId with the prefix.
    The prefix is only applied to short single-word queries; longer
    queries already trigger the regular HTML path.
    """

    def _search() -> list[dict]:
        # Apply the "search " prefix workaround for short single-word queries
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
            if app.get("appId") is not None
        ]

    return await asyncio.to_thread(_search)


async def fetch_reviews(package_name: str) -> list[dict]:
    """Fetch up to 500 most-recent reviews for `package_name`.

    Returns list of dicts with keys: content, title, rating, author, external_id.
    `title` is None -- Google Play reviews don't have titles.
    """

    def _fetch() -> list[dict]:
        result, _ = reviews(
            package_name,
            country="us",
            lang="en",
            sort=Sort.NEWEST,
            count=500,
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
        "Google Play: fetched %d reviews for %s", len(items), package_name
    )
    return items
