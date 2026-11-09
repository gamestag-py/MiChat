import jwt

from app.core.config import settings
from app.core.tokens import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
)

access_token = create_access_token(1)
refresh_token = create_refresh_token()

decoded = jwt.decode(
    access_token,
    settings.JWT_SECRET,
    algorithms=[settings.JWT_ALGORITHM],
)

print("Access token generated:", bool(access_token))
print("Token subject:", decoded["sub"])
print("Token type:", decoded["type"])
print("Refresh token generated:", bool(refresh_token))
print("Refresh token hash length:", len(hash_refresh_token(refresh_token)))