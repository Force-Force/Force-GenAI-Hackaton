# AI-Driven Insights & Chart Selection — UIOP v1.0 & Backend Specification

> **Purpose:** Defines how the Backend Analytics Agent queries real pipeline tables, chooses the optimal visualization type, and emits declarative **UIOP v1.0** operations to populate the AuraBI Insights page (`/audit`).

---

## 1. Core Mechanism: How the AI Generates Real Insights

The Insights page is **never** populated with random or static data. Every insight card and KPI metric is produced by a **3-step Backend-to-UIOP pipeline**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. SQL EXECUTION (Backend Engine / DuckDB / Postgres / Snowflake)       │
│    Agent inspects built warehouse tables (`fact_*`, `dim_*`) and runs   │
│    real aggregation queries to compute KPIs, series, and anomalies.     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. CHART SELECTION (Analytics Agent Structured Output)                  │
│    Based on the query shape (time-series, part-to-whole, bridge,        │
│    funnel, or cohort matrix), the agent picks a registered `chartType`  │
│    and maps the SQL result rows into that chart's strict schema.        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. UIOP v1.0 DISPATCH (`insight.set_summary`, `insight.add`, ...)       │
│    Backend emits a UIOP envelope. The frontend validates the chart      │
│    payload with Zod and renders the corresponding visualization.        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. UIOP v1.0 Operations for Insights

Extend `uiopOperationSchema` in [`src/contracts/uiop.ts`](../../src/contracts/uiop.ts) with 5 insight operations:

| Operation (`op`) | Purpose |
| :--- | :--- |
| `"insight.set_summary"` | Sets the top-level KPI summary strip cards on the Insights page (e.g., Net Revenue, Retention, Orders, Outliers). |
| `"insight.add"` | Appends or upserts an AI-selected chart card with its validated dataset, headline metrics, and SQL provenance. |
| `"insight.update"` | Updates an existing insight card (e.g., switching `chartType`, updating data after a filter/prompt, or adding takeaways). |
| `"insight.remove"` | Removes an insight card by `id`. |
| `"insight.clear"` | Clears all insight cards (or cards matching a `domain`). |

---

## 3. Approved Chart Registry & Discriminated `chart` Payloads

The AI agent **must** choose one of the **8 registered chart types** below and supply the matching `data` array derived from its SQL query:

| `chart.type` | When the AI Agent Should Select It | Required `chart.data` Row Schema |
| :--- | :--- | :--- |
| `"bar"` | Comparing categorical dimensions (e.g., Revenue by Region, Top 10 SKUs). | `{ category: string, value: number, formatted?: string, secondaryValue?: number, target?: number }[]` |
| `"line"` | Continuous trends over time (e.g., Daily Active Users, Monthly GMV). | `{ x: string, y: number, series?: string, formatted?: string }[]` |
| `"pie"` | Part-to-whole composition (≤ 7 slices, e.g., Payment Method Share, Tier Split). | `{ label: string, value: number, sharePct: number, formatted?: string }[]` |
| `"waterfall-decomposition"` | Additive/subtractive bridges (e.g., Gross GMV → Discounts → Refunds → Net Revenue). | `{ id: string, label: string, amount: number, formatted: string, type: "base" \| "deduction" \| "addition" \| "subtotal" \| "total", note?: string, driftPct?: string }[]` |
| `"cohort-decay-curve"` | Retention or survival across time horizons (`Day 0`, `Day 30`, `Day 60`, `Day 90`). | `{ period: string, cohortA: number, cohortB: number, cohortC?: number }[]` |
| `"state-flow-funnel"` | Sequential conversion / pipeline stage throughput & dwell bottlenecks. | `{ id: string, name: string, count: number, ratePct: number, avgDwellMinutes: number, anomalyCount: number, status: "normal" \| "bottleneck" \| "optimal", notes: string }[]` |
| `"anomaly-ribbon"` | Time-series metric against an expected confidence band (`[expectedLower, expectedUpper]`). | `{ date: string, actual: number, expectedUpper: number, expectedLower: number, isAnomaly: boolean, anomalyDelta?: string, anomalyCause?: string }[]` |
| `"kpi-table"` | Multi-column tabular breakdown or ledger reconciliation when a table is clearer than a chart. | `{ columns: string[], rows: Record<string, string \| number>[] }` |

---

## 4. Exact UIOP Operation Payloads

### 4.1 `insight.set_summary`
```json
{
  "op": "insight.set_summary",
  "params": {
    "cards": [
      {
        "id": "sum_net_rev",
        "label": "Net revenue",
        "value": "$1.15M",
        "delta": "+9.1% QoQ",
        "trend": "up",
        "sourceTable": "fact_daily_revenue"
      },
      {
        "id": "sum_payment_share",
        "label": "Top payment rail",
        "value": "Stripe Card (64%)",
        "delta": "0.00% variance",
        "trend": "neutral",
        "sourceTable": "transform_orders_clean"
      }
    ]
  }
}
```

