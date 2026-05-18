"""Reddit ingestion service for Trawl.

Supports two modes: fetching hot posts + comments from a subreddit, or
searching Reddit-wide by keyword. Both modes paginate via Reddit's `after=`
cursor up to a configurable post limit.

Reddit `score` is karma (upvotes minus downvotes), NOT a 1-5 rating. It is
deliberately not mapped to the `rating` metadata key to avoid rendering it
as stars in the UI.
"""
from __future__ import annotations

import logging
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

USER_AGENT = "Trawl/1.0 (https://github.com/pranav-cheraku/trawl)"


def _post_to_item(post: dict) -> dict:
    # Reddit score is upvotes minus downvotes, not a 1-5 rating -- do not map
    # it to the `rating` key or it will render as stars in the UI.
    body = (post.get("selftext") or "").strip()
    return {
        "content": body or post.get("title", ""),
        "title": post.get("title", ""),
        "author": post.get("author", ""),
        "external_id": f"t3_{post['id']}",
    }


def _comment_to_item(comment: dict) -> dict:
    return {
        "content": comment.get("body", ""),
        "title": None,
        "author": comment.get("author", ""),
        "external_id": f"t1_{comment['id']}",
    }


async def _fetch_post_comments(
    client: httpx.AsyncClient,
    subreddit: str,
    post_id: str,
    comments_per_post: int = 5,
) -> list[dict]:
    """Fetch top N comments for a post by score, skipping deleted/removed."""
    url = (
        f"https://www.reddit.com/r/{subreddit}/comments/{post_id}.json"
        f"?limit={comments_per_post + 5}&sort=top"
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

    # Reddit returns [post_listing, comments_listing]; comments are at index 1.
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
        if len(out) >= comments_per_post:
            break
    return out


async def fetch_subreddit(
    subreddit: str,
    posts_limit: int = 100,
    comments_per_post: int = 5,
) -> list[dict]:
    """Fetch hot posts + top comments from r/{subreddit}.

    Strips a leading 'r/' if the user supplied one.
    Raises httpx.HTTPStatusError on 404 (subreddit doesn't exist).

    For posts_limit > 100, paginates via Reddit's `after=` cursor.
    Per-page failures break early with whatever's already collected.
    """
    sub = subreddit.lstrip("r/").strip()

    items: list[dict] = []
    cursor: str | None = None
    remaining = posts_limit

    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        first_page = True
        while remaining > 0:
            page_size = min(100, remaining)
            url = (
                f"https://www.reddit.com/r/{sub}/hot.json"
                f"?limit={page_size}"
            )
            if cursor:
                url += f"&after={cursor}"

            try:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                if first_page:
                    raise
                logger.warning(
                    "Reddit: paginated fetch failed at cursor=%s: %s",
                    cursor,
                    e,
                )
                break

            children = data.get("data", {}).get("children", [])
            if not children:
                break

            for child in children:
                if child.get("kind") != "t3":
                    continue
                post = child.get("data", {})
                items.append(_post_to_item(post))
                comments = await _fetch_post_comments(
                    client, sub, post["id"], comments_per_post
                )
                items.extend(comments)

            cursor = data.get("data", {}).get("after")
            if not cursor:
                break
            remaining -= len(children)
            first_page = False

    logger.info(
        "Reddit: fetched %d items (posts + comments) from r/%s "
        "(posts_limit=%d, comments_per_post=%d)",
        len(items),
        sub,
        posts_limit,
        comments_per_post,
    )
    return items


async def fetch_keyword_search(
    keyword: str,
    posts_limit: int = 100,
    comments_per_post: int = 5,
) -> list[dict]:
    """Search Reddit-wide for `keyword`, fetch hot posts + top comments per post.

    For posts_limit > 100, paginates via Reddit's `after=` cursor.
    Per-page failures break early with whatever's already collected.
    """
    encoded = quote(keyword)

    items: list[dict] = []
    cursor: str | None = None
    remaining = posts_limit

    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        first_page = True
        while remaining > 0:
            page_size = min(100, remaining)
            url = (
                f"https://www.reddit.com/search.json"
                f"?q={encoded}&sort=hot&limit={page_size}"
            )
            if cursor:
                url += f"&after={cursor}"

            try:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                if first_page:
                    raise
                logger.warning(
                    "Reddit: paginated keyword search failed at cursor=%s: %s",
                    cursor,
                    e,
                )
                break

            children = data.get("data", {}).get("children", [])
            if not children:
                break

            for child in children:
                if child.get("kind") != "t3":
                    continue
                post = child.get("data", {})
                sub = post.get("subreddit", "")
                items.append(_post_to_item(post))
                if sub:
                    comments = await _fetch_post_comments(
                        client, sub, post["id"], comments_per_post
                    )
                    items.extend(comments)

            cursor = data.get("data", {}).get("after")
            if not cursor:
                break
            remaining -= len(children)
            first_page = False

    logger.info(
        'Reddit: fetched %d items (posts + comments) for keyword "%s" '
        "(posts_limit=%d, comments_per_post=%d)",
        len(items),
        keyword,
        posts_limit,
        comments_per_post,
    )
    return items
