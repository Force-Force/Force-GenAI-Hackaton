from app.config import Settings


def test_root_settings_match_nemotron_zetaris_defaults() -> None:
    settings = Settings()

    assert settings.model_provider == "nvidia"
    assert settings.resolved_zetaris_url == settings.zetaris_rest_url
    assert settings.active_model == (settings.nvidia_model or settings.nemotron_model)


def test_root_settings_prefers_cloud_zetaris_when_configured() -> None:
    settings = Settings(
        zetaris_mode="cloud",
        zetaris_rest_url="http://localhost:8888/api/v1.0",
        zetaris_cloud_url="https://cloud.example.test/api/v1.0",
    )

    assert settings.resolved_zetaris_url == "https://cloud.example.test/api/v1.0"
