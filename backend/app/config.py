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
    zetaris_cloud_url: str = ""
    zetaris_mode: str = "cloud"
    zetaris_sql_endpoint: str = "/sql-editor/sqls/run"
    zetaris_org_id: int = 1
    zetaris_api_key: str = ""
    zetaris_auth_url: str = ""
    zetaris_username: str = ""
    zetaris_password: str = ""
    zetaris_bank_database: str = "AURABI_BANK"

    model_base_url: str = ""
    model_api_key: str = ""
    nemotron_model: str = ""
    model_provider: str = "nvidia"
    nightshift_base_url: str = ""
    nightshift_api_key: str = ""
    nightshift_model: str = ""
    nvidia_base_url: str = ""
    nvidia_api_key: str = ""
    nvidia_model: str = ""

    chat_history_limit: int = 20

    @property
    def resolved_zetaris_url(self) -> str:
        if self.zetaris_mode == "cloud" and self.zetaris_cloud_url:
            return self.zetaris_cloud_url
        if self.zetaris_api_url:
            return self.zetaris_api_url
        return self.zetaris_rest_url

    @property
    def zetaris_configured(self) -> bool:
        return bool(
            self.resolved_zetaris_url
            and (self.zetaris_api_key or (self.zetaris_auth_url and self.zetaris_username and self.zetaris_password))
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_configured(self) -> bool:
        if self.model_provider == "nightshift":
            return bool(
                (self.nightshift_base_url or self.model_base_url)
                and self.nightshift_api_key
                and (self.nightshift_model or self.nemotron_model)
            )
        if self.model_provider == "nvidia":
            return bool(
                (self.nvidia_base_url or self.model_base_url)
                and (self.nvidia_api_key or self.model_api_key)
                and (self.nvidia_model or self.nemotron_model)
            )
        return False

    @property
    def active_model_config(self) -> tuple[str, str, str]:
        if self.model_provider == "nightshift":
            return (
                self.nightshift_base_url or self.model_base_url,
                self.nightshift_api_key,
                self.nightshift_model or self.nemotron_model,
            )
        return (
            self.nvidia_base_url or self.model_base_url,
            self.nvidia_api_key or self.model_api_key,
            self.nvidia_model or self.nemotron_model,
        )

    @property
    def active_model(self) -> str:
        if self.model_provider == "nightshift":
            return self.nightshift_model or self.nemotron_model
        return self.nvidia_model or self.nemotron_model


@lru_cache
def get_settings() -> Settings:
    return Settings()
