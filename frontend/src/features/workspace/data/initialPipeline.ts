import type {
  Column,
  DataSource,
  PipelineEdge,
  PipelineGraph,
  PipelineNode,
} from '../../../types/pipeline';

/**
 * Default canvas state. The ETL pipeline flows left-to-right:
 *   sources -> transformations -> Data Warehouse (container) -> Data Mart.
 *
 * Warehouse + imported-database tables live INSIDE their container node's
 * `children` graph (Section 8); they are never standalone canvas nodes.
 */

const factColumns: Column[] = [
  { name: 'sales_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Surrogate primary key.' },
  { name: 'customer_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimCustomer', fkRefColumn: 'customer_key' },
  { name: 'product_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimProduct', fkRefColumn: 'product_key' },
  { name: 'date_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimDate', fkRefColumn: 'date_key' },
  { name: 'store_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimStore', fkRefColumn: 'store_key' },
  { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false },
  { name: 'unit_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
  { name: 'revenue', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
];

/** Tables held inside the Data Warehouse container node. */
const warehouseChildren: PipelineGraph = {
  nodes: [
    {
      id: 'FactSales',
      type: 'resource',
      position: { x: 360, y: 200 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'FactSales',
        description: 'Central transactional fact table with aggregated sales measures.',
        warehouseRole: 'fact',
        columns: factColumns,
      },
    },
    {
      id: 'DimCustomer',
      type: 'resource',
      position: { x: 40, y: 40 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'DimCustomer',
        description: 'Customer profiles, marketing tiers, and contact details.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'customer_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'email', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
          { name: 'full_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
          { name: 'country', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'DimProduct',
      type: 'resource',
      position: { x: 40, y: 360 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'DimProduct',
        description: 'Catalog products, categories, and pricing tiers.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'product_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'sku_code', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'product_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
          { name: 'category', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'DimDate',
      type: 'resource',
      position: { x: 680, y: 40 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'DimDate',
        description: 'Calendar dimension with fiscal and holiday attributes.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'calendar_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false },
          { name: 'year', type: 'INT', isPrimaryKey: false, isForeignKey: false },
          { name: 'quarter', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'DimStore',
      type: 'resource',
      position: { x: 680, y: 360 },
      data: {
        category: 'resource',
        kind: 'warehouse',
        label: 'DimStore',
        description: 'Physical store locations, regions, and managers.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'store_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'store_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
          { name: 'region', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
  ],
  edges: [
    { id: 'e_fct_cust', source: 'FactSales', target: 'DimCustomer', data: { relationship: 'foreign_key', fromColumn: 'customer_key', toColumn: 'customer_key' } },
    { id: 'e_fct_prod', source: 'FactSales', target: 'DimProduct', data: { relationship: 'foreign_key', fromColumn: 'product_key', toColumn: 'product_key' } },
    { id: 'e_fct_date', source: 'FactSales', target: 'DimDate', data: { relationship: 'foreign_key', fromColumn: 'date_key', toColumn: 'date_key' } },
    { id: 'e_fct_store', source: 'FactSales', target: 'DimStore', data: { relationship: 'foreign_key', fromColumn: 'store_key', toColumn: 'store_key' } },
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
        description: 'CRM company accounts.',
        columns: [
          { name: 'account_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'company_name', type: 'VARCHAR(200)', isPrimaryKey: false, isForeignKey: false },
          { name: 'tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
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
        description: 'CRM individual contacts linked to accounts.',
        columns: [
          { name: 'contact_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'account_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'accounts', fkRefColumn: 'account_id' },
          { name: 'email', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
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
      id: 'mart_kpi_daily_revenue',
      type: 'resource',
      position: { x: 80, y: 80 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'kpi_daily_revenue',
        description: 'Aggregated daily revenue KPIs for executive dashboards.',
        warehouseRole: 'generated',
        columns: [
          { name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'total_revenue', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false },
          { name: 'order_count', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    },
    {
      id: 'mart_kpi_customer_ltv',
      type: 'resource',
      position: { x: 80, y: 280 },
      data: {
        category: 'resource',
        kind: 'table',
        label: 'kpi_customer_ltv',
        description: 'Customer lifetime value rollup.',
        warehouseRole: 'generated',
        columns: [
          { name: 'customer_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'lifetime_value', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false },
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
    position: { x: 0, y: 120 },
    data: {
      category: 'resource',
      kind: 'source',
      label: 'web_orders',
      description: 'Replica ingestion feed from production web order logs.',
      warehouseRole: 'source',
      format: 'postgresql',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_email', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
        { name: 'prod_sku', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'qty', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'final_price', type: 'NUMERIC', isPrimaryKey: false, isForeignKey: false },
        { name: 'order_time', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  },
  // --- Imported Database (expandable container) ---
  {
    id: 'db_crm',
    type: 'datamart',
    position: { x: 0, y: 360 },
    data: {
      category: 'datamart',
      containerKind: 'database',
      label: 'CRM Postgres',
      description: 'Imported CRM database with account and contact tables.',
      expanded: false,
      children: crmDatabaseChildren,
      metadata: { engine: 'postgresql' },
    },
  },
  // --- Transformations ---
  {
    id: 'proc_stg_orders',
    type: 'processing',
    position: { x: 320, y: 120 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'stg_web_orders',
      description: 'Staging clean-up of raw web orders.',
      code: `SELECT
  id,
  lower(customer_email) AS customer_email,
  prod_sku,
  qty,
  final_price,
  order_time
FROM src_postgres_web_orders;`,
      inputColumns: ['id', 'customer_email', 'prod_sku', 'qty', 'final_price', 'order_time'],
      outputColumns: ['id', 'customer_email', 'prod_sku', 'qty', 'final_price', 'order_time'],
    },
  },
  {
    id: 'proc_py_features',
    type: 'processing',
    position: { x: 320, y: 360 },
    data: {
      category: 'processing',
      language: 'python',
      engine: 'pandas',
      label: 'enrich_customer_features',
      description: 'Joins CRM accounts to enrich customer tiers with pandas.',
      code: `import pandas as pd

def transform(contacts: pd.DataFrame, accounts: pd.DataFrame) -> pd.DataFrame:
    merged = contacts.merge(accounts, on="account_id", how="left")
    merged["tier"] = merged["tier"].fillna("standard")
    return merged[["email", "company_name", "tier"]]`,
      inputColumns: ['contact_id', 'account_id', 'email'],
      outputColumns: ['email', 'company_name', 'tier'],
    },
  },
  {
    id: 'proc_fct_sales',
    type: 'processing',
    position: { x: 620, y: 240 },
    data: {
      category: 'processing',
      language: 'sql',
      engine: 'sql',
      label: 'build_fct_sales',
      description: 'Builds the FactSales grain from staged orders and dimensions.',
      code: `SELECT
  GENERATE_SURROGATE_KEY([o.id]) AS sales_key,
  c.customer_key,
  p.product_key,
  REPLACE(CAST(DATE(o.order_time) AS TEXT), '-', '')::INT AS date_key,
  COALESCE(s.store_key, -1) AS store_key,
  o.qty AS quantity,
  o.final_price AS unit_price,
  (o.qty * o.final_price) AS revenue
FROM stg_web_orders o
LEFT JOIN DimCustomer c ON c.email = o.customer_email
LEFT JOIN DimProduct p ON p.sku_code = o.prod_sku;`,
      inputColumns: ['id', 'customer_email', 'prod_sku', 'qty', 'final_price'],
      outputColumns: ['sales_key', 'customer_key', 'product_key', 'date_key', 'store_key', 'quantity', 'unit_price', 'revenue'],
    },
  },
  // --- Data Warehouse (expandable container) ---
  {
    id: 'dw_core',
    type: 'datamart',
    position: { x: 920, y: 160 },
    data: {
      category: 'datamart',
      containerKind: 'warehouse',
      label: 'Sales Warehouse',
      description: 'Star-schema warehouse: FactSales surrounded by conformed dimensions.',
      expanded: false,
      children: warehouseChildren,
      metadata: { schema: 'analytics' },
    },
  },
  // --- Data Mart (drill-in container) ---
  {
    id: 'mart_sales_analytics',
    type: 'datamart',
    position: { x: 1280, y: 200 },
    data: {
      category: 'datamart',
      containerKind: 'datamart',
      label: 'Sales Analytics Mart',
      description: 'Curated KPIs for sales and customer analytics dashboards.',
      children: datamartChildren,
    },
  },
];

const edges: PipelineEdge[] = [
  { id: 'e_src_stg', source: 'src_postgres_web_orders', target: 'proc_stg_orders', data: { relationship: 'data_flow' } },
  { id: 'e_db_feat', source: 'db_crm', target: 'proc_py_features', data: { relationship: 'data_flow' } },
  { id: 'e_stg_fct', source: 'proc_stg_orders', target: 'proc_fct_sales', data: { relationship: 'data_flow' } },
  { id: 'e_feat_fct', source: 'proc_py_features', target: 'proc_fct_sales', data: { relationship: 'data_flow' } },
  { id: 'e_fct_dw', source: 'proc_fct_sales', target: 'dw_core', data: { relationship: 'data_flow' } },
  { id: 'e_dw_mart', source: 'dw_core', target: 'mart_sales_analytics', data: { relationship: 'data_flow' } },
];

export function createInitialPipeline(): PipelineGraph {
  // Deep clone so the store owns a mutable copy independent of this module.
  return structuredClone({ nodes, edges });
}

export const INITIAL_DATA_SOURCES: DataSource[] = [
  { id: 'postgres_prod', name: 'PostgreSQL Main Production', type: 'postgresql', status: 'connected', tableCount: 14, description: 'Transactional database running online engine records.' },
  { id: 'salesforce_crm', name: 'Salesforce Enterprise Hub', type: 'salesforce', status: 'connected', tableCount: 8, description: 'CRM metadata replication for user profile mappings.' },
  { id: 'stripe_payments', name: 'Stripe Billing System', type: 'stripe', status: 'disconnected', tableCount: 5, description: 'Payment gateway audit logs and subscription history.' },
  { id: 'snowflake_analytics', name: 'Snowflake External Archive', type: 'snowflake', status: 'disconnected', tableCount: 20, description: 'Legacy analytical schemas for historic backfill audits.' },
];