### 4.2 `insight.add` (With AI Chart Selection + SQL Provenance)
```json
{
  "op": "insight.add",
  "params": {
    "id": "ins_payment_rail_pie",
    "domain": "sales",
    "categoryLabel": "Payment Rail Mix",
    "title": "Settled Volume by Payment Method",
    "summary": "Credit cards account for 64.2% ($738K) of settled net volume, followed by SEPA Direct Debit (21.8%).",
    "aiReasoning": "Selected a Pie/Donut chart because the query groups total settled revenue into 4 mutually exclusive payment method shares summing to 100%.",
    "aiConfidenceScore": 99.1,
    "provenance": {
      "sourceTables": ["fact_daily_revenue", "dim_payment_method"],
      "executedSql": "SELECT pm.method_name AS label, SUM(f.net_revenue) AS value, ROUND(100.0 * SUM(f.net_revenue) / SUM(SUM(f.net_revenue)) OVER (), 1) AS share_pct FROM fact_daily_revenue f JOIN dim_payment_method pm ON f.payment_method_sk = pm.payment_method_sk GROUP BY 1 ORDER BY 2 DESC;",
      "rowCount": 4,
      "executedAt": "2026-10-25T16:45:00Z"
    },
    "chart": {
      "type": "pie",
      "data": [
        { "label": "Stripe Credit Card", "value": 738300, "sharePct": 64.2, "formatted": "$738.3K" },
        { "label": "SEPA Direct Debit", "value": 250700, "sharePct": 21.8, "formatted": "$250.7K" },
        { "label": "Apple Pay / Wallet", "value": 109250, "sharePct": 9.5, "formatted": "$109.3K" },
        { "label": "Wire Transfer", "value": 51750, "sharePct": 4.5, "formatted": "$51.8K" }
      ]
    },
    "headlineMetrics": [
      { "label": "Primary Rail", "value": "64.2%", "delta": "+2.1%", "trend": "up" },
      { "label": "Total Settled", "value": "$1.15M", "delta": "100% reconciled", "trend": "neutral" }
    ],
    "actionableInsights": [
      "Route high-value B2B invoices (>$5K) to SEPA Direct Debit to reduce card processing fees by ~1.4%."
    ]
  }
}
```

### 4.3 `insight.update` & `insight.remove`
```json
{
  "op": "insight.update",
  "params": {
    "id": "ins_payment_rail_pie",
    "chart": {
      "type": "bar",
      "data": [
        { "category": "Stripe Credit Card", "value": 738300, "formatted": "$738.3K" },
        { "category": "SEPA Direct Debit", "value": 250700, "formatted": "$250.7K" },
        { "category": "Apple Pay / Wallet", "value": 109250, "formatted": "$109.3K" },
        { "category": "Wire Transfer", "value": 51750, "formatted": "$51.8K" }
      ]
    }
  }
}
```

---

## 5. Required Backend Endpoints for AI-Driven Insights

### 5.1 `POST /pipelines/{pipeline_id}/insights/generate`
Triggers the Backend Analytics Agent to:
1. Introspect the materialized tables and columns in the pipeline (`fact_*`, `dim_*`, `transform_*`).
2. Generate and execute SQL analytical queries against the actual dataset.
3. Choose the best chart type (`pie`, `bar`, `line`, `waterfall-decomposition`, `cohort-decay-curve`, `state-flow-funnel`, `anomaly-ribbon`, `kpi-table`) for each finding.
4. Return a `UIOP v1.0` envelope containing `insight.set_summary` and `insight.add` operations.

- **Request:**
```json
{
  "prompt": "Show me revenue breakdown by payment rail and monthly customer retention.",
  "domains": ["sales", "customers", "operations", "anomalies"]
}
```
- **Response (`200 OK`):**
```json
{
  "reply": "I queried `fact_daily_revenue` and `dim_customer_360` and generated 2 visualizations.",
  "uiop": {
    "protocol": "uiop",
    "version": "1.0",
    "messageId": "msg_ins_gen_01",
    "workspaceId": "workspace_01",
    "baseRevision": 5,
    "source": { "agentId": "insights-agent", "executionId": "exec_ins_01" },
    "operations": [
      { "op": "insight.set_summary", "params": { "cards": [ ... ] } },
      { "op": "insight.add", "params": { ... } }
    ]
  }
}
```

### 5.2 `GET /pipelines/{pipeline_id}/insights`
Returns the current persisted state of `summaryCards` and `insights` for the pipeline so refreshing `/audit` renders immediately without re-running LLM queries.

---

## 6. Backend Agent Decision Matrix (How the LLM Picks the Chart)

Include this rule table in the Backend Analytics Agent's system prompt:
- **1 categorical column + 1 metric summing to 100% (≤ 7 rows):** Emit `chart.type = "pie"`.
- **1 categorical column + 1–2 metrics (> 7 rows or non-additive):** Emit `chart.type = "bar"`.
- **1 date/time column + 1 metric (continuous trend):** Emit `chart.type = "line"`.
- **1 date/time column + actual metric + upper/lower confidence bounds:** Emit `chart.type = "anomaly-ribbon"`.
- **Gross-to-net financial bridge with positive/negative adjustments:** Emit `chart.type = "waterfall-decomposition"`.
- **Retention % across Day 0 / 30 / 60 / 90 cohorts:** Emit `chart.type = "cohort-decay-curve"`.
- **Sequential pipeline/order stages with conversion % and dwell time:** Emit `chart.type = "state-flow-funnel"`.

