import { beforeEach, describe, expect, it } from "vitest";
import { executeUiop } from "./uiopRuntime";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import { usePlanStore } from "../store/planStore";
import { useWorkspaceStore } from "../../workspace/store/workspaceStore";
import { useInsightStore } from "../../insights/store/insightStore";
import type { DatamartNode } from "../../../types/pipeline";

describe("UIOP Runtime (UI Operations Protocol v1.0)", () => {
  beforeEach(() => {
    usePipelineStore.setState({
      nodes: [],
      edges: [],
    });
    usePlanStore.getState().resetProtocolState();
    useWorkspaceStore.setState({
      projectName: "Retail Lakehouse Master Pipeline",
      activeTab: "canvas",
    });
  });

  it("rejects envelopes with unsupported protocol or version", () => {
    const res = executeUiop({
      protocol: "legacy-v0",
      version: "2.0",
      messageId: "msg-bad",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "builder-agent", executionId: "exec-1" },
      operations: [],
    });

    expect(res.ok).toBe(false);
    expect(res.errors[0].code).toBe("INVALID_ENVELOPE");
  });

  it("adds, updates, and connects canvas nodes atomically in a single batch", () => {
    const res = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-canvas-1",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "builder-agent", executionId: "exec-1" },
      operations: [
        {
          op: "node.add",
          params: {
            id: "src-stripe",
            type: "resource",
            position: { x: 100, y: 120 },
            data: {
              label: "raw_stripe_events",
              description: "Stripe webhook payload stream",
              kind: "source",
              format: "stripe",
              columns: [
                {
                  name: "event_id",
                  type: "UUID",
                  isPrimaryKey: true,
                  isForeignKey: false,
                },
                {
                  name: "amount_cents",
                  type: "INT",
                  isPrimaryKey: false,
                  isForeignKey: false,
                },
              ],
            },
          },
        },
        {
          op: "node.add",
          params: {
            id: "proc-clean",
            type: "processing",
            position: { x: 420, y: 120 },
            data: {
              label: "clean_stripe_events",
              description: "Cleansed Stripe ledger",
              language: "sql",
              code: "SELECT event_id, amount_cents / 100.0 AS amount_usd FROM raw_stripe_events;",
            },
          },
        },
        {
          op: "edge.add",
          params: {
            id: "e-stripe-clean",
            source: "src-stripe",
            target: "proc-clean",
          },
        },
      ],
    });

    expect(res.ok).toBe(true);
    expect(res.appliedCount).toBe(3);
    expect(res.newRevision).toBe(2);
    expect(usePipelineStore.getState().nodes).toHaveLength(2);
    expect(usePipelineStore.getState().edges).toHaveLength(1);
  });

  it("automatically routes warehouse tables (fact, dimension, generated) into the warehouse container when present", () => {
    const warehouseContainer: DatamartNode = {
      id: "wh-1",
      type: "datamart",
      position: { x: 600, y: 80 },
      data: {
        category: "datamart",
        containerKind: "warehouse",
        label: "Enterprise Star Schema",
        description: "Central warehouse container",
        expanded: false,
        children: { nodes: [], edges: [] },
      },
    };
    usePipelineStore.setState({ nodes: [warehouseContainer], edges: [] });

    const res = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-wh-table",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "builder-agent", executionId: "exec-2" },
      operations: [
        {
          op: "node.add",
          params: {
            id: "dim-region",
            type: "dataModel",
            position: { x: 0, y: 0 },
            data: {
              label: "dim_region",
              description: "Regional hierarchy dimension",
              kind: "table",
              warehouseRole: "dimension",
              columns: [
                {
                  name: "region_sk",
                  type: "BIGINT",
                  isPrimaryKey: true,
                  isForeignKey: false,
                },
                {
                  name: "region_name",
                  type: "VARCHAR",
                  isPrimaryKey: false,
                  isForeignKey: false,
                },
              ],
            },
          },
        },
      ],
    });

    expect(res.ok).toBe(true);
    const updatedContainer = usePipelineStore
      .getState()
      .nodes.find((n) => n.id === "wh-1") as DatamartNode;
    expect(updatedContainer.data.children.nodes).toHaveLength(1);
    expect(updatedContainer.data.children.nodes[0].id).toBe("dim-region");
  });

  it("enforces all-or-nothing batch rollback when a later operation fails semantic validation", () => {
    const initialNodesCount = usePipelineStore.getState().nodes.length;

    const res = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-atomic-fail",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "builder-agent", executionId: "exec-3" },
      operations: [
        {
          op: "node.add",
          params: {
            id: "src-valid",
            type: "resource",
            position: { x: 50, y: 50 },
            data: {
              label: "valid_node",
              description: "Should roll back",
              kind: "source",
            },
          },
        },
        {
          op: "edge.add",
          params: {
            id: "edge-dangling",
            source: "src-valid",
            target: "non-existent-node-id",
          },
        },
      ],
    });

    expect(res.ok).toBe(false);
    expect(res.appliedCount).toBe(0);
    expect(res.errors[0].code).toBe("ENTITY_NOT_FOUND");
    // Ensure src-valid was NOT committed
    expect(usePipelineStore.getState().nodes).toHaveLength(initialNodesCount);
  });

  it("rejects duplicate messageId and stale baseRevision", () => {
    const first = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-unique-1",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "builder-agent", executionId: "exec-4" },
      operations: [
        {
          op: "layout.update",
          params: { direction: "LR" },
        },
      ],
    });
    expect(first.ok).toBe(true);
    expect(first.newRevision).toBe(2);

    // Duplicate messageId
    const duplicate = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-unique-1",
      workspaceId: "workspace_01",
      baseRevision: 2,
      source: { agentId: "builder-agent", executionId: "exec-4" },
      operations: [
        {
          op: "layout.update",
          params: { direction: "LR" },
        },
      ],
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.errors[0].code).toBe("DUPLICATE_MESSAGE");

    // Stale baseRevision (current is 2, sending 1)
    const stale = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-stale-rev",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "builder-agent", executionId: "exec-5" },
      operations: [
        {
          op: "layout.update",
          params: { direction: "LR" },
        },
      ],
    });
    expect(stale.ok).toBe(false);
    expect(stale.errors[0].code).toBe("STALE_REVISION");
  });

  it("validates panel.add against the approved component registry", () => {
    const validPanel = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-panel-ok",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "audit-agent", executionId: "exec-6" },
      operations: [
        {
          op: "panel.add",
          params: {
            id: "dq-panel-1",
            component: "DataQualityPanel",
            title: "Fact Revenue Null Audit",
            config: {
              datasetId: "fact_daily_revenue",
              showMissingValues: true,
              nullThresholdPct: 2,
            },
          },
        },
      ],
    });

    expect(validPanel.ok).toBe(true);
    expect(usePlanStore.getState().panels).toHaveLength(1);
    expect(usePlanStore.getState().panels[0].component).toBe(
      "DataQualityPanel",
    );

    const invalidPanel = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-panel-bad",
      workspaceId: "workspace_01",
      baseRevision: 2,
      source: { agentId: "audit-agent", executionId: "exec-7" },
      operations: [
        {
          op: "panel.add",
          params: {
            id: "arbitrary-panel",
            component: "RawHtmlExecutionWidget",
            title: "Malicious Panel",
            config: {},
          },
        },
      ],
    });

    expect(invalidPanel.ok).toBe(false);
    expect(invalidPanel.errors[0].code).toBe("UNREGISTERED_COMPONENT");
  });

  it("creates/updates plans and proposes/answers clarifying questions via UIOP", () => {
    const currentStages = usePlanStore.getState().stages;
    const res = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-plan-and-question",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "planner-agent", executionId: "exec-8" },
      operations: [
        {
          op: "plan.update",
          params: {
            title: "Real-Time Fraud & Ledger Pipeline",
            stages: [
              ...currentStages,
              {
                id: "stage-6-anomaly",
                number: "06",
                title: "Streaming Anomaly Detection",
                category: "Verification",
                description:
                  "Isolates suspicious velocity spikes before mart commit.",
                tables: ["quarantine_velocity_alerts"],
                technologies: ["Spark Structured Streaming"],
              },
            ],
          },
        },
        {
          op: "question.propose",
          params: {
            id: "anomaly-window-policy",
            question:
              "What tumbling window should be used for velocity anomaly checks?",
            context:
              "Shorter windows detect bursts faster but increase state store memory.",
            options: [
              {
                id: "window-5m",
                label: "5-Minute Tumbling Window",
                description: "Balanced latency and memory footprint",
                isRecommended: true,
              },
              {
                id: "window-1m",
                label: "1-Minute Sliding Window",
                description: "Ultra-low latency fraud blocking",
              },
            ],
            selectedOptionId: "window-5m",
          },
        },
        {
          op: "question.answer",
          params: {
            id: "anomaly-window-policy",
            optionId: "window-1m",
          },
        },
      ],
    });

    expect(res.ok).toBe(true);
    const planState = usePlanStore.getState();
    expect(planState.planTitle).toBe("Real-Time Fraud & Ledger Pipeline");
    expect(planState.stages.some((s) => s.id === "stage-6-anomaly")).toBe(true);
    expect(
      planState.questions.some((q) => q.id === "anomaly-window-policy"),
    ).toBe(true);
    expect(planState.selectedAnswers["anomaly-window-policy"]).toBe(
      "window-1m",
    );
  });

  it("handles insight operations (set_summary, add, update, remove) atomically", () => {
    useInsightStore.getState().resetInsights();

    const res = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-insight-1",
      workspaceId: "workspace_01",
      baseRevision: 1,
      source: { agentId: "nightshift-analysis-agent", executionId: "exec-ins-1" },
      operations: [
        {
          op: "insight.set_summary",
          params: {
            cards: [
              {
                id: "kpi-rev",
                label: "Q4 Net ARR",
                value: "$4.2M",
                delta: "+14.2%",
                trend: "up",
                sourceTable: "fact_daily_revenue",
              },
            ],
          },
        },
        {
          op: "insight.add",
          params: {
            id: "chart-mrr-growth",
            title: "Monthly Recurring Revenue Trend",
            domain: "sales",
            categoryLabel: "Financial Modeling",
            summary: "Accelerating MRR growth in mid-market tier.",
            aiReasoning: "Line graph selected for continuous temporal trajectory.",
            aiConfidenceScore: 98,
            chart: {
              type: "line",
              data: [
                { x: "Jan", y: 100 },
                { x: "Feb", y: 140 },
                { x: "Mar", y: 210 },
              ],
            },
            provenance: {
              executedSql: "SELECT month, SUM(mrr) FROM fact_subscriptions GROUP BY 1",
              sourceTables: ["fact_subscriptions"],
            },
          },
        },
        {
          op: "insight.update",
          params: {
            id: "chart-mrr-growth",
            summary: "Updated MRR trajectory showing sustained expansion.",
          },
        },
      ],
    });

    expect(res.ok).toBe(true);
    const insightState = useInsightStore.getState();
    expect(insightState.summaryCards[0].label).toBe("Q4 Net ARR");
    expect(insightState.summaryCards[0].value).toBe("$4.2M");

    const added = insightState.insights.find((i) => i.id === "chart-mrr-growth");
    expect(added).toBeDefined();
    expect(added?.title).toBe("Monthly Recurring Revenue Trend");
    expect(added?.selectedGraphType).toBe("line");
    expect(added?.summary).toBe("Updated MRR trajectory showing sustained expansion.");
    expect(added?.provenance?.executedSql).toContain("SELECT month, SUM(mrr)");

    // Test insight.remove
    const removeRes = executeUiop({
      protocol: "uiop",
      version: "1.0",
      messageId: "msg-insight-2",
      workspaceId: "workspace_01",
      baseRevision: 2,
      source: { agentId: "nightshift-analysis-agent", executionId: "exec-ins-2" },
      operations: [
        {
          op: "insight.remove",
          params: {
            id: "chart-mrr-growth",
          },
        },
      ],
    });

    expect(removeRes.ok).toBe(true);
    expect(
      useInsightStore.getState().insights.some((i) => i.id === "chart-mrr-growth"),
    ).toBe(false);
  });
});
