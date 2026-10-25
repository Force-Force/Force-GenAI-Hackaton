from app.services.plan_service import apply_plan_approval, build_agentic_plan


def test_build_agentic_plan_contains_agentic_tasks() -> None:
    plan = build_agentic_plan(
        "Build a retail lakehouse pipeline",
        ["src_sales_transactions", "src_stripe_events"],
    )

    assert plan["prompt"] == "Build a retail lakehouse pipeline"
    assert plan["stages"]
    assert plan["task_roles"] == ["PROFILER", "ENGINEER", "GUARDIAN"]
    assert any(stage["agent_role"] == "ENGINEER" for stage in plan["stages"])


def test_apply_plan_approval_sets_active_state_and_selected_kpis() -> None:
    plan = build_agentic_plan("Build a retail lakehouse pipeline", [])
    approved = apply_plan_approval(
        plan,
        plan_id="plan_retail_01",
        selected_answers={"scd-strategy": "scd-2"},
        selected_kpi_ids=["net-recognized-revenue", "active-customer-360"],
    )

    assert approved["status"] == "ACTIVE"
    assert approved["planId"] == "plan_retail_01"
    assert approved["selectedKpiIds"] == ["net-recognized-revenue", "active-customer-360"]
    assert approved["selectedAnswers"]["scd-strategy"] == "scd-2"
