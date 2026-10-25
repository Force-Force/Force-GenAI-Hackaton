import re
from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class IntentDecision:
    intent: str
    route: str
    risk_level: str
    approval_required: bool
    reason: str

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


class ScoutIntentEngine:
    """Deterministic first-pass routing for analysis and pipeline requests."""

    ACTION_PATTERNS = (
        r"\b(drop|delete|remove|truncate|update|insert|alter|create|write|export|run|execute)\b",
        r"\b(supprime|supprimer|efface|effacer|modifie|modifier|ecris|écris|exporte|exécute|lance)\b",
    )
    PREDICTIVE_PATTERNS = (
        r"\b(forecast|predict|prediction|trend|future|anomal\w*|risk|projection|project|estimate|unusual)\b",
        r"\b(prévoi\w*|prévision|tendance|futur\w*|anomal\w*|risque|projection|estime\w*)\b",
    )

    def classify(self, text: str) -> IntentDecision:
        normalized = text.strip().lower()
        if not normalized:
            return IntentDecision(
                intent="informational",
                route="zetaris_read",
                risk_level="low",
                approval_required=False,
                reason="Empty input is handled as a read-only informational request.",
            )

        if self._matches(self.ACTION_PATTERNS, normalized):
            return IntentDecision(
                intent="action-oriented",
                route="pipeline_action",
                risk_level="high",
                approval_required=True,
                reason="The request contains an operation that can change or export data.",
            )

        if self._matches(self.PREDICTIVE_PATTERNS, normalized):
            return IntentDecision(
                intent="predictive",
                route="zetaris_read",
                risk_level="medium",
                approval_required=False,
                reason="The request asks for a forecast, trend, anomaly, or risk analysis.",
            )

        return IntentDecision(
            intent="informational",
            route="zetaris_read",
            risk_level="low",
            approval_required=False,
            reason="The request asks for facts or descriptive analysis.",
        )

    @staticmethod
    def _matches(patterns: tuple[str, ...], text: str) -> bool:
        return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)
