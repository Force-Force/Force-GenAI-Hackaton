import { WarehouseNode, WarehouseConnection, DataSource, ValidationItem, Transformation } from './types';

export const INITIAL_TABLES: WarehouseNode[] = [
  {
    id: 'FactSales',
    name: 'FactSales',
    type: 'fact',
    description: 'Central transactional fact table storing business line item records with aggregated sales measures.',
    position: { x: 380, y: 180 },
    columns: [
      { name: 'sales_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Surrogate primary key for transactions.' },
      { name: 'customer_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimCustomer', fkRefColumn: 'customer_key', description: 'FK joining customer records.' },
      { name: 'product_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimProduct', fkRefColumn: 'product_key', description: 'FK joining catalog products.' },
      { name: 'date_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimDate', fkRefColumn: 'date_key', description: 'FK joining custom physical audit dates.' },
      { name: 'store_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'DimStore', fkRefColumn: 'store_key', description: 'FK joining location dimensions.' },
      { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false, description: 'Quantity count of items ordered.' },
      { name: 'unit_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, description: 'Calculated baseline asset price.' },
      { name: 'revenue', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false, description: 'Gross pipeline intake aggregation.' }
    ]
  },
  {
    id: 'DimCustomer',
    name: 'DimCustomer',
    type: 'dimension',
    description: 'Tracks comprehensive profile histories, marketing tier systems, and localized contact details.',
    position: { x: -20, y: 60 },
    columns: [
      { name: 'customer_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Primary surrogate key.' },
      { name: 'customer_id', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, description: 'Natural legacy business key.' },
      { name: 'full_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false, description: 'Aggregated name record.' },
      { name: 'email', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false, description: 'Unique email address.' },
      { name: 'city', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, description: 'Billing address city.' },
      { name: 'country', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, description: 'ISO standard code designation.' },
      { name: 'marketing_tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, description: 'Categorization mapping.' }
    ]
  },
  {
    id: 'DimProduct',
    name: 'DimProduct',
    type: 'dimension',
    description: 'Catalog listing items, custom configurations, product ranges, and pricing tiers.',
    position: { x: -20, y: 380 },
    columns: [
      { name: 'product_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Primary surrogate key.' },
      { name: 'sku_code', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, description: 'Stock keeping identifier code.' },
      { name: 'product_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false, description: 'Display name.' },
      { name: 'category', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, description: 'General merchandise group name.' },
      { name: 'list_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, description: 'Target listing price catalog.' },
      { name: 'is_discontinued', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false, description: 'Product activity lifecycle flag.' }
    ]
  },
  {
    id: 'DimDate',
    name: 'DimDate',
    type: 'dimension',
    description: 'Calendar table generated to cover standard fields, quarters, fiscal, and holiday seasons.',
    position: { x: 780, y: 60 },
    columns: [
      { name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Primary surrogate key represented as YYYYMMDD.' },
      { name: 'calendar_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false, description: 'Canonical exact date.' },
      { name: 'year', type: 'INT', isPrimaryKey: false, isForeignKey: false, description: 'Standard Gregorian year.' },
      { name: 'quarter', type: 'INT', isPrimaryKey: false, isForeignKey: false, description: 'Numerical quarter (1-4).' },
      { name: 'month_name', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, description: 'Textual representation of month.' },
      { name: 'day_of_week', type: 'VARCHAR(15)', isPrimaryKey: false, isForeignKey: false, description: 'Literal standard weekday name.' }
    ]
  },
  {
    id: 'DimStore',
    name: 'DimStore',
    type: 'dimension',
    description: 'Tracks brick-and-mortar stores, geographic regional locations, and branch managers.',
    position: { x: 780, y: 380 },
    columns: [
      { name: 'store_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Primary key.' },
      { name: 'store_id', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, description: 'Natural warehouse ID.' },
      { name: 'store_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, description: 'Physical store designation.' },
      { name: 'region', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, description: 'Territory management classification.' },
      { name: 'manager', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, description: 'General operational manager.' }
    ]
  },
  {
    id: 'src_postgres_web_orders',
    name: 'src_postgres_web_orders',
    type: 'source',
    description: 'Direct replica ingestion feed from production transaction logs database.',
    position: { x: -420, y: 150 },
    columns: [
      { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { name: 'customer_email', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
      { name: 'prod_sku', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
      { name: 'qty', type: 'INT', isPrimaryKey: false, isForeignKey: false },
      { name: 'final_price', type: 'NUMERIC', isPrimaryKey: false, isForeignKey: false },
      { name: 'order_time', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false }
    ]
  }
];

export const INITIAL_CONNECTIONS: WarehouseConnection[] = [
  {
    id: 'conn_cust',
    fromTable: 'FactSales',
    fromColumn: 'customer_key',
    toTable: 'DimCustomer',
    toColumn: 'customer_key'
  },
  {
    id: 'conn_prod',
    fromTable: 'FactSales',
    fromColumn: 'product_key',
    toTable: 'DimProduct',
    toColumn: 'product_key'
  },
  {
    id: 'conn_date',
    fromTable: 'FactSales',
    fromColumn: 'date_key',
    toTable: 'DimDate',
    toColumn: 'date_key'
  },
  {
    id: 'conn_store',
    fromTable: 'FactSales',
    fromColumn: 'store_key',
    toTable: 'DimStore',
    toColumn: 'store_key'
  },
  {
    id: 'conn_src_email',
    fromTable: 'DimCustomer',
    fromColumn: 'email',
    toTable: 'src_postgres_web_orders',
    toColumn: 'customer_email'
  }
];

export const INITIAL_SOURCES: DataSource[] = [
  {
    id: 'postgres_prod',
    name: 'PostgreSQL Main Production',
    type: 'postgresql',
    status: 'connected',
    tableCount: 14,
    description: 'Transactional database running online engine records.'
  },
  {
    id: 'salesforce_crm',
    name: 'Salesforce Enterprise Hub',
    type: 'salesforce',
    status: 'connected',
    tableCount: 8,
    description: 'CRM metadata replication for user profile mappings.'
  },
  {
    id: 'stripe_payments',
    name: 'Stripe Billing System',
    type: 'stripe',
    status: 'disconnected',
    tableCount: 5,
    description: 'Payment gateway audit logs and subscription history.'
  },
  {
    id: 'snowflake_analytics',
    name: 'Snowflake External Archive',
    type: 'snowflake',
    status: 'disconnected',
    tableCount: 20,
    description: 'Legacy analytical schemas for historic backfill audits.'
  }
];

export const INITIAL_VALIDATIONS: ValidationItem[] = [
  {
    id: 'val_pks',
    type: 'success',
    message: 'Primary Keys validated: All dimensions and fact tables have active, non-null surrogate keys.',
    category: 'keys'
  },
  {
    id: 'val_dim_ref',
    type: 'success',
    message: 'Referential integrity check passed: Dimension joins are fully indexed.',
    category: 'relationships'
  },
  {
    id: 'val_miss_date',
    type: 'warning',
    message: 'Warning: DimDate surrogate key (date_key) uses INT format but source raw orders use TIMESTAMP coordinates. Missing explicit string mapping transforms.',
    category: 'naming'
  },
  {
    id: 'val_schema_source',
    type: 'warning',
    message: 'Postgres Source mapping contains disconnected attributes prod_sku -> sku_code lookup is unreferenced in model transforms.',
    category: 'relationships'
  }
];

export const INITIAL_TRANSFORMATIONS: Transformation[] = [
  {
    id: 'trans_sales_pipeline',
    name: 'FactSales Ingestion Pipeline',
    inputType: 'SQL',
    logic: `SELECT
  GENERATE_SURROGATE_KEY([o.id]) as sales_key,
  c.customer_key as customer_key,
  p.product_key as product_key,
  REPLACE(CAST(DATE(o.order_time) as TEXT), '-', '')::INT as date_key,
  COALESCE(s.store_key, -1) as store_key,
  o.qty as quantity,
  o.final_price as unit_price,
  (o.qty * o.final_price) as revenue
FROM src_postgres_web_orders o
LEFT JOIN DimCustomer c ON c.email = o.customer_email
LEFT JOIN DimProduct p ON p.sku_code = o.prod_sku
LEFT JOIN DimStore s ON s.store_id = 'ONLINE_WEB_STORE';`,
    inputColumns: ['id', 'customer_email', 'prod_sku', 'qty', 'final_price', 'order_time'],
    outputColumns: ['sales_key', 'customer_key', 'product_key', 'date_key', 'store_key', 'quantity', 'unit_price', 'revenue']
  }
];
