from __future__ import annotations

from app.database import get_db  # noqa: F401  re-exported for router convenience
from app.middleware.auth import get_user_id_from_token

get_current_user = get_user_id_from_token
