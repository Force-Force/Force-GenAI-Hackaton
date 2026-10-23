from app.analysis.intent import ScoutIntentEngine


def test_scout_intent_classifies_information_predictive_and_action_requests() -> None:
    engine = ScoutIntentEngine()

    informational = engine.classify("Show revenue by month")
    assert informational.intent == "informational"
    assert informational.route == "zetaris_read"
    assert informational.approval_required is False

    predictive = engine.classify("Forecast next quarter revenue trend")
    assert predictive.intent == "predictive"
    assert predictive.risk_level == "medium"

    action = engine.classify("Drop the sales table")
    assert action.intent == "action-oriented"
    assert action.route == "pipeline_action"
    assert action.approval_required is True
    assert action.risk_level == "high"


def test_scout_intent_is_case_insensitive_and_deterministic() -> None:
    engine = ScoutIntentEngine()
    prompt = "PREDICT customer churn"
    assert engine.classify(prompt) == engine.classify(prompt)
