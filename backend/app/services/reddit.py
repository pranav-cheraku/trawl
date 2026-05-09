"""Reddit scraper. Public read endpoints only (no OAuth).

Two modes:
- fetch_subreddit(subreddit): top 100 hot posts from r/{sub} + top 5 comments per post
- fetch_keyword_search(keyword): top 100 hot posts matching keyword across all subreddits

Each post becomes one feedback item, plus its top comments as additional items.
External IDs use Reddit's "fullname" format: t3_{post_id}, t1_{comment_id}.

Rate limit: Reddit's public endpoints rate-limit per User-Agent / IP. We send
a custom UA per Reddit's "make a unique UA" guidance.
"""

from __future__ import annotations

import logging
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

USER_AGENT = "Trawl/1.0 (https://github.com/pranav-cheraku/trawl)"
POSTS_PER_SOURCE = 100
COMMENTS_PER_POST = 5


def _post_to_item(post: dict) -> dict:
    body = (post.get("selftext") or "").strip()
    return {
        "content": body or post.get("title", ""),
        "title": post.get("title", ""),
        "rating": post.get("score", 0),
        "author": post.get("author", ""),
        "external_id": f"t3_{post['id']}",
    }


def _comment_to_item(comment: dict) -> dict:
    return {
        "content": comment.get("body", ""),
        "title": None,
        "rating": comment.get("score", 0),
        "author": comment.get("author", ""),
        "external_id": f"t1_{comment['id']}",
    }


async def _fetch_post_comments(
    client: httpx.AsyncClient,
    subreddit: str,
    post_id: str,
) -> list[dict]:
    """Fetch top N comments for a post by score, skipping deleted/removed."""
    url = (
        f"https://www.reddit.com/r/{subreddit}/comments/{post_id}.json"
        f"?limit={COMMENTS_PER_POST + 5}&sort=top"
    )
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(
            "Reddit: comment fetch failed for r/%s/%s: %s",
            subreddit,
            post_id,
            e,
        )
        return []

    # Reddit returns [post_data, comments_listing] -- we want index 1.
    if not isinstance(data, list) or len(data) < 2:
        return []
    listing = data[1]
    children = listing.get("data", {}).get("children", [])

    out: list[dict] = []
    for child in children:
        if child.get("kind") != "t1":
            continue
        c = child.get("data", {})
        body = c.get("body", "")
        author = c.get("author", "")
        if author in ("[deleted]", "AutoModerator"):
            continue
        if body in ("[deleted]", "[removed]", ""):
            continue
        out.append(_comment_to_item(c))
        if len(out) >= COMMENTS_PER_POST:
            break
    return out


async def fetch_subreddit(subreddit: str) -> list[dict]:
    """Fetch hot posts + top comments from r/{subreddit}.

    Strips a leading 'r/' if the user supplied one.
    Raises httpx.HTTPStatusError on 404 (subreddit doesn't exist).
    """
    sub = subreddit.lstrip("r/").strip()
    url = (
        f"https://www.reddit.com/r/{sub}/hot.json"
        f"?limit={POSTS_PER_SOURCE}"
    )

    items: list[dict] = []
    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

        children = data.get("data", {}).get("children", [])
        for child in children:
            if child.get("kind") != "t3":
                continue
            post = child.get("data", {})
            items.append(_post_to_item(post))
            comments = await _fetch_post_comments(client, sub, post["id"])
            items.extend(comments)

    logger.info(
        "Reddit: fetched %d items (posts + comments) from r/%s",
        len(items),
        sub,
    )
    return items


async def fetch_keyword_search(keyword: str) -> list[dict]:
    """Search Reddit-wide for `keyword`, fetch hot posts + top comments per post."""
    encoded = quote(keyword)
    url = (
        f"https://www.reddit.com/search.json"
        f"?q={encoded}&sort=hot&limit={POSTS_PER_SOURCE}"
    )

    items: list[dict] = []
    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

        children = data.get("data", {}).get("children", [])
        for child in children:
            if child.get("kind") != "t3":
                continue
            post = child.get("data", {})
            sub = post.get("subreddit", "")
            items.append(_post_to_item(post))
            if sub:
                comments = await _fetch_post_comments(client, sub, post["id"])
                items.extend(comments)

    logger.info(
        'Reddit: fetched %d items (posts + comments) for keyword "%s"',
        len(items),
        keyword,
    )
    return items
