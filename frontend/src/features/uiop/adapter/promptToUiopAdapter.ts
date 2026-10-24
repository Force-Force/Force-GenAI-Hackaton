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

  // Extract optional leading `@node_label` context
  const tagMatch = prompt.match(/^@([^\s]+)\s+([\s\S]*)$/);
  const targetLabel = tagMatch ? tagMatch[1] : null;
  const cleanBody = tagMatch ? tagMatch[2].trim() : prompt.trim();
  const contextNode = targetLabel
    ? nodes.find(
        (n) => n.data.label.toLowerCase() === targetLabel.toLowerCase(),
      )
    : null;

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
        position: { x: 240, y: 260 },
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

  return {
    replyMarkdown: `### Entity Definition Proposed\n\nI have generated the data definition for **${label}** with verified primary keys and attributes. Expand the thought process above to inspect the operations and apply it to your workspace.`,
    envelope: createUiopEnvelope(ops, "data-model-agent"),
  };
}
