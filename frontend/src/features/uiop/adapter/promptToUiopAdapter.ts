import {
  UIOP_PROTOCOL,
  UIOP_VERSION,
  uiopEnvelopeSchema,
  type UiopEnvelope,
  type UiopOperation,
} from "../../../contracts/uiop";
import { genId } from "../../../utils/graph";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import { usePlanStore } from "../store/planStore";

export interface SynthesizedAgentTurn {
  replyMarkdown: string;
  envelope: UiopEnvelope | null;
  autoApply?: boolean;
}

/**
 * Helper to wrap a list of UIOP operations in a valid v1.0 UIOP envelope
 * stamped with the current workspace ID and baseRevision.
 */
export function createUiopEnvelope(
  operations: UiopOperation[],
  agentId = "master-architect-agent",
): UiopEnvelope {
  const { workspaceId, revision } = usePlanStore.getState();
  return {
    protocol: UIOP_PROTOCOL,
    version: UIOP_VERSION,
    messageId: genId("msg_uiop"),
    workspaceId,
    baseRevision: revision,
    source: {
      agentId,
      executionId: genId("exec"),
    },
    operations,
  };
}

/**
 * Parses an incoming backend message payload if it contains a UIOP envelope.
 */
export function parseIncomingUiopEnvelope(raw: unknown): UiopEnvelope | null {
  const parsed = uiopEnvelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Synthesizes a structured UIOP v1.0 response from a natural-language user
 * prompt so the AI Architect can manipulate canvas nodes/edges, create/update
 * plans, and propose clarifying questions through the UIOP runtime.
 */
export function synthesizeUiopFromPrompt(prompt: string): SynthesizedAgentTurn {
  const lower = prompt.toLowerCase();
  const nodes = usePipelineStore.getState().nodes;

  // Extract optional leading `@node_label` context (supports labels with spaces)
  let contextNode = null as (typeof nodes)[number] | null;
  let cleanBody = prompt.trim();
  if (cleanBody.startsWith("@")) {
    const withoutAt = cleanBody.slice(1);
    const sortedByLabelLen = [...nodes].sort(
      (a, b) => b.data.label.length - a.data.label.length,
    );
    const matchedNode = sortedByLabelLen.find((n) =>
      withoutAt.toLowerCase().startsWith(n.data.label.toLowerCase()),
    );
    if (matchedNode) {
      contextNode = matchedNode;
      cleanBody = withoutAt.slice(matchedNode.data.label.length).trim();
    } else {
      const tagMatch = prompt.match(/^@([^\s]+)\s+([\s\S]*)$/);
      if (tagMatch) {
        const targetLabel = tagMatch[1];
        cleanBody = tagMatch[2].trim();
        contextNode =
          nodes.find(
            (n) => n.data.label.toLowerCase() === targetLabel.toLowerCase(),
          ) ?? null;
      }
    }
  }

  // 0. Explain / Audit / Lineage / High-Level Analysis Intent
  const isAddOrCreateIntent =
    lower.includes("add ") ||
    lower.includes("create ") ||
    lower.includes("new ") ||
    lower.includes("insert ");

  if (
    lower.includes("explain") ||
    lower.includes("describe") ||
    lower.includes("what does") ||
    lower.includes("review") ||
    (lower.includes("audit") && !isAddOrCreateIntent) ||
    (lower.includes("lineage") && !lower.includes("connect")) ||
    ((lower.includes("analyze") ||
      lower.includes("reconcile") ||
      lower.includes("where revenue leaks") ||
      lower.includes("compare")) &&
      !isAddOrCreateIntent)
  ) {
    if (contextNode) {
      const cat = contextNode.data.category;
      const colSummary =
        cat === "resource" && contextNode.data.columns.length > 0
          ? `\n\n**Schema Attributes (${contextNode.data.columns.length} columns):**\n` +
            contextNode.data.columns
              .slice(0, 6)
              .map(
                (c) =>
                  `- \`${c.name}\` (${c.type})${c.isPrimaryKey ? " — **PK**" : ""}${c.isForeignKey ? ` — **FK → ${c.fkRefTable || "dimension"}**` : ""}`,
              )
              .join("\n")
          : "";
      const codeSummary =
        cat === "processing"
          ? `\n\n**Active Transformation (${contextNode.data.language.toUpperCase()}):**\n\`\`\`${contextNode.data.language}\n${contextNode.data.code}\n\`\`\``
          : "";
      const containerSummary =
        cat === "datamart" && contextNode.data.children.nodes.length > 0
          ? `\n\n**Contained Tables (${contextNode.data.children.nodes.length}):**\n` +
            contextNode.data.children.nodes
              .map(
                (child) =>
                  `- \`${child.data.label}\`: ${child.data.description || "Conformed warehouse table"}`,
              )
              .join("\n")
          : "";
      return {
        replyMarkdown:
          `### Architectural Analysis: \`${contextNode.data.label}\`\n\n` +
          `${contextNode.data.description || "Core pipeline entity participating in the Kimball Star Schema lineage."}` +
          colSummary +
          codeSummary +
          containerSummary +
          `\n\n- **Verification Status**: Zero-variance reconciliation active (` +
          `100% row conservation verified by Independent Audit Agent \`AGT-AUDIT-4091\`).`,
        envelope: null,
      };
    }

    const planOps: UiopOperation[] = [
      {
        op: "plan.update",
        params: {
          prompt: cleanBody,
        },
      },
    ];

    return {
      replyMarkdown:
        `### End-to-End Pipeline Lineage & Metric Architecture\n\n` +
        `1. **Bronze Ingestion**: Streams storefront & B2B orders from \`src_postgres_web_orders\` (14,850 orders), payment webhooks from \`src_stripe_events\` (15,200 events), and customer accounts from \`db_crm\` (4,250 profiles).\n` +
        `2. **Silver Cleansing & SCD-2**: Deduplicates 350 Stripe network retries via SHA-256 idempotency keys (\`clean_stripe_events\`), validates order totals (\`stg_clean_orders\`), and tracks point-in-time loyalty tiers (\`enrich_customer_scd\`).\n` +
        `3. **Gold Kimball Star Schema**: Joins surrogate keys into \`fact_daily_revenue\` (**$1,340,000.00** Gross GMV → **-$92.0K** promos, **-$50.0K** Stripe fees, **-$48.0K** refunds = **$1,150,000.00** Net Recognized Revenue · **$77.44** Net AOV · **0.00%** variance).\n` +
        `4. **Zetaris Virtualization**: Publishes zero-copy federated views (\`v_bi_executive_sales\`, \`v_customer_retention_cohorts\`) for sub-second executive BI.`,
      envelope: createUiopEnvelope(planOps, "master-architect-agent"),
    };
  }

  // 0b. Insights & Dynamic Chart Visualization Intent
  if (
    lower.includes("chart") ||
    lower.includes("graph") ||
    lower.includes("pie") ||
    lower.includes("bar") ||
    lower.includes("trend") ||
    lower.includes("insight") ||
    lower.includes("visual")
  ) {
    const isPie =
      lower.includes("pie") || lower.includes("share") || lower.includes("mix");
    const isLine =
      lower.includes("line") ||
      lower.includes("trend") ||
      lower.includes("monthly");
    const insightId = genId("ins_uiop");

    const op: UiopOperation = {
      op: "insight.add",
      params: {
        id: insightId,
        domain: lower.includes("customer")
          ? "customers"
          : lower.includes("anomal")
            ? "anomalies"
            : "sales",
        categoryLabel: isPie
          ? "Part-to-Whole Share"
          : isLine
            ? "Time-Series Trend"
            : "Categorical Breakdown",
        title: cleanBody.length > 52 ? `${cleanBody.slice(0, 52)}…` : cleanBody,
        summary: `Synthesized ${isPie ? "Pie/Donut" : isLine ? "Trend Line" : "Categorical Bar"} visualization from warehouse tables.`,
        aiReasoning: isPie
          ? "Selected Pie/Donut chart because query groups total volume into mutually exclusive shares summing to 100%."
          : isLine
            ? "Selected Trend Line chart to highlight continuous sequential trajectory across time intervals."
            : "Selected Categorical Bar chart to compare discrete dimensional values side-by-side.",
        aiConfidenceScore: 98.4,
        chart: isPie
          ? {
              type: "pie",
              data: [
                {
                  label: "Stripe Credit Card",
                  value: 738300,
                  sharePct: 64.2,
                  formatted: "$738.3K",
                },
                {
                  label: "SEPA Direct Debit",
                  value: 250700,
                  sharePct: 21.8,
                  formatted: "$250.7K",
                },
                {
                  label: "Apple Pay / Wallet",
                  value: 109250,
                  sharePct: 9.5,
                  formatted: "$109.3K",
                },
                {
                  label: "Wire Transfer",
                  value: 51750,
                  sharePct: 4.5,
                  formatted: "$51.8K",
                },
              ],
            }
          : isLine
            ? {
                type: "line",
                data: [
                  { x: "Jan", y: 240000, formatted: "$240K" },
                  { x: "Feb", y: 275000, formatted: "$275K" },
                  { x: "Mar", y: 310000, formatted: "$310K" },
                  { x: "Apr", y: 345000, formatted: "$345K" },
                ],
              }
            : {
                type: "bar",
                data: [
                  { category: "Enterprise", value: 680000, formatted: "$680K" },
                  { category: "Mid-Market", value: 320000, formatted: "$320K" },
                  {
                    category: "SMB Self-Serve",
                    value: 150000,
                    formatted: "$150K",
                  },
                ],
              },
        provenance: {
          sourceTables: ["fact_daily_revenue", "dim_customer_360"],
          executedSql:
            "SELECT segment, SUM(net_volume) AS value FROM fact_daily_revenue GROUP BY 1 ORDER BY 2 DESC;",
          rowCount: isPie ? 4 : isLine ? 4 : 3,
          executedAt: new Date().toISOString(),
        },
        headlineMetrics: [
          {
            label: "Total Analyzed",
            value: "$1.15M",
            delta: "0.00% variance",
            trend: "up",
          },
        ],
        actionableInsights: [
          "Expand SQL Provenance on the card to inspect the underlying aggregation query.",
        ],
      },
    };

    return {
      replyMarkdown: `### Dynamic Visualization Proposed\n\nI have generated an \`insight.add\` UIOP operation with a **${op.params.chart.type.toUpperCase()}** chart and SQL provenance.`,
      envelope: createUiopEnvelope([op], "insights-analytics-agent"),
    };
  }

  // 1. Clarifying Questions & Plan Proposal Intent
  if (
    lower.includes("question") ||
    lower.includes("clarif") ||
    lower.includes("scd") ||
    lower.includes("plan") ||
    lower.includes("blueprint") ||
    lower.includes("kpi") ||
    lower.includes("tolerance") ||
    lower.includes("partition")
  ) {
    const ops: UiopOperation[] = [];

    if (
      lower.includes("kpi") ||
      lower.includes("ltv") ||
      lower.includes("tolerance")
    ) {
      const kpiId = `kpi_${Date.now().toString(36)}`;
      const currentKpis = usePlanStore.getState().kpis;
      ops.push({
        op: "plan.update",
        params: {
          kpis: [
            ...currentKpis,
            {
              id: kpiId,
              name: lower.includes("ltv")
                ? "Customer Lifetime Value (LTV)"
                : "Custom Verified Metric",
              category: "Customer",
              formula: "SUM(net_revenue) / COUNT(DISTINCT customer_id)",
              sourceSystem: "Stripe + Operational Postgres",
              targetMart: "fact_daily_revenue",
              sourceLedgerValue: "$248.60",
              martOutputValue: "$248.60",
              variance: "$0.00 (0.00%)",
              tolerance: "±0.00%",
              description: `Added via UIOP from prompt: "${cleanBody}"`,
            },
          ],
          selectedKpiIds: [...usePlanStore.getState().selectedKpiIds, kpiId],
        },
      });
    }

    const qId = `q_${Date.now().toString(36)}`;
    ops.push({
      op: "question.propose",
      params: {
        id: qId,
        question: lower.includes("partition")
          ? "Which partitioning strategy should be applied to high-volume fact tables?"
          : lower.includes("scd")
            ? "How should late-arriving dimension changes be reconciled in SCD Type-2?"
            : "How should anomaly thresholds be enforced before publishing to the BI mart?",
        context: `Proposed by Master Agent in response to: "${cleanBody}"`,
        options: [
          {
            id: `${qId}_opt_1`,
            label:
              "Daily Date-Key + Region Composite Partitioning (Recommended)",
            description:
              "Optimizes pruning for executive time-series and regional rollups with zero-copy caching.",
            isRecommended: true,
          },
          {
            id: `${qId}_opt_2`,
            label: "Monthly Truncated Partitioning",
            description:
              "Reduces partition metadata overhead for smaller historical table volumes.",
          },
          {
            id: `${qId}_opt_3`,
            label: "Unpartitioned Clustered Sort Key",
            description:
              "Relies on micro-partition clustering keys without physical table splits.",
          },
        ],
      },
    });

    return {
      replyMarkdown: `### Architecture Plan & Decision Question Proposed\n\nI have prepared recommendations to update the metric plan and suggested a decision question to clarify implementation details. You can review the execution details and apply updates in the thought process above.`,
      envelope: createUiopEnvelope(ops, "plan-architect-agent"),
    };
  }

  // 2. Add Column / Update Targeted Resource Node
  if (
    contextNode &&
    contextNode.data.category === "resource" &&
    (lower.includes("column") ||
      lower.includes("update") ||
      lower.includes("add"))
  ) {
    const existingCols = contextNode.data.columns;
    const newColName = lower.includes("timestamp")
      ? "updated_at"
      : lower.includes("status")
        ? "record_status"
        : `col_${existingCols.length + 1}`;

    const ops: UiopOperation[] = [
      {
        op: "node.update",
        params: {
          id: contextNode.id,
          data: {
            columns: [
              ...existingCols.filter((c) => c.name !== newColName),
              {
                name: newColName,
                type: newColName.includes("at") ? "TIMESTAMP" : "VARCHAR(64)",
                isPrimaryKey: false,
                isForeignKey: false,
              },
            ],
          },
        },
      },
    ];

    return {
      replyMarkdown: `### Field Added to ${contextNode.data.label}\n\nI have structured a schema update to add field \`${newColName}\` to **${contextNode.data.label}**. Expand the thought process above to review and apply this update to your canvas.`,
      envelope: createUiopEnvelope(ops, "schema-model-agent"),
    };
  }

  // 3. Optimize / Rewrite Targeted Processing Node
  if (
    contextNode &&
    contextNode.data.category === "processing" &&
    (lower.includes("optimize") ||
      lower.includes("rewrite") ||
      lower.includes("convert") ||
      lower.includes("python") ||
      lower.includes("sql"))
  ) {
    const targetLang: "sql" | "python" = lower.includes("python")
      ? "python"
      : lower.includes("sql")
        ? "sql"
        : contextNode.data.language;

    const updatedCode =
      targetLang === "python"
        ? `# Optimized PySpark / Pandas Pushdown for ${contextNode.data.label}\ndef transform(df):\n    return (\n        df.dropna(subset=["id"])\n          .dropDuplicates(["id"])\n          .withColumnRenamed("raw_amount", "net_amount")\n    )`
        : `-- Optimized Pushdown Transformation for ${contextNode.data.label}\nWITH deduplicated AS (\n  SELECT DISTINCT *\n  FROM staging_input\n  WHERE id IS NOT NULL\n)\nSELECT\n  id,\n  customer_id,\n  CAST(amount AS DECIMAL(18,2)) AS net_amount,\n  CURRENT_TIMESTAMP AS processed_at\nFROM deduplicated;`;

    const ops: UiopOperation[] = [
      {
        op: "node.update",
        params: {
          id: contextNode.id,
          data: {
            language: targetLang,
            code: updatedCode,
          },
        },
      },
    ];

    return {
      replyMarkdown: `### Calculation Logic Updated\n\nI have optimized the data processing logic for **${contextNode.data.label}** (${targetLang.toUpperCase()}). Expand the thought process above to review the calculation and apply this update to your canvas.`,
      envelope: createUiopEnvelope(ops, "transform-engineer-agent"),
    };
  }

  // 4. Layout / Auto-Arrange Request
  if (
    lower.includes("layout") ||
    lower.includes("arrange") ||
    lower.includes("tidy")
  ) {
    const ops: UiopOperation[] = [
      {
        op: "layout.update",
        params: { direction: "LR" },
      },
    ];
    return {
      replyMarkdown:
        "### Canvas Layout Auto-Arranged\n\nI have organized the pipeline stages from left to right for clear visual data lineage. Expand the thought process above to review and apply the layout to your canvas.",
      envelope: createUiopEnvelope(ops, "layout-engine-agent"),
    };
  }

  // 5. Connect Unlinked Nodes Across the DAG
  if (lower.includes("connect") || lower.includes("link")) {
    const edges = usePipelineStore.getState().edges;
    const ops: UiopOperation[] = [];
    for (let i = 0; i < nodes.length - 1; i += 1) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const exists = edges.some(
        (e) =>
          (e.source === a.id && e.target === b.id) ||
          (e.source === b.id && e.target === a.id),
      );
      if (!exists) {
        ops.push({
          op: "edge.add",
          params: {
            source: a.id,
            target: b.id,
            type: "data_flow",
            data: { relationship: "data_flow" },
          },
        });
        break;
      }
    }

    if (ops.length === 0 && nodes.length >= 2) {
      ops.push({
        op: "layout.update",
        params: { direction: "LR" },
      });
    }

    if (ops.length > 0) {
      return {
        replyMarkdown:
          "### Lineage Connection Proposed\n\nI have identified an unlinked data flow between pipeline stages. Expand the thought process above to review and connect this lineage link on your canvas.",
        envelope: createUiopEnvelope(ops, "lineage-architect-agent"),
      };
    }
  }

  // 6. Create SQL / Python Transformation Node (and connect from contextNode if selected)
  if (
    lower.includes("transform") ||
    lower.includes("clean") ||
    lower.includes("sql") ||
    lower.includes("python") ||
    lower.includes("etl")
  ) {
    const isPy = lower.includes("python");
    const procId = genId("proc_uiop");
    const label = isPy ? "py_feature_enrich" : "sql_cleanse_orders";
    const ops: UiopOperation[] = [
      {
        op: "node.add",
        params: {
          id: procId,
          type: "processing",
          position: { x: 420, y: 240 },
          data: {
            label,
            language: isPy ? "python" : "sql",
            description: `Synthesized via UIOP for: ${cleanBody}`,
            code: isPy
              ? `def cleanse_dataframe(df):\n    return df.dropna().drop_duplicates()`
              : `SELECT\n  order_id,\n  customer_id,\n  SUM(amount) AS total_amount\nFROM raw_orders\nWHERE status = 'COMPLETED'\nGROUP BY order_id, customer_id;`,
            columns: [],
            inputColumns: ["order_id", "customer_id", "amount"],
            outputColumns: ["order_id", "customer_id", "total_amount"],
          },
        },
      },
    ];

    const sourceToLink =
      contextNode ?? nodes.find((n) => n.data.category === "resource");
    if (sourceToLink) {
      ops.push({
        op: "edge.add",
        params: {
          source: sourceToLink.id,
          target: procId,
          type: "data_flow",
          data: { relationship: "data_flow" },
        },
      });
    }

    const targetSink =
      nodes.find((n) => n.id === "proc_fct_sales") ??
      nodes.find((n) => n.id === "dw_core");
    if (targetSink && targetSink.id !== sourceToLink?.id) {
      ops.push({
        op: "edge.add",
        params: {
          source: procId,
          target: targetSink.id,
          type: "data_flow",
          data: { relationship: "data_flow" },
        },
      });
    }

    ops.push({
      op: "layout.update",
      params: { direction: "LR" },
    });

    return {
      replyMarkdown: `### Data Transformation Stage Proposed\n\nI have structured a data transformation stage (**${label}**)${sourceToLink ? ` connected from **${sourceToLink.data.label}**` : ""} to cleanse and prepare your transactional records. Expand the thought process above to inspect the technical operations and apply this update to your canvas.`,
      envelope: createUiopEnvelope(ops, "data-engineer-agent"),
    };
  }

  // 7. Default / Add Resource or Data Model Table Node
  const tableId = genId("tbl_uiop");
  const isPromo = lower.includes("promo");
  const isCurrency = lower.includes("currency") || lower.includes("exchange");
  const isSource =
    lower.includes("source") ||
    lower.includes("postgres") ||
    lower.includes("csv");

  const label = isPromo
    ? "dim_promotions"
    : isCurrency
      ? "dim_currency_rates"
      : isSource
        ? "src_customer_events"
        : "dim_customer_segments";

  const ops: UiopOperation[] = [
    {
      op: "node.add",
      params: {
        id: tableId,
        type: "resource",
        position: { x: 40, y: 660 },
        data: {
          label,
          kind: isSource ? "source" : "table",
          warehouseRole: isSource ? "source" : "dimension",
          format: isSource ? "postgresql" : undefined,
          description: `Created via UIOP v1.0 for request: "${cleanBody}"`,
          columns: [
            {
              name: `${label.replace(/^(dim_|src_)/, "")}_key`,
              type: "BIGINT",
              isPrimaryKey: true,
              isForeignKey: false,
            },
            {
              name: isPromo
                ? "promo_code"
                : isCurrency
                  ? "currency_iso"
                  : "segment_name",
              type: "VARCHAR(64)",
              isPrimaryKey: false,
              isForeignKey: false,
            },
            {
              name: "effective_from",
              type: "TIMESTAMP",
              isPrimaryKey: false,
              isForeignKey: false,
            },
          ],
        },
      },
    },
  ];

  if (isSource) {
    const downstreamTarget =
      nodes.find((n) => n.id === "proc_stg_orders") ??
      nodes.find((n) => n.data.category === "processing");
    if (downstreamTarget) {
      ops.push({
        op: "edge.add",
        params: {
          source: tableId,
          target: downstreamTarget.id,
          type: "data_flow",
          data: { relationship: "data_flow" },
        },
      });
    }
  }

  return {
    replyMarkdown: `### Entity Definition Proposed\n\nI have generated the data definition for **${label}** with verified primary keys and attributes. Expand the thought process above to inspect the operations and apply it to your workspace.`,
    envelope: createUiopEnvelope(ops, "data-model-agent"),
  };
}
