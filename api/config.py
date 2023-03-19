from typing import Optional
from pydantic import BaseSettings


class Settings(BaseSettings):
    debug = True
    allow_origin: Optional[str] = None

    region: str
    # Auth
    auth_jwks_file = "misc/jwks.json"
    auth_client_id: str
    auth_client_secret: str
    auth_redirect_uri: str
    auth_token_endpoint: str
    auth_revoke_endpoint: str


settings = Settings()
