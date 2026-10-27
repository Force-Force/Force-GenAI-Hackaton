import type {
  Column,
  DataSource,
  PipelineEdge,
  PipelineGraph,
  PipelineNode,
} from '../../../types/pipeline';

/**
 * Default canvas state. The ETL pipeline flows left-to-right:
 *   sources (Postgres, Stripe, CRM) -> transformations -> Data Warehouse (container) -> Data Mart.
 *
 * Warehouse + imported-database tables live INSIDE their container node's
 * `children` graph (Section 8); they are never standalone canvas nodes.
 */

const factRevenueColumns: Column[] = [
  { name: 'revenue_key', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false, description: 'Surrogate primary key generated from natural order and charge IDs.' },
  { name: 'customer_key', type: 'BIGINT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'dim_customer_360', fkRefColumn: 'customer_key', description: 'Surrogate FK to SCD-2 customer dimension.' },
  { name: 'product_key', type: 'BIGINT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'dim_product', fkRefColumn: 'product_key', description: 'Surrogate FK to catalog product dimension.' },
  { name: 'date_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'dim_date', fkRefColumn: 'date_key', description: 'Surrogate FK to calendar date dimension (YYYYMMDD).' },
  { name: 'payment_method_sk', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'dim_payment_method', fkRefColumn: 'payment_method_sk', description: 'Surrogate FK to payment gateway provider dimension.' },
  { name: 'gross_amount', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false, description: 'Gross merchandise volume before deductions.' },
  { name: 'gateway_fee', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, description: 'Stripe interchange processing fee.' },
  { name: 'discount_amount', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, description: 'Coupon codes and promotional discounts.' },
  { name: 'refund_amount', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, description: 'Total customer refunds and chargebacks settled.' },
  { name: 'net_revenue', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false, description: 'Recognized net revenue after fees, discounts, and refunds.' },
];

/** Tables held inside the Data Warehouse container node. */
const warehouseChildren: PipelineGraph = {
  nodes: [
    {
      id: 'fact_daily_revenue',
      type: 'resource',
      position: { x: 380, y: 180 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'fact_daily_revenue',
        description: 'Central transactional fact table with reconciled net revenue, fees, and GMV.',
        warehouseRole: 'fact',
        columns: factRevenueColumns,
      },
    },
    {
      id: 'dim_customer_360',
      type: 'resource',
      position: { x: 40, y: 40 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'dim_customer_360',
        description: 'Conformed customer dimension maintaining point-in-time SCD Type-2 histories.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'customer_key', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false },
          { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
          { name: 'email', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
          { name: 'full_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
          { name: 'tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'country', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'valid_from', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
          { name: 'valid_to', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
          { name: 'is_current', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'dim_product',
      type: 'resource',
      position: { x: 40, y: 340 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'dim_product',
        description: 'Catalog products, pricing tiers, and department hierarchies.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'product_key', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false },
          { name: 'sku_code', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'product_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
          { name: 'category', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'unit_cost', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'unit_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'dim_date',
      type: 'resource',
      position: { x: 720, y: 40 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'dim_date',
        description: 'Enterprise calendar dimension with fiscal quarters and trading periods.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'calendar_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false },
          { name: 'year', type: 'INT', isPrimaryKey: false, isForeignKey: false },
          { name: 'quarter', type: 'INT', isPrimaryKey: false, isForeignKey: false },
          { name: 'month', type: 'INT', isPrimaryKey: false, isForeignKey: false },
          { name: 'is_weekend', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'dim_payment_method',
      type: 'resource',
      position: { x: 720, y: 340 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'dim_payment_method',
        description: 'Payment gateway providers, settlement rails, and interchange fee tiers.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'payment_method_sk', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'method_name', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'provider', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'fee_basis_points', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'dlq_quarantine_records',
      type: 'resource',
      position: { x: 380, y: 420 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'dlq_quarantine_records',
        description: 'Dead-Letter Queue isolating 8 incomplete international CRM postal codes (0.19%) for ops remediation.',
        warehouseRole: 'generated',
        columns: [
          { name: 'quarantine_id', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false },
          { name: 'source_table', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'record_key', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
          { name: 'failure_reason', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
          { name: 'quarantined_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
  ],
  edges: [
    { id: 'e_fct_cust', source: 'fact_daily_revenue', target: 'dim_customer_360', data: { relationship: 'foreign_key', fromColumn: 'customer_key', toColumn: 'customer_key' } },
    { id: 'e_fct_prod', source: 'fact_daily_revenue', target: 'dim_product', data: { relationship: 'foreign_key', fromColumn: 'product_key', toColumn: 'product_key' } },
    { id: 'e_fct_date', source: 'fact_daily_revenue', target: 'dim_date', data: { relationship: 'foreign_key', fromColumn: 'date_key', toColumn: 'date_key' } },
    { id: 'e_fct_pm', source: 'fact_daily_revenue', target: 'dim_payment_method', data: { relationship: 'foreign_key', fromColumn: 'payment_method_sk', toColumn: 'payment_method_sk' } },
  ],
};

/** Tables held inside the imported CRM database container node. */
const crmDatabaseChildren: PipelineGraph = {
  nodes: [
    {
      id: 'crm_accounts',
      type: 'resource',
      position: { x: 40, y: 40 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'accounts',
        description: 'B2B wholesale & retail customer accounts, loyalty tiers, and payment terms (4,250 accounts).',
        columns: [
          { name: 'account_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'company_name', type: 'VARCHAR(200)', isPrimaryKey: false, isForeignKey: false },
          { name: 'tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'contract_value', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'billing_country', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'postal_code', type: 'VARCHAR(32)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'crm_contacts',
      type: 'resource',
      position: { x: 40, y: 240 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'contacts',
        description: 'CRM customer contact profiles with PII fields governed by SHA-256 Guardian masking.',
        columns: [
          { name: 'contact_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'account_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'accounts', fkRefColumn: 'account_id' },
          { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
          { name: 'email_address', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
          { name: 'billing_phone', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'full_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
  ],
  edges: [
    { id: 'e_crm_fk', source: 'crm_contacts', target: 'crm_accounts', data: { relationship: 'foreign_key', fromColumn: 'account_id', toColumn: 'account_id' } },
  ],
};

const datamartChildren: PipelineGraph = {
  nodes: [
    {
      id: 'mart_src_fact_revenue',
      type: 'resource',
      position: { x: 60, y: 140 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'fact_daily_revenue',
        description: 'Gold Kimball fact table ($1.34M GMV → $1.15M Net Revenue across 14,850 Q3 orders).',
        warehouseRole: 'fact',
        columns: factRevenueColumns,
      },
    },
    {
      id: 'v_bi_executive_sales',
      type: 'resource',
      position: { x: 420, y: 40 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'v_bi_executive_sales',
        description: 'Virtual Zetaris view providing sub-second Gross-to-Net waterfall ($1.34M → $1.15M) and category breakdowns.',
        warehouseRole: 'generated',
        columns: [
          { name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'product_category', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'gross_volume', type: 'DECIMAL(18,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'discount_volume', type: 'DECIMAL(18,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'gateway_fee_volume', type: 'DECIMAL(18,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'refund_volume', type: 'DECIMAL(18,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'net_volume', type: 'DECIMAL(18,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'transaction_count', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'v_customer_retention_cohorts',
      type: 'resource',
      position: { x: 420, y: 200 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'v_customer_retention_cohorts',
        description: 'Virtual Zetaris view modeling B2B wholesale repeat retention (118.2% NRR) and Day-90 LTV ($312).',
        warehouseRole: 'generated',
        columns: [
          { name: 'cohort_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
          { name: 'vintage_month', type: 'VARCHAR(7)', isPrimaryKey: false, isForeignKey: false },
          { name: 'day_30_retention', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'day_60_retention', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'day_90_ltv', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'net_dollar_retention', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'audit_kpi_reconciliation_ledger',
      type: 'resource',
      position: { x: 420, y: 360 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'audit_kpi_reconciliation_ledger',
        description: 'Immutable Independent Audit ledger certifying 0.00% variance across 14,850 orders and $1,150,000.00 net revenue.',
        warehouseRole: 'generated',
        columns: [
          { name: 'audit_run_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
          { name: 'metric_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'source_ledger_value', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'warehouse_mart_value', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'variance_pct', type: 'DECIMAL(6,4)', isPrimaryKey: false, isForeignKey: false },
          { name: 'status', type: 'VARCHAR(32)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
  ],
  edges: [
    { id: 'e_mart_exec', source: 'mart_src_fact_revenue', target: 'v_bi_executive_sales', data: { relationship: 'data_flow', fromColumn: 'net_revenue', toColumn: 'net_volume' } },
    { id: 'e_mart_cohort', source: 'mart_src_fact_revenue', target: 'v_customer_retention_cohorts', data: { relationship: 'data_flow', fromColumn: 'customer_key', toColumn: 'cohort_id' } },
    { id: 'e_mart_audit', source: 'mart_src_fact_revenue', target: 'audit_kpi_reconciliation_ledger', data: { relationship: 'transform', fromColumn: 'net_revenue', toColumn: 'warehouse_mart_value' } },
  ],
};

const nodes: PipelineNode[] = [
  // --- Stage 1: Operational Sources (Bronze) ---
  {
    id: 'src_postgres_web_orders',
    type: 'resource',
    position: { x: 40, y: 60 },
    data: {
      category: 'resource',
      kind: 'source',
      label: 'src_postgres_web_orders',
      description: 'PostgreSQL storefront & B2B order checkouts (14,850 completed Q3 orders · $1,340,000.00 Gross GMV · $90.24 Gross AOV).',
      warehouseRole: 'source',
      format: 'postgresql',
      columns: [
        { name: 'order_id', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
        { name: 'product_sku', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'unit_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'gross_amount', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'order_time', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        { name: 'status', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  },
  {
    id: 'src_stripe_events',
    type: 'resource',
    position: { x: 40, y: 260 },
    data: {
      category: 'resource',
      kind: 'source',
      label: 'src_stripe_events',
      description: 'Stripe webhook stream (15,200 raw events including 350 duplicate network retries, -$50.0K gateway fees, -$48.0K refunds).',
      warehouseRole: 'source',
      format: 'stripe',
      columns: [
        { name: 'charge_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
        { name: 'order_id', type: 'BIGINT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'src_postgres_web_orders', fkRefColumn: 'order_id' },
        { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
        { name: 'amount_cents', type: 'BIGINT', isPrimaryKey: false, isForeignKey: false },
        { name: 'fee_cents', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'refund_cents', type: 'BIGINT', isPrimaryKey: false, isForeignKey: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        { name: 'idempotency_key', type: 'VARCHAR(128)', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  },
  {
    id: 'db_crm',
    type: 'datamart',
    position: { x: 40, y: 460 },
    data: {
      category: 'datamart',
      containerKind: 'database',
      label: 'PostgreSQL CRM Database',
      description: 'Operational CRM database (4,250 customer profiles across accounts & contacts; 4,242 active + 8 incomplete postal codes).',
      expanded: false,
      children: crmDatabaseChildren,
      metadata: { engine: 'postgresql' },
    },
  },
  // --- Stage 2: Silver Cleansing, Idempotency & PII Governance ---
  {
    id: 'proc_stg_orders',
    type: 'processing',
    position: { x: 360, y: 60 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'stg_clean_orders',
      description: 'Validates 14,850 completed Q3 orders ($1.34M GMV), normalizes UTC timestamps, and reconciles -$92.0K promotional discounts.',
      code: `SELECT
  order_id,
  customer_id,
  product_sku,
  quantity,
  unit_price,
  (quantity * unit_price) AS gross_amount,
  COALESCE(discount_amount, 0.00) AS discount_amount,
  order_time,
  status
FROM src_postgres_web_orders
WHERE status IN ('completed', 'settled');`,
      inputColumns: ['order_id', 'customer_id', 'product_sku', 'quantity', 'unit_price', 'discount_amount', 'order_time', 'status'],
      outputColumns: ['order_id', 'customer_id', 'product_sku', 'quantity', 'unit_price', 'gross_amount', 'discount_amount', 'order_time'],
    },
  },
  {
    id: 'proc_clean_stripe',
    type: 'processing',
    position: { x: 360, y: 260 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'clean_stripe_events',
      description: 'SHA-256 idempotency deduplication filtering 350 duplicate webhook retries (15,200 → 14,850 unique settled charges).',
      code: `SELECT DISTINCT ON (idempotency_key)
  charge_id,
  order_id,
  customer_id,
  ROUND(amount_cents / 100.0, 2) AS gross_charge_usd,
  ROUND(fee_cents / 100.0, 2) AS gateway_fee_usd,
  ROUND(COALESCE(refund_cents, 0) / 100.0, 2) AS refund_amount_usd,
  created_at AS settled_at
FROM src_stripe_events
WHERE idempotency_key IS NOT NULL
ORDER BY idempotency_key, created_at DESC;`,
      inputColumns: ['charge_id', 'order_id', 'customer_id', 'amount_cents', 'fee_cents', 'refund_cents', 'idempotency_key', 'created_at'],
      outputColumns: ['charge_id', 'order_id', 'customer_id', 'gross_charge_usd', 'gateway_fee_usd', 'refund_amount_usd', 'settled_at'],
    },
  },
  {
    id: 'proc_py_features',
    type: 'processing',
    position: { x: 360, y: 460 },
    data: {
      category: 'processing',
      language: 'python',
      engine: 'pandas',
      label: 'enrich_customer_scd',
      description: 'Masks PII (email_address, billing_phone via SHA-256), builds SCD-2 loyalty tiers (4,242 active), and routes 8 invalid postal codes to DLQ.',
      code: `import hashlib
import pandas as pd

def transform(contacts: pd.DataFrame, accounts: pd.DataFrame) -> pd.DataFrame:
    merged = contacts.merge(accounts, on="account_id", how="left")
    # Quarantine 8 incomplete international postal codes to DLQ
    valid = merged[merged["postal_code"].notna()].copy()
    valid["email"] = valid["email_address"].apply(lambda x: hashlib.sha256(x.encode()).hexdigest()[:16])
    valid["tier"] = valid["tier"].fillna("Standard")
    return valid[["customer_id", "email", "full_name", "tier", "billing_country"]]`,
      inputColumns: ['contact_id', 'account_id', 'customer_id', 'email_address', 'billing_phone', 'postal_code'],
      outputColumns: ['customer_id', 'email', 'full_name', 'tier', 'billing_country'],
    },
  },
  // --- Stage 3: Gold Star-Schema Reconciliation & Independent Audit Gate ---
  {
    id: 'proc_fct_sales',
    type: 'processing',
    position: { x: 680, y: 160 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'build_fact_daily_revenue',
      description: 'Reconciles $1.34M Gross GMV minus $92K promos, $50K Stripe fees, and $48K refunds into $1.15M Net Revenue (14,850 orders).',
      code: `SELECT
  GENERATE_SURROGATE_KEY([o.order_id, p.charge_id]) AS revenue_key,
  c.customer_key,
  pr.product_key,
  REPLACE(CAST(DATE(o.order_time) AS TEXT), '-', '')::INT AS date_key,
  pm.payment_method_sk,
  o.gross_amount,
  o.discount_amount,
  COALESCE(p.gateway_fee_usd, 0.00) AS gateway_fee,
  COALESCE(p.refund_amount_usd, 0.00) AS refund_amount,
  (o.gross_amount - o.discount_amount - COALESCE(p.gateway_fee_usd, 0.00) - COALESCE(p.refund_amount_usd, 0.00)) AS net_revenue
FROM stg_clean_orders o
INNER JOIN clean_stripe_events p ON p.order_id = o.order_id
LEFT JOIN dim_customer_360 c ON c.customer_id = o.customer_id AND c.is_current = TRUE
LEFT JOIN dim_product pr ON pr.sku_code = o.product_sku
LEFT JOIN dim_payment_method pm ON pm.provider = 'Stripe';`,
      inputColumns: ['order_id', 'customer_id', 'product_sku', 'gross_amount', 'discount_amount', 'charge_id', 'gateway_fee_usd', 'refund_amount_usd'],
      outputColumns: ['revenue_key', 'customer_key', 'product_key', 'date_key', 'payment_method_sk', 'gross_amount', 'discount_amount', 'gateway_fee', 'refund_amount', 'net_revenue'],
    },
  },
  {
    id: 'proc_audit_gate',
    type: 'processing',
    position: { x: 680, y: 380 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'verify_row_and_dollar_audit',
      description: 'Independent Audit Agent gate verifying 100% row conservation (14,850 orders; 4,242 + 8 DLQ profiles) and $0.00 net revenue leakage.',
      code: `SELECT
  COUNT(*) AS verified_orders,
  SUM(gross_amount) AS verified_gmv,
  SUM(net_revenue) AS verified_net_revenue,
  ABS(SUM(net_revenue) - 1150000.00) AS dollar_variance
FROM build_fact_daily_revenue
HAVING COUNT(*) = 14850 AND ABS(SUM(net_revenue) - 1150000.00) = 0.00;`,
      inputColumns: ['revenue_key', 'gross_amount', 'discount_amount', 'gateway_fee', 'refund_amount', 'net_revenue'],
      outputColumns: ['verified_orders', 'verified_gmv', 'verified_net_revenue', 'dollar_variance'],
    },
  },
  // --- Stage 4: Data Warehouse (expandable container) ---
  {
    id: 'dw_core',
    type: 'datamart',
    position: { x: 1010, y: 200 },
    data: {
      category: 'datamart',
      containerKind: 'warehouse',
      label: 'Sales & Revenue Lakehouse',
      description: 'Kimball Star-Schema: fact_daily_revenue ($1.15M Net) joined to conformed customer, product, date, payment, and DLQ tables.',
      expanded: false,
      children: warehouseChildren,
      metadata: { schema: 'analytics' },
    },
  },
  // --- Stage 5: Data Mart (drill-in container) ---
  {
    id: 'mart_sales_analytics',
    type: 'datamart',
    position: { x: 1360, y: 200 },
    data: {
      category: 'datamart',
      containerKind: 'datamart',
      label: 'Executive BI Mart',
      description: 'Federated Zetaris analytical views powering the Q3 Gross-to-Net waterfall ($1.34M → $1.15M), B2B cohorts (118.2% NRR), and audit ledger.',
      children: datamartChildren,
    },
  },
];

const edges: PipelineEdge[] = [
  {
    id: 'e_src_orders_stg',
    source: 'src_postgres_web_orders',
    target: 'proc_stg_orders',
    data: {
      relationship: 'data_flow',
      fromColumn: 'order_id',
      toColumn: 'order_id',
      metadata: { mappingType: 'direct_stream', sourceFormat: 'postgresql' },
    },
  },
  {
    id: 'e_src_stripe_clean',
    source: 'src_stripe_events',
    target: 'proc_clean_stripe',
    data: {
      relationship: 'data_flow',
      fromColumn: 'charge_id',
      toColumn: 'charge_id',
      metadata: { mappingType: 'sha256_idempotent', sourceFormat: 'stripe' },
    },
  },
  {
    id: 'e_db_crm_feat',
    source: 'db_crm',
    target: 'proc_py_features',
    data: {
      relationship: 'foreign_key',
      fromColumn: 'account_id',
      toColumn: 'account_id',
      metadata: { fkRefTable: 'crm_accounts', mappingType: 'scd_type_2' },
    },
  },
  {
    id: 'e_stg_orders_fct',
    source: 'proc_stg_orders',
    target: 'proc_fct_sales',
    data: {
      relationship: 'transform',
      fromColumn: 'gross_amount',
      toColumn: 'gross_amount',
      metadata: { mappingType: 'computed', joinKey: 'order_id' },
    },
  },
  {
    id: 'e_clean_stripe_fct',
    source: 'proc_clean_stripe',
    target: 'proc_fct_sales',
    data: {
      relationship: 'transform',
      fromColumn: 'gross_charge_usd',
      toColumn: 'net_revenue',
      metadata: { mappingType: 'computed', joinKey: 'order_id' },
    },
  },
  {
    id: 'e_feat_fct',
    source: 'proc_py_features',
    target: 'proc_fct_sales',
    data: {
      relationship: 'foreign_key',
      fromColumn: 'customer_id',
      toColumn: 'customer_key',
      metadata: { fkRefTable: 'dim_customer_360' },
    },
  },
  {
    id: 'e_fct_audit',
    source: 'proc_fct_sales',
    target: 'proc_audit_gate',
    data: {
      relationship: 'transform',
      fromColumn: 'net_revenue',
      toColumn: 'verified_net_revenue',
      metadata: { mappingType: 'zero_leakage_audit' },
    },
  },
  {
    id: 'e_feat_audit',
    source: 'proc_py_features',
    target: 'proc_audit_gate',
    data: {
      relationship: 'data_flow',
      fromColumn: 'customer_id',
      toColumn: 'verified_orders',
      metadata: { mappingType: 'dlq_conservation_check' },
    },
  },
  {
    id: 'e_fct_dw',
    source: 'proc_fct_sales',
    target: 'dw_core',
    data: {
      relationship: 'transform',
      fromColumn: 'net_revenue',
      toColumn: 'net_revenue',
      metadata: { mappingType: 'star_schema_commit', targetTable: 'fact_daily_revenue' },
    },
  },
  {
    id: 'e_audit_dw',
    source: 'proc_audit_gate',
    target: 'dw_core',
    data: {
      relationship: 'data_flow',
      fromColumn: 'verified_net_revenue',
      toColumn: 'net_revenue',
      metadata: { mappingType: 'audit_certification', targetTable: 'dlq_quarantine_records' },
    },
  },
  {
    id: 'e_dw_mart',
    source: 'dw_core',
    target: 'mart_sales_analytics',
    data: {
      relationship: 'data_flow',
      fromColumn: 'revenue_key',
      toColumn: 'date_key',
      metadata: { mappingType: 'zetaris_virtual_view', view: 'v_bi_executive_sales' },
    },
  },
];

export function createInitialPipeline(): PipelineGraph {
  // Deep clone so the store owns a mutable copy independent of this module.
  return structuredClone({ nodes, edges });
}

export const INITIAL_DATA_SOURCES: DataSource[] = [
  { id: 'postgres_prod', name: 'PostgreSQL Main Production', type: 'postgresql', status: 'connected', tableCount: 14, description: 'Transactional database hosting e-commerce storefront orders, catalog SKUs, and inventory logs.' },
  { id: 'stripe_payments', name: 'Stripe Billing Gateway', type: 'stripe', status: 'connected', tableCount: 6, description: 'Payment gateway processing settlement logs, webhook charges, refunds, and dispute reserves.' },
  { id: 'salesforce_crm', name: 'Salesforce & Internal CRM', type: 'salesforce', status: 'connected', tableCount: 8, description: 'Enterprise CRM accounts, customer profiles, SLA contracts, and loyalty tiers.' },
  { id: 'snowflake_analytics', name: 'Snowflake Cloud Warehouse', type: 'snowflake', status: 'disconnected', tableCount: 20, description: 'Historical legacy analytical archive for multi-year financial audit backfills.' },
];
