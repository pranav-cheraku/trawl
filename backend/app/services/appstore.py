from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
ITUNES_RSS_BASE = "https://itunes.apple.com"


async def search_apps(query: str, country: str = "us", limit: int = 8) -> list[dict]:
    """Search the iTunes Store for apps matching a query.

    Returns a list of dicts with keys: track_id, track_name, bundle_id,
    artwork_url, average_rating, rating_count, genre.
    """
    params: dict[str, str | int] = {
        "term": query,
        "country": country,
        "entity": "software",
        "limit": limit,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(ITUNES_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    results = data.get("results", [])
    return [
        {
            "track_id": str(app["trackId"]),
            "track_name": app["trackName"],
            "bundle_id": app.get("bundleId", ""),
            "artwork_url": app.get("artworkUrl60", ""),
            "average_rating": app.get("averageUserRating"),
            "rating_count": app.get("userRatingCount", 0),
            "genre": app.get("primaryGenreName", ""),
        }
        for app in results
    ]


async def search_app(app_name: str, country: str = "us") -> dict:
    """Resolve an app name to an App Store ID via the iTunes Search API.

    Returns dict with keys: app_id, app_name, bundle_id.
    Raises ValueError if no app is found.
    """
    params: dict[str, str | int] = {
        "term": app_name,
        "country": country,
        "entity": "software",
        "limit": 1,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(ITUNES_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    results = data.get("results", [])
    if not results:
        raise ValueError(f"No app found for '{app_name}' in country '{country}'")

    app = results[0]
    return {
        "app_id": str(app["trackId"]),
        "app_name": app["trackName"],
        "bundle_id": app.get("bundleId", ""),
    }


async def fetch_reviews(app_id: str, country: str = "us") -> list[dict]:
    """Fetch App Store reviews via the iTunes RSS JSON feed.

    Paginates through feed pages (up to ~500 reviews, ~50 per page).
    Returns list of dicts with keys: content, title, rating, author, external_id.
    """
    reviews: list[dict] = []
    url: str | None = (
        f"{ITUNES_RSS_BASE}/{country}/rss/customerreviews"
        f"/id={app_id}/sortBy=mostRecent/json"
    )
    max_pages = 10
    seen_urls: set[str] = set()

    async with httpx.AsyncClient(timeout=30.0) as client:
        page = 0
        while url and page < max_pages:
            if url in seen_urls:
                break
            seen_urls.add(url)
            page += 1

            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

            feed = data.get("feed", {})
            entries = feed.get("entry", [])

            if not entries:
                break

            for entry in entries:
                # Skip the app metadata entry (no "im:rating" key)
                if "im:rating" not in entry:
                    continue

                reviews.append({
                    "content": entry.get("content", {}).get("label", ""),
                    "title": entry.get("title", {}).get("label", ""),
                    "rating": int(entry.get("im:rating", {}).get("label", "0")),
                    "author": entry.get("author", {}).get("name", {}).get("label", ""),
                    "external_id": entry.get("id", {}).get("label", ""),
                })

            # Follow pagination link
            url = _get_next_page_url(feed)

    logger.info("Fetched %d reviews for app %s (%s)", len(reviews), app_id, country)
    return reviews


def _get_next_page_url(feed: dict) -> str | None:
    """Extract the 'next' pagination URL from an iTunes RSS feed."""
    links = feed.get("link", [])
    for link in links:
        if isinstance(link, dict) and link.get("attributes", {}).get("rel") == "next":
            href: str | None = link["attributes"].get("href")
            if href is not None:
                # Apple returns pagination URLs with /xml suffix — swap to /json
                href = href.replace("/xml", "/json")
            return href
    return None
