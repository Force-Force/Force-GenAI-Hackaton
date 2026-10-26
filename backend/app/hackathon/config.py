from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class HackathonSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    zetaris_rest_url: str = "http://localhost:8888/api/v1.0"
    zetaris_api_url: str = ""
    zetaris_cloud_url: str = ""
    zetaris_mode: str = "cloud"
    zetaris_sql_endpoint: str = "/sql-editor/sqls/run"
    zetaris_org_id: int = 1
    zetaris_api_key: str = ""

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

    max_agent_iterations: int = 8

    @property
    def resolved_zetaris_url(self) -> str:
        if self.zetaris_mode == "cloud" and self.zetaris_cloud_url:
            return self.zetaris_cloud_url
        if self.zetaris_api_url:
            return self.zetaris_api_url
        return self.zetaris_rest_url

    @property
    def missing_required_fields(self) -> list[str]:
        missing: list[str] = []
        if not self.zetaris_api_key:
            missing.append("ZETARIS_API_KEY")
        if self.model_provider == "nightshift":
            fields = (
                ("NIGHTSHIFT_BASE_URL", self.nightshift_base_url or self.model_base_url),
                ("NIGHTSHIFT_API_KEY", self.nightshift_api_key),
                ("NIGHTSHIFT_MODEL", self.nightshift_model or self.nemotron_model),
            )
        elif self.model_provider == "nvidia":
            fields = (
                ("NVIDIA_BASE_URL", self.nvidia_base_url or self.model_base_url),
                ("NVIDIA_API_KEY", self.nvidia_api_key or self.model_api_key),
                ("NVIDIA_MODEL", self.nvidia_model or self.nemotron_model),
            )
        else:
            missing.append("MODEL_PROVIDER (nightshift or nvidia)")
            fields = ()
        missing.extend(name for name, value in fields if not value)
        return missing

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

    def require_complete(self) -> None:
        missing = self.missing_required_fields
        if missing:
            joined = ", ".join(missing)
            raise RuntimeError(
                "Configuration AuraBI incomplète pour le hackathon. Renseigne dans .env : "
                f"{joined}. Aucune valeur n'est affichée ici."
            )


@lru_cache
def get_hackathon_settings() -> HackathonSettings:
    settings = HackathonSettings()
    settings.require_complete()
    return settings
