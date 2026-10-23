from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class HackathonSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    zetaris_rest_url: str = "http://localhost:8888/api/v1.0"
    zetaris_org_id: int = 1
    zetaris_api_key: str = ""

    model_base_url: str = ""
    model_api_key: str = ""
    nemotron_model: str = ""

    max_agent_iterations: int = 8

    @property
    def missing_required_fields(self) -> list[str]:
        missing: list[str] = []
        if not self.zetaris_api_key:
            missing.append("ZETARIS_API_KEY")
        if not self.model_base_url:
            missing.append("MODEL_BASE_URL")
        if not self.model_api_key:
            missing.append("MODEL_API_KEY")
        if not self.nemotron_model:
            missing.append("NEMOTRON_MODEL")
        return missing

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
