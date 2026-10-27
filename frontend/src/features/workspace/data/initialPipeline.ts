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
        description: 'Enterprise company accounts, contractual SLA tiers, and credit terms.',
        columns: [
          { name: 'account_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'company_name', type: 'VARCHAR(200)', isPrimaryKey: false, isForeignKey: false },
          { name: 'tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'contract_value', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'billing_country', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
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
        description: 'CRM individual customer contacts linked to accounts.',
        columns: [
          { name: 'contact_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'account_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'accounts', fkRefColumn: 'account_id' },
          { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
          { name: 'email', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
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
      id: 'v_bi_executive_sales',
      type: 'resource',
      position: { x: 80, y: 60 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'v_bi_executive_sales',
        description: 'Virtual Zetaris view providing sub-second aggregations for executive revenue & GMV dashboards.',
        warehouseRole: 'generated',
        columns: [
          { name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'customer_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
          { name: 'tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
          { name: 'gross_volume', type: 'DECIMAL(18,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'net_volume', type: 'DECIMAL(18,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'transaction_count', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'v_customer_retention_cohorts',
      type: 'resource',
      position: { x: 80, y: 260 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'v_customer_retention_cohorts',
        description: 'Virtual Zetaris view modeling customer vintage cohort retention & net expansion rates.',
        warehouseRole: 'generated',
        columns: [
          { name: 'cohort_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
          { name: 'vintage_month', type: 'VARCHAR(7)', isPrimaryKey: false, isForeignKey: false },
          { name: 'day_30_retention', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'day_60_retention', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'day_120_retention', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'expansion_rate', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
  ],
  edges: [],
};

const nodes: PipelineNode[] = [
  // --- Sources ---
  {
    id: 'src_postgres_web_orders',
    type: 'resource',
    position: { x: 40, y: 80 },
    data: {
      category: 'resource',
      kind: 'source',
      label: 'src_postgres_web_orders',
      description: 'PostgreSQL operational order transactions and digital storefront cart checkout events.',
      warehouseRole: 'source',
      format: 'postgresql',
      columns: [
        { name: 'order_id', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
        { name: 'product_sku', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'unit_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'gross_amount', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'order_time', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        { name: 'status', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  },
  {
    id: 'src_stripe_events',
    type: 'resource',
    position: { x: 40, y: 280 },
    data: {
      category: 'resource',
      kind: 'source',
      label: 'src_stripe_events',
      description: 'Stripe webhook event stream capturing credit card charges, refunds, and gateway settlement logs.',
      warehouseRole: 'source',
      format: 'stripe',
      columns: [
        { name: 'charge_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
        { name: 'amount_cents', type: 'BIGINT', isPrimaryKey: false, isForeignKey: false },
        { name: 'currency', type: 'VARCHAR(3)', isPrimaryKey: false, isForeignKey: false },
        { name: 'fee_cents', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'refunded', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        { name: 'idempotency_key', type: 'VARCHAR(128)', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  },
  // --- Imported Database (expandable container) ---
  {
    id: 'db_crm',
    type: 'datamart',
    position: { x: 40, y: 480 },
    data: {
      category: 'datamart',
      containerKind: 'database',
      label: 'PostgreSQL CRM Database',
      description: 'Imported operational CRM database with enterprise customer accounts and contact profiles.',
      expanded: false,
      children: crmDatabaseChildren,
      metadata: { engine: 'postgresql' },
    },
  },
  // --- Transformations ---
  {
    id: 'proc_stg_orders',
    type: 'processing',
    position: { x: 380, y: 80 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'stg_clean_orders',
      description: 'SQL transformation validating orders, casting timestamps, and filtering test checkouts.',
      code: `SELECT
  order_id,
  customer_id,
  product_sku,
  quantity,
  unit_price,
  (quantity * unit_price) AS gross_amount,
  order_time,
  status
FROM src_postgres_web_orders
WHERE status IN ('completed', 'settled');`,
      inputColumns: ['order_id', 'customer_id', 'product_sku', 'quantity', 'unit_price', 'order_time', 'status'],
      outputColumns: ['order_id', 'customer_id', 'product_sku', 'quantity', 'unit_price', 'gross_amount', 'order_time'],
    },
  },
  {
    id: 'proc_clean_stripe',
    type: 'processing',
    position: { x: 380, y: 280 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'clean_stripe_events',
      description: 'Enforces SHA-256 idempotency deduplication and normalizes multi-currency settlement amounts to USD base.',
      code: `SELECT DISTINCT ON (charge_id)
  charge_id,
  customer_id,
  (amount_cents / 100.0) AS gross_charge_usd,
  (fee_cents / 100.0) AS gateway_fee_usd,
  refunded,
  created_at AS settled_at
FROM src_stripe_events
WHERE idempotency_key IS NOT NULL
ORDER BY charge_id, created_at DESC;`,
      inputColumns: ['charge_id', 'customer_id', 'amount_cents', 'fee_cents', 'refunded', 'idempotency_key', 'created_at'],
      outputColumns: ['charge_id', 'customer_id', 'gross_charge_usd', 'gateway_fee_usd', 'refunded', 'settled_at'],
    },
  },
  {
    id: 'proc_py_features',
    type: 'processing',
    position: { x: 380, y: 480 },
    data: {
      category: 'processing',
      language: 'python',
      engine: 'pandas',
      label: 'enrich_customer_scd',
      description: 'Joins CRM accounts with contact profiles to synthesize point-in-time loyalty tiers and enterprise segments.',
      code: `import pandas as pd

def transform(contacts: pd.DataFrame, accounts: pd.DataFrame) -> pd.DataFrame:
    merged = contacts.merge(accounts, on="account_id", how="left")
    merged["tier"] = merged["tier"].fillna("Standard")
    merged["is_enterprise"] = merged["tier"].isin(["Enterprise", "Strategic"])
    return merged[["customer_id", "email", "full_name", "tier", "billing_country", "is_enterprise"]]`,
      inputColumns: ['contact_id', 'account_id', 'customer_id', 'email', 'full_name'],
      outputColumns: ['customer_id', 'email', 'full_name', 'tier', 'billing_country', 'is_enterprise'],
    },
  },
  {
    id: 'proc_fct_sales',
    type: 'processing',
    position: { x: 700, y: 280 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'build_fact_daily_revenue',
      description: 'Resolves dimensional surrogate keys and joins cleansed orders with Stripe payment settlements into fact_daily_revenue.',
      code: `SELECT
  GENERATE_SURROGATE_KEY([o.order_id, p.charge_id]) AS revenue_key,
  c.customer_key,
  pr.product_key,
  REPLACE(CAST(DATE(o.order_time) AS TEXT), '-', '')::INT AS date_key,
  pm.payment_method_sk,
  o.gross_amount,
  COALESCE(p.gateway_fee_usd, 0.0) AS gateway_fee,
  CASE WHEN c.tier = 'Enterprise' THEN o.gross_amount * 0.05 ELSE 0.0 END AS discount_amount,
  CASE WHEN p.refunded THEN o.gross_amount ELSE 0.0 END AS refund_amount,
  (o.gross_amount - COALESCE(p.gateway_fee_usd, 0.0) - (CASE WHEN p.refunded THEN o.gross_amount ELSE 0.0 END)) AS net_revenue
FROM stg_clean_orders o
INNER JOIN clean_stripe_events p ON p.customer_id = o.customer_id
LEFT JOIN dim_customer_360 c ON c.customer_id = o.customer_id AND c.is_current = TRUE
LEFT JOIN dim_product pr ON pr.sku_code = o.product_sku
LEFT JOIN dim_payment_method pm ON pm.provider = 'Stripe';`,
      inputColumns: ['order_id', 'customer_id', 'product_sku', 'gross_amount', 'order_time', 'charge_id', 'gross_charge_usd', 'gateway_fee_usd', 'refunded'],
      outputColumns: ['revenue_key', 'customer_key', 'product_key', 'date_key', 'payment_method_sk', 'gross_amount', 'gateway_fee', 'discount_amount', 'refund_amount', 'net_revenue'],
    },
  },
  // --- Data Warehouse (expandable container) ---
  {
    id: 'dw_core',
    type: 'datamart',
    position: { x: 1020, y: 200 },
    data: {
      category: 'datamart',
      containerKind: 'warehouse',
      label: 'Sales & Revenue Lakehouse',
      description: 'Kimball Star-Schema: fact_daily_revenue joined to conformed customer, product, date, and payment dimensions.',
      expanded: false,
      children: warehouseChildren,
      metadata: { schema: 'analytics' },
    },
  },
  // --- Data Mart (drill-in container) ---
  {
    id: 'mart_sales_analytics',
    type: 'datamart',
    position: { x: 1400, y: 240 },
    data: {
      category: 'datamart',
      containerKind: 'datamart',
      label: 'Executive BI Mart',
      description: 'Federated Zetaris analytical views powering executive revenue waterfall, LTV cohorts, and finance dashboards.',
      children: datamartChildren,
    },
  },
];

const edges: PipelineEdge[] = [
  { id: 'e_src_orders_stg', source: 'src_postgres_web_orders', target: 'proc_stg_orders', data: { relationship: 'data_flow' } },
  { id: 'e_src_stripe_clean', source: 'src_stripe_events', target: 'proc_clean_stripe', data: { relationship: 'data_flow' } },
  { id: 'e_db_crm_feat', source: 'db_crm', target: 'proc_py_features', data: { relationship: 'data_flow' } },
  { id: 'e_stg_orders_fct', source: 'proc_stg_orders', target: 'proc_fct_sales', data: { relationship: 'data_flow' } },
  { id: 'e_clean_stripe_fct', source: 'proc_clean_stripe', target: 'proc_fct_sales', data: { relationship: 'data_flow' } },
  { id: 'e_feat_fct', source: 'proc_py_features', target: 'proc_fct_sales', data: { relationship: 'data_flow' } },
  { id: 'e_fct_dw', source: 'proc_fct_sales', target: 'dw_core', data: { relationship: 'data_flow' } },
  { id: 'e_dw_mart', source: 'dw_core', target: 'mart_sales_analytics', data: { relationship: 'data_flow' } },
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
