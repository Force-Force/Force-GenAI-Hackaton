from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://datapipe:datapipe@localhost:5432/datapipe"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    cors_allow_all: bool = False

    zetaris_rest_url: str = "http://localhost:8888/api/v1.0"
    zetaris_api_url: str = ""
    zetaris_sql_endpoint: str = "/sql-editor/sqls/run"
    zetaris_org_id: int = 1
    zetaris_api_key: str = ""

    model_base_url: str = ""
    model_api_key: str = ""
    nemotron_model: str = ""

    chat_history_limit: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_configured(self) -> bool:
        return bool(self.model_base_url and self.model_api_key and self.nemotron_model)


@lru_cache
def get_settings() -> Settings:
    return Settings()
