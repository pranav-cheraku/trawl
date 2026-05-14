from __future__ import annotations

import uuid

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.config import settings


class DemoAccessMiddleware(BaseHTTPMiddleware):
    """Intercept requests carrying a valid X-Demo-Token header.

    - GET requests: injects ``request.state.user_id_override`` with the demo
      user UUID so the auth dependency bypasses JWT validation.
    - Non-GET requests: rejected immediately with 403 (demo is read-only).
    - Missing or invalid token: passes through untouched (normal JWT path).
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ):
        """Check X-Demo-Token and gate access accordingly."""
        token = request.headers.get("X-Demo-Token")
        if token and token == settings.DEMO_TOKEN:
            if request.method != "GET":
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Demo mode is read-only."},
                )
            request.state.user_id_override = uuid.UUID(settings.DEMO_USER_ID)
        return await call_next(request)
