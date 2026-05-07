"""Application settings loaded from environment.

Per .planning/phases/01-foundations-w1/01-CONTEXT.md "Claude's Discretion":
- CORS = explicit allowlist (no wildcard)
- Local dev hits Supabase directly (no Docker Postgres)
- Service-role key lives only in backend env (D-02)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    cors_allowed_origins: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    environment: str = "development"
    gemini_api_key: str = ""
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_email: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


settings = Settings()  # type: ignore[call-arg]
