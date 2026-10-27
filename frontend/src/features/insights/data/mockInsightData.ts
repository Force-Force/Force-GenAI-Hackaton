import type { AiInsightModel } from "../types";
import type { InsightSummaryCard } from "../../../contracts/uiop";

export const INITIAL_SUMMARY_CARDS: InsightSummaryCard[] = [
  {
    id: "sum_1",
    label: "Net revenue (Q3)",
    value: "$1.15M",
    delta: "+9.1%",
    trend: "up",
    sourceTable: "fact_daily_revenue",
  },
  {
    id: "sum_2",
    label: "Gross sales (GMV)",
    value: "$1.34M",
    delta: "+11.2%",
    trend: "up",
    sourceTable: "v_bi_executive_sales",
  },
  {
    id: "sum_3",
    label: "Repeat B2B retention",
    value: "118.2%",
    delta: "+4.5%",
    trend: "up",
    sourceTable: "v_customer_retention_cohorts",
  },
  {
    id: "sum_4",
    label: "Audit integrity",
    value: "100% Reconciled",
    delta: "14,850 Orders",
    trend: "neutral",
    sourceTable: "audit_kpi_reconciliation_ledger",
  },
];

export const AI_PROPOSED_INSIGHTS: AiInsightModel[] = [
  {
    id: "insight-sales-waterfall",
    kpiId: "net-recognized-revenue",
    kpiName: "Net Recognized Revenue",
    domain: "sales",
    categoryLabel: "Sales & Revenue",
    title: "Where revenue leaks",
    summary:
      "14.2% of gross sales ($190.0K) is deducted across promotional discounts (-$92.0K), Stripe fees (-$50.0K), and refunds (-$48.0K) to reach $1.15M net revenue across 14,850 orders.",
    aiReasoning:
      "Waterfall isolates exact margin leakage points from gross storefront checkouts ($1.34M) to recognized net bank settlements ($1.15M).",
    aiConfidenceScore: 99.4,
    selectedGraphType: "waterfall-decomposition",
    availableGraphOptions: [
      {
        type: "waterfall-decomposition",
        label: "Waterfall",
        isAiRecommended: true,
        reasoning:
          "Decomposes Gross to Net deductions across promos, gateway fees, and returns.",
      },
      {
        type: "anomaly-ribbon",
        label: "Trend",
        isAiRecommended: false,
        reasoning: "Time-series revenue projection view.",
      },
    ],
    headlineMetrics: [
      { label: "Gross Volume", value: "$1.34M", delta: "+11.2%", trend: "up" },
      { label: "Net Realized", value: "$1.15M", delta: "+9.1%", trend: "up" },
      { label: "Leakage", value: "-$190.0K", delta: "-14.2%", trend: "down" },
      {
        label: "Net AOV",
        value: "$77.44",
        delta: "14,850 orders",
        trend: "up",
      },
    ],
    waterfallData: [
      {
        id: "wf-1",
        label: "Gross Billings",
        amount: 1340000,
        formatted: "$1.34M",
        type: "base",
        note: "14,850 completed storefront & B2B orders ($90.24 Gross AOV)",
      },
      {
        id: "wf-2",
        label: "Promos & Coupons",
        amount: -92000,
        formatted: "-$92.0K",
        type: "deduction",
        note: "Summer bundle promos & wholesale tier discounts",
        driftPct: "-6.9%",
      },
      {
        id: "wf-3",
        label: "Stripe Gateway Fees",
        amount: -50000,
        formatted: "-$50.0K",
        type: "deduction",
        note: "2.9% + $0.30 blended card & wallet processing fees",
        driftPct: "-3.7%",
      },
      {
        id: "wf-4",
        label: "Customer Refunds",
        amount: -48000,
        formatted: "-$48.0K",
        type: "deduction",
        note: "520 refunded orders (3.5% return rate)",
        driftPct: "-3.6%",
      },
      {
        id: "wf-5",
        label: "Net Recognized Mart",
        amount: 1150000,
        formatted: "$1.15M",
        type: "total",
        note: "Certified fact_daily_revenue total ($77.44 Net AOV)",
      },
    ],
    provenance: {
      executedSql:
        "SELECT SUM(gross_amount) AS gross_billings, SUM(discount_amount) AS promos, SUM(gateway_fee) AS fees, SUM(refund_amount) AS refunds, SUM(net_revenue) AS net_mart FROM fact_daily_revenue;",
      sourceTables: [
        "src_postgres_web_orders",
        "src_stripe_events",
        "fact_daily_revenue",
      ],
      rowCount: 14850,
      executedAt: "2026-10-27 10:08:00 UTC",
    },
    actionableInsights: [
      "Capping sitewide coupon stacking with loyalty tier discounts recovers ~$18.5K/quarter in margin.",
      "Moving repeat B2B café accounts from credit cards (2.9%) to ACH/SEPA (0.8%) saves ~$14.2K/year in Stripe fees.",
    ],
  },
  {
    id: "insight-customer-cohort",
    kpiId: "active-customer-360",
    kpiName: "Customer LTV & Retention",
    domain: "customers",
    categoryLabel: "Retention & LTV",
    title: "Customer retention by segment",
    summary:
      "Wholesale & B2B repeat accounts expand to 118% of starting revenue by Day 120, while one-time web shoppers fall to 46%.",
    aiReasoning:
      "Cohort decay highlights repeat order expansion vs churn half-life across your 4,242 active customer profiles.",
    aiConfidenceScore: 97.8,
    selectedGraphType: "cohort-decay-curve",
    availableGraphOptions: [
      {
        type: "cohort-decay-curve",
        label: "Cohorts",
        isAiRecommended: true,
        reasoning: "Decay curve across customer vintage segments.",
      },
      {
        type: "waterfall-decomposition",
        label: "Step",
        isAiRecommended: false,
        reasoning: "Segment-by-segment LTV decomposition.",
      },
    ],
    headlineMetrics: [
      { label: "B2B / VIP NRR", value: "118.2%", delta: "+4.5%", trend: "up" },
      { label: "Day 90 LTV", value: "$312", delta: "4.0x orders", trend: "up" },
      {
        label: "Day 45 Churn",
        value: "14.8%",
        delta: "Self-serve",
        trend: "down",
      },
      {
        label: "Active Customers",
        value: "4,242",
        delta: "100% Matched",
        trend: "up",
      },
    ],
    cohortData: [
      { period: "Day 0", cohortA: 100, cohortB: 100, cohortC: 100 },
      { period: "Day 15", cohortA: 97, cohortB: 88, cohortC: 84 },
      { period: "Day 30", cohortA: 96, cohortB: 78, cohortC: 72 },
      { period: "Day 45", cohortA: 98, cohortB: 64, cohortC: 61 },
      { period: "Day 60", cohortA: 104, cohortB: 59, cohortC: 54 },
      { period: "Day 90", cohortA: 112, cohortB: 56, cohortC: 49 },
      { period: "Day 120", cohortA: 118, cohortB: 54, cohortC: 46 },
    ],
    provenance: {
      executedSql:
        "SELECT vintage_month, day_30_retention, day_60_retention, day_120_retention, expansion_rate FROM v_customer_retention_cohorts;",
      sourceTables: [
        "dim_customer_360",
        "fact_daily_revenue",
        "v_customer_retention_cohorts",
      ],
      rowCount: 4242,
      executedAt: "2026-10-27 10:08:00 UTC",
    },
    actionableInsights: [
      "Customers who join the monthly subscription tier on their 2nd order generate 3.2x higher 6-month LTV ($312 vs $98).",
      "Automated Day-21 reorder reminders for first-time web buyers can recover ~$24K in quarterly repeat sales.",
    ],
  },
  {
    id: "insight-operations-flow",
    kpiId: "idempotent-charge-parity",
    kpiName: "Fulfillment Flow",
    domain: "operations",
    categoryLabel: "Operations Velocity",
    title: "Where orders wait",
    summary:
      "Orders wait longest at warehouse packing allocation: 18.4 minutes on average during afternoon batch sync.",
    aiReasoning:
      "Funnel maps stage conversion and dwell bottlenecks across all 14,850 customer orders from checkout to delivery.",
    aiConfidenceScore: 98.6,
    selectedGraphType: "state-flow-funnel",
    availableGraphOptions: [
      {
        type: "state-flow-funnel",
        label: "Flow",
        isAiRecommended: true,
        reasoning:
          "Stage conversion and dwell times across the fulfillment lifecycle.",
      },
      {
        type: "anomaly-ribbon",
        label: "Throughput",
        isAiRecommended: false,
        reasoning: "Hourly throughput and latency distribution.",
      },
    ],
    headlineMetrics: [
      {
        label: "Valid Orders",
        value: "14,850",
        delta: "100% Conserved",
        trend: "up",
      },
      {
        label: "Fulfilled",
        value: "96.5%",
        delta: "520 Refunded",
        trend: "up",
      },
      {
        label: "Peak Dwell",
        value: "18.4 min",
        delta: "Allocation",
        trend: "down",
      },
      {
        label: "DLQ Queue",
        value: "8 rows",
        delta: "Postal Fix",
        trend: "neutral",
      },
    ],
    stateFlowData: [
      {
        id: "sf-1",
        name: "Order Placed",
        count: 14850,
        ratePct: 100,
        avgDwellMinutes: 0.8,
        anomalyCount: 0,
        status: "optimal",
        notes: "14,850 valid storefront checkouts received from PostgreSQL",
      },
      {
        id: "sf-2",
        name: "Payment Verified",
        count: 14846,
        ratePct: 99.97,
        avgDwellMinutes: 1.4,
        anomalyCount: 4,
        status: "normal",
        notes:
          "350 duplicate Stripe webhook retries filtered via SHA-256; 4 delayed captures recovered",
      },
      {
        id: "sf-3",
        name: "Warehouse Allocated",
        count: 14330,
        ratePct: 96.5,
        avgDwellMinutes: 18.4,
        anomalyCount: 12,
        status: "bottleneck",
        notes:
          "520 pre-shipment cancellations/refunds excluded; 18.4m queue during 14:00 sync",
      },
      {
        id: "sf-4",
        name: "Shipped",
        count: 14322,
        ratePct: 96.44,
        avgDwellMinutes: 42.0,
        anomalyCount: 0,
        status: "normal",
        notes: "Carrier labels scanned and dispatched",
      },
      {
        id: "sf-5",
        name: "Delivered",
        count: 14320,
        ratePct: 96.43,
        avgDwellMinutes: 1840.0,
        anomalyCount: 2,
        status: "optimal",
        notes: "14,320 packages confirmed delivered (1.3 days avg transit)",
      },
    ],
    provenance: {
      executedSql:
        "SELECT from_state, to_state, count(*), avg(extract(epoch FROM latency_interval)/60) FROM audit_state_transitions GROUP BY 1, 2;",
      sourceTables: [
        "stg_clean_orders",
        "clean_stripe_events",
        "fact_daily_revenue",
      ],
      rowCount: 14850,
      executedAt: "2026-10-27 10:08:00 UTC",
    },
    actionableInsights: [
      "Switching from hourly warehouse batch sync to 15-minute micro-batches eliminates the 18.4-minute packing queue.",
      "All 350 duplicate Stripe webhook retries were safely deduplicated before reaching fulfillment.",
    ],
  },
  {
    id: "insight-sales-anomalies",
    kpiId: "gross-merchandise-volume",
    kpiName: "Daily Sales Velocity",
    domain: "anomalies",
    categoryLabel: "Outlier Detection",
    title: "Unusual sales spike",
    summary:
      "Oct 18 daily sales hit $28.4K (315 orders), $10.9K above the $17.5K 2.0σ expected upper bound.",
    aiReasoning:
      "Confidence ribbon compares daily storefront revenue against our $14.8K/day Q3 baseline (±2σ statistical bounds).",
    aiConfidenceScore: 96.9,
    selectedGraphType: "anomaly-ribbon",
    availableGraphOptions: [
      {
        type: "anomaly-ribbon",
        label: "Ribbon",
        isAiRecommended: true,
        reasoning: "Outliers vs forecast statistical boundaries.",
      },
      {
        type: "waterfall-decomposition",
        label: "Attribution",
        isAiRecommended: false,
        reasoning: "Itemized sales category attribution breakdown.",
      },
    ],
    headlineMetrics: [
      {
        label: "Outlier Peak",
        value: "$28,400",
        delta: "+91% vs Avg",
        trend: "up",
      },
      {
        label: "Upper Band",
        value: "$17,500",
        delta: "+2.0σ",
        trend: "neutral",
      },
      {
        label: "Daily Baseline",
        value: "$14,880",
        delta: "~165 orders/d",
        trend: "up",
      },
    ],
    anomalyData: [
      {
        date: "Oct 12",
        actual: 13800,
        expectedLower: 11200,
        expectedUpper: 16500,
        isAnomaly: false,
      },
      {
        date: "Oct 13",
        actual: 14400,
        expectedLower: 11500,
        expectedUpper: 16800,
        isAnomaly: false,
      },
      {
        date: "Oct 14",
        actual: 14100,
        expectedLower: 11500,
        expectedUpper: 16900,
        isAnomaly: false,
      },
      {
        date: "Oct 15",
        actual: 15200,
        expectedLower: 11800,
        expectedUpper: 17100,
        isAnomaly: false,
      },
      {
        date: "Oct 16",
        actual: 15900,
        expectedLower: 12000,
        expectedUpper: 17300,
        isAnomaly: false,
      },
      {
        date: "Oct 17",
        actual: 16400,
        expectedLower: 12200,
        expectedUpper: 17400,
        isAnomaly: false,
      },
      {
        date: "Oct 18",
        actual: 28400,
        expectedLower: 12300,
        expectedUpper: 17500,
        isAnomaly: true,
        anomalyDelta: "+$10,900 over limit",
        anomalyCause: "Viral creator review & weekend flash bundle",
      },
      {
        date: "Oct 19",
        actual: 19200,
        expectedLower: 12400,
        expectedUpper: 17600,
        isAnomaly: false,
      },
      {
        date: "Oct 20",
        actual: 15600,
        expectedLower: 12000,
        expectedUpper: 17200,
        isAnomaly: false,
      },
      {
        date: "Oct 21",
        actual: 14900,
        expectedLower: 11800,
        expectedUpper: 17000,
        isAnomaly: false,
      },
      {
        date: "Oct 22",
        actual: 15100,
        expectedLower: 11800,
        expectedUpper: 17000,
        isAnomaly: false,
      },
    ],
    provenance: {
      executedSql:
        "SELECT date_trunc('day', order_time) AS dt, sum(gross_amount) FROM stg_clean_orders WHERE order_time >= '2026-10-12' GROUP BY 1 ORDER BY 1;",
      sourceTables: ["stg_clean_orders", "fact_daily_revenue"],
      rowCount: 11,
      executedAt: "2026-10-27 10:08:00 UTC",
    },
    actionableInsights: [
      "A creator product review drove 315 orders on Oct 18 (nearly double the 165/day average).",
      "Two top-selling SKUs ran out of stock for 6 hours; adding automated low-stock alerts would capture ~$4.2K in missed orders.",
    ],
  },
  {
    id: "insight-net-revenue-bridge",
    kpiId: "net-aov",
    kpiName: "Product Category Performance",
    domain: "sales",
    categoryLabel: "Catalog Attribution",
    title: "Net revenue by product category",
    summary:
      "Signature Essentials ($482.0K) and Starter Bundles ($391.0K) drive 75.9% of our $1.15M net revenue, with Subscription Refills delivering the highest gross margin (68%).",
    aiReasoning:
      "Selected a Categorical Bar chart to compare net revenue contribution across product lines in dim_product.",
    aiConfidenceScore: 99.1,
    selectedGraphType: "bar",
    availableGraphOptions: [
      {
        type: "bar",
        label: "Category Bar",
        isAiRecommended: true,
        reasoning:
          "Compares net revenue contribution across product catalog categories.",
      },
      {
        type: "pie",
        label: "Share Mix",
        isAiRecommended: false,
        reasoning: "Shows relative share of total net revenue.",
      },
    ],
    headlineMetrics: [
      {
        label: "Signature Line",
        value: "$482.0K",
        delta: "41.9% Share",
        trend: "up",
      },
      {
        label: "Starter Bundles",
        value: "$391.0K",
        delta: "34.0% Share",
        trend: "up",
      },
      {
        label: "Subscriptions",
        value: "$184.0K",
        delta: "68% Margin",
        trend: "up",
      },
      {
        label: "Accessories",
        value: "$93.0K",
        delta: "8.1% Share",
        trend: "neutral",
      },
    ],
    barData: [
      {
        category: "Signature Essentials",
        value: 482000,
        target: 450000,
        formatted: "$482.0K",
      },
      {
        category: "Starter Bundles",
        value: 391000,
        target: 360000,
        formatted: "$391.0K",
      },
      {
        category: "Monthly Refills",
        value: 184000,
        target: 165000,
        formatted: "$184.0K",
      },
      {
        category: "Accessories & Gifts",
        value: 93000,
        target: 95000,
        formatted: "$93.0K",
      },
    ],
    provenance: {
      executedSql:
        "SELECT p.category, SUM(f.net_revenue) AS net_revenue, COUNT(f.revenue_key) AS orders FROM fact_daily_revenue f JOIN dim_product p ON f.product_key = p.product_key GROUP BY 1 ORDER BY 2 DESC;",
      sourceTables: ["fact_daily_revenue", "dim_product"],
      rowCount: 14850,
      executedAt: "2026-10-27 10:08:00 UTC",
    },
    actionableInsights: [
      "All 4 product categories sum to exactly $1,150,000 ($1.15M) in reconciled net revenue.",
      "Bundling Accessories with Starter Kits at checkout lifts average order value from $77.44 to $94.50.",
    ],
  },
  {
    id: "insight-payment-rail-mix",
    kpiId: "kpi-payment-share",
    kpiName: "Payment Gateway Mix",
    domain: "sales",
    categoryLabel: "Settlement Attribution",
    title: "Revenue share by payment settlement rail",
    summary:
      "Stripe Credit Card captures 64.2% ($738.3K) of our $1.15M net volume, while ACH / SEPA Direct Debit (21.8%, $250.7K) carries the lowest processing fee (0.80%).",
    aiReasoning:
      "Selected a Pie/Donut distribution graph because payment settlement rails represent mutually exclusive shares of our $1.15M recognized net revenue.",
    aiConfidenceScore: 98.7,
    selectedGraphType: "pie",
    availableGraphOptions: [
      {
        type: "pie",
        label: "Share Mix",
        isAiRecommended: true,
        reasoning: "Highlights part-to-whole settlement volume distribution.",
      },
      {
        type: "bar",
        label: "Volume Bar",
        isAiRecommended: false,
        reasoning: "Absolute dollar comparison across payment providers.",
      },
    ],
    headlineMetrics: [
      {
        label: "Stripe Card",
        value: "$738.3K",
        delta: "64.2% Share",
        trend: "up",
      },
      {
        label: "ACH / SEPA",
        value: "$250.7K",
        delta: "21.8% Share",
        trend: "up",
      },
      {
        label: "Apple Pay",
        value: "$109.3K",
        delta: "9.5% Share",
        trend: "up",
      },
      {
        label: "B2B Invoice",
        value: "$51.8K",
        delta: "4.5% Share",
        trend: "neutral",
      },
    ],
    pieData: [
      {
        label: "Stripe Credit Card",
        value: 738300,
        sharePct: 64.2,
        formatted: "$738.3K",
      },
      {
        label: "ACH / SEPA Debit",
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
        label: "Wholesale Invoice",
        value: 51750,
        sharePct: 4.5,
        formatted: "$51.8K",
      },
    ],
    provenance: {
      executedSql:
        "SELECT pm.method_name, SUM(f.net_revenue) AS net_vol, ROUND(SUM(f.net_revenue) * 100.0 / SUM(SUM(f.net_revenue)) OVER (), 1) AS share_pct FROM fact_daily_revenue f JOIN dim_payment_method pm ON f.payment_method_sk = pm.payment_method_sk GROUP BY 1 ORDER BY 2 DESC;",
      sourceTables: ["fact_daily_revenue", "dim_payment_method"],
      rowCount: 14850,
      executedAt: "2026-10-27 10:08:00 UTC",
    },
    actionableInsights: [
      "Moving 20% of B2B wholesale card orders to ACH Direct Debit saves ~$5.8K/year in gateway processing fees.",
      "Apple Pay mobile checkout conversion outpaced manual card entry by +22.4% on mobile traffic.",
    ],
  },
];
