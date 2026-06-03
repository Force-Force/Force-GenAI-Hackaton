import type {
  Column,
  DataSource,
  PipelineEdge,
  PipelineGraph,
  PipelineNode,
} from '../../../types/pipeline';

/**
 * Default canvas state: the ENTIRE ETL pipeline laid out left-to-right
 * (sources -> processing -> warehouse -> datamart), not a warehouse-first view.
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
    position: { x: 0, y: 220 },
    data: {
      category: 'resource',
      kind: 'source',
      label: 'src_postgres_web_orders',
      description: 'Replica ingestion feed from production web order logs.',
      warehouseRole: 'source',
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
  // --- Processing ---
  {
    id: 'proc_stg_orders',
    type: 'processing',
    position: { x: 340, y: 120 },
    data: {
      category: 'processing',
      language: 'sql',
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
    id: 'proc_fct_sales',
    type: 'processing',
    position: { x: 340, y: 340 },
    data: {
      category: 'processing',
      language: 'sql',
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
  // --- Warehouse ---
  {
    id: 'FactSales',
    type: 'resource',
    position: { x: 700, y: 320 },
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
    position: { x: 700, y: 40 },
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
    position: { x: 700, y: 560 },
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
    position: { x: 1040, y: 40 },
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
    position: { x: 1040, y: 560 },
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
  // --- Datamart ---
  {
    id: 'mart_sales_analytics',
    type: 'datamart',
    position: { x: 1040, y: 320 },
    data: {
      category: 'datamart',
      label: 'Sales Analytics Mart',
      description: 'Curated KPIs for sales and customer analytics dashboards.',
      children: datamartChildren,
    },
  },
];

const edges: PipelineEdge[] = [
  { id: 'e_src_stg', source: 'src_postgres_web_orders', target: 'proc_stg_orders', data: { relationship: 'data_flow' } },
  { id: 'e_stg_fct', source: 'proc_stg_orders', target: 'proc_fct_sales', data: { relationship: 'data_flow' } },
  { id: 'e_fct_build', source: 'proc_fct_sales', target: 'FactSales', data: { relationship: 'data_flow' } },
  { id: 'e_fct_cust', source: 'FactSales', target: 'DimCustomer', data: { relationship: 'foreign_key', fromColumn: 'customer_key', toColumn: 'customer_key' } },
  { id: 'e_fct_prod', source: 'FactSales', target: 'DimProduct', data: { relationship: 'foreign_key', fromColumn: 'product_key', toColumn: 'product_key' } },
  { id: 'e_fct_date', source: 'FactSales', target: 'DimDate', data: { relationship: 'foreign_key', fromColumn: 'date_key', toColumn: 'date_key' } },
  { id: 'e_fct_store', source: 'FactSales', target: 'DimStore', data: { relationship: 'foreign_key', fromColumn: 'store_key', toColumn: 'store_key' } },
  { id: 'e_fct_mart', source: 'FactSales', target: 'mart_sales_analytics', data: { relationship: 'data_flow' } },
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
