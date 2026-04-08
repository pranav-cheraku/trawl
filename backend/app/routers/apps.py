from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.schemas.feedback import AppSearchResult
from app.services.appstore import search_apps

router = APIRouter(tags=["apps"])


@router.get("/apps/search", response_model=list[AppSearchResult])
async def search_apps_endpoint(
    q: str = Query(..., min_length=1),
    country: str = Query(default="us"),
    user_id: uuid.UUID = Depends(get_current_user),
) -> list[AppSearchResult]:
    """Search the iTunes Store for apps matching a query."""
    results = await search_apps(q, country)
    return [AppSearchResult(**r) for r in results]
