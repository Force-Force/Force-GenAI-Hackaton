from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def platform_admin_credentials(path: str) -> tuple[str, str]:
    """ZETARIS_ADMIN_EMAIL / ZETARIS_ADMIN_PASSWORD of a bundled Zetaris platform .env.

    Only those two lines are read; the file is never executed or parsed as a whole.
    """
    email = password = ""
    try:
        for line in Path(path).read_text(encoding="utf-8").splitlines():
            if line.startswith("ZETARIS_ADMIN_EMAIL="):
                email = line.split("=", 1)[1].strip()
            elif line.startswith("ZETARIS_ADMIN_PASSWORD="):
                password = line.split("=", 1)[1].strip()
    except OSError:
        pass
    return email, password


class ZetarisPlatformDefaults(BaseSettings):
    """Fill the Zetaris login from the bundled platform when .env does not set it."""

    zetaris_username: str = ""
    zetaris_password: str = ""

    zetaris_platform_env: str = ""

    @model_validator(mode="after")
    def _platform_login(self):
        if self.zetaris_platform_env and not (self.zetaris_username and self.zetaris_password):
            email, password = platform_admin_credentials(self.zetaris_platform_env)
            self.zetaris_username = self.zetaris_username or email
            self.zetaris_password = self.zetaris_password or password
        return self


class AnalysisSettings(ZetarisPlatformDefaults):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    zetaris_rest_url: str = "http://localhost:8888/api/v1.0"
    zetaris_api_url: str = ""
    zetaris_cloud_url: str = ""
    zetaris_mode: str = "cloud"
    zetaris_sql_endpoint: str = "/sql-editor/sqls/run"
    zetaris_org_id: int = 1
    zetaris_api_key: str = ""
    # Account used to obtain short-lived tokens when no static API key is configured.
    zetaris_auth_url: str = ""
    zetaris_username: str = ""
    zetaris_password: str = ""
    # .env of a bundled Zetaris platform, used for the login when the two fields above are empty.
    zetaris_platform_env: str = ""
    # Lightning database under which the AuraBI bank datasource is registered.
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

    max_agent_iterations: int = 8
    meterless_memory_log: str = "logs/meterless_memory.jsonl"

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
        if not self.zetaris_api_key and not (
            self.zetaris_auth_url and self.zetaris_username and self.zetaris_password
        ):
            missing.append("ZETARIS_API_KEY or ZETARIS_AUTH_URL + ZETARIS_USERNAME + ZETARIS_PASSWORD")
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
                "Configuration AuraBI incomplète pour l'analyse. Renseigne dans .env : "
                f"{joined}. Aucune valeur n'est affichée ici."
            )


@lru_cache
def get_analysis_settings() -> AnalysisSettings:
    settings = AnalysisSettings()
    settings.require_complete()
    return settings
