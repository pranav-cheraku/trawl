from __future__ import annotations

import uuid

from app.database import get_db  # noqa: F401  re-exported for router convenience
from app.middleware.auth import get_user_id_from_token

# Keep for reference in seed scripts and tests
DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Drop-in replacement — all routers already use Depends(get_current_user)
get_current_user = get_user_id_from_token
