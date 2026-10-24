import type { Column, SourceFormat } from '../../../types/pipeline';

export interface ParquetMetadata {
  tableName: string;
  columns: Column[];
  rowCount: number;
  rowGroups: number;
  codec: 'SNAPPY' | 'ZSTD' | 'GZIP' | 'UNCOMPRESSED';
  sizeBytes: number;
  version: string;
}

export interface ApiEndpointConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  authType: 'none' | 'bearer' | 'apiKey' | 'basic';
  authToken?: string;
  apiKeyHeader?: string;
  apiKeyValue?: string;
  jsonPath?: string;
  headers: Array<{ key: string; value: string }>;
}

export interface DatabaseConnectionConfig {
  engine: 'postgresql' | 'mysql' | 'snowflake';
  host: string;
  port: number;
  database: string;
  schema: string;
  username: string;
  password?: string;
  warehouse?: string; // Snowflake specific
  role?: string;      // Snowflake specific
  sslMode: 'require' | 'prefer' | 'disable';
  connectionUri?: string;
}

export interface DatabaseTableSchema {
  tableName: string;
  columns: Column[];
  rowCount: number;
  engine: 'postgresql' | 'mysql' | 'snowflake';
}

export interface ZetarisVirtualTable {
  namespace: string;
  tableName: string;
  fullyQualifiedName: string; // e.g. zetaris.files.sales_parquet
  underlyingSource: string;
  sourceFormat: SourceFormat;
  columns: Column[];
  rowCount: number;
  virtualizationMode: 'In-Memory Pushdown' | 'Zero-Copy Zero-ETL' | 'Dynamic Virtual View';
}

export interface ZetarisQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  executionTimeMs: number;
  federatedSourcesInvolved: string[];
  pushdownEngines: string[];
}

/** Sanitize an input identifier to valid snake_case table name */
export function sanitizeIdentifier(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'source_table';
}

/** Infer schema from a simulated or real Parquet file description */
export function inferParquetSchema(fileName: string, customColumns?: Column[]): ParquetMetadata {
  const baseName = sanitizeIdentifier(fileName.replace(/\.parquet$/i, ''));

  if (customColumns && customColumns.length > 0) {
    return {
      tableName: baseName,
      columns: customColumns,
      rowCount: 125000,
      rowGroups: 4,
      codec: 'SNAPPY',
      sizeBytes: 14820000,
      version: 'Parquet 2.6',
    };
  }

  // Domain-aware default schemas for typical parquet files
  if (baseName.includes('event') || baseName.includes('click')) {
    return {
      tableName: baseName,
      columns: [
        { name: 'event_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
        { name: 'session_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
        { name: 'user_id', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'event_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'page_url', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        { name: 'device_type', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
        { name: 'duration_seconds', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'event_time', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
      ],
      rowCount: 450000,
      rowGroups: 8,
      codec: 'ZSTD',
      sizeBytes: 28400000,
      version: 'Parquet 2.6',
    };
  }

  // Default sales/financial transactions parquet
  return {
    tableName: baseName || 'sales_transactions',
    columns: [
      { name: 'transaction_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
      { name: 'customer_id', type: 'INT', isPrimaryKey: false, isForeignKey: false },
      { name: 'store_id', type: 'INT', isPrimaryKey: false, isForeignKey: false },
      { name: 'amount', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
      { name: 'currency', type: 'VARCHAR(3)', isPrimaryKey: false, isForeignKey: false },
      { name: 'payment_status', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
    ],
    rowCount: 124500,
    rowGroups: 4,
    codec: 'SNAPPY',
    sizeBytes: 15420000,
    version: 'Parquet 2.6',
  };
}

/** Infer schema from a JSON object or response payload from REST APIs */
export function inferApiSchema(endpointUrl: string, sampleJson?: string): {
  tableName: string;
  columns: Column[];
  samplePayload: unknown;
} {
  const urlParts = endpointUrl.split('?')[0].split('/');
  const lastSegment = urlParts.filter(Boolean).pop() || 'api_resource';
  const tableName = sanitizeIdentifier(`api_${lastSegment}`);

  if (sampleJson) {
    try {
      const parsed = JSON.parse(sampleJson);
      const target = Array.isArray(parsed)
        ? parsed[0]
        : (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).data)
          ? ((parsed as Record<string, unknown>).data as unknown[])[0]
          : parsed);

      if (target && typeof target === 'object') {
        const columns: Column[] = Object.keys(target as Record<string, unknown>).map((key, index) => {
          const val = (target as Record<string, unknown>)[key];
          let type = 'VARCHAR(255)';
          if (typeof val === 'number') {
            type = Number.isInteger(val) ? 'INT' : 'DECIMAL(12,2)';
          } else if (typeof val === 'boolean') {
            type = 'BOOLEAN';
          } else if (typeof val === 'string' && !Number.isNaN(Date.parse(val)) && val.length > 10) {
            type = 'TIMESTAMP';
          }
          return {
            name: sanitizeIdentifier(key),
            type,
            isPrimaryKey: index === 0 || key.toLowerCase() === 'id',
            isForeignKey: false,
          };
        });

        return { tableName, columns, samplePayload: parsed };
      }
    } catch {
      // fallback to domain defaults
    }
  }

  // Domain defaults for REST APIs (Stripe, Salesforce, Shopify, etc.)
  if (endpointUrl.includes('stripe') || endpointUrl.includes('charge') || endpointUrl.includes('invoice')) {
    return {
      tableName: 'api_stripe_charges',
      columns: [
        { name: 'charge_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
        { name: 'amount', type: 'INT', isPrimaryKey: false, isForeignKey: false, description: 'Amount in cents' },
        { name: 'currency', type: 'VARCHAR(3)', isPrimaryKey: false, isForeignKey: false },
        { name: 'status', type: 'VARCHAR(24)', isPrimaryKey: false, isForeignKey: false },
        { name: 'paid', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false },
        { name: 'receipt_url', type: 'VARCHAR(512)', isPrimaryKey: false, isForeignKey: false },
        { name: 'created', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
      ],
      samplePayload: {
        object: 'list',
        data: [
          { charge_id: 'ch_3N4y...', amount: 4900, currency: 'usd', paid: true, status: 'succeeded' }
        ]
      }
    };
  }

  return {
    tableName,
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
      { name: 'name', type: 'VARCHAR(128)', isPrimaryKey: false, isForeignKey: false },
      { name: 'status', type: 'VARCHAR(32)', isPrimaryKey: false, isForeignKey: false },
      { name: 'payload_json', type: 'VARCHAR(1000)', isPrimaryKey: false, isForeignKey: false },
      { name: 'updated_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
    ],
    samplePayload: {
      status: 'success',
      data: [{ id: 'res_001', name: 'Endpoint Result', status: 'active', updated_at: new Date().toISOString() }]
    }
  };
}

/** Pre-configured enterprise database tables for PostgreSQL, MySQL, and Snowflake */
export const DATABASE_CATALOG_PRESETS: Record<string, DatabaseTableSchema[]> = {
  postgresql: [
    {
      tableName: 'customers',
      engine: 'postgresql',
      rowCount: 48200,
      columns: [
        { name: 'customer_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        { name: 'full_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
        { name: 'country_code', type: 'VARCHAR(2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'loyalty_tier', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
      ],
    },
    {
      tableName: 'orders_oltp',
      engine: 'postgresql',
      rowCount: 194300,
      columns: [
        { name: 'order_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'customers', fkRefColumn: 'customer_id' },
        { name: 'order_status', type: 'VARCHAR(32)', isPrimaryKey: false, isForeignKey: false },
        { name: 'subtotal_amount', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'tax_amount', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'ordered_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  ],
  snowflake: [
    {
      tableName: 'dim_enterprise_accounts',
      engine: 'snowflake',
      rowCount: 12500,
      columns: [
        { name: 'account_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'account_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
        { name: 'arr_tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
        { name: 'industry', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'region', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
      ],
    },
    {
      tableName: 'fct_quarterly_bookings',
      engine: 'snowflake',
      rowCount: 560000,
      columns: [
        { name: 'booking_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
        { name: 'account_key', type: 'INT', isPrimaryKey: false, isForeignKey: true, fkRefTable: 'dim_enterprise_accounts', fkRefColumn: 'account_key' },
        { name: 'fiscal_quarter', type: 'VARCHAR(10)', isPrimaryKey: false, isForeignKey: false },
        { name: 'acv_amount', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'contract_duration_months', type: 'INT', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  ],
  mysql: [
    {
      tableName: 'store_inventory',
      engine: 'mysql',
      rowCount: 32000,
      columns: [
        { name: 'sku_id', type: 'VARCHAR(32)', isPrimaryKey: true, isForeignKey: false },
        { name: 'store_code', type: 'VARCHAR(16)', isPrimaryKey: false, isForeignKey: false },
        { name: 'units_in_stock', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'reorder_level', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'unit_cost', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
      ],
    },
  ],
};

/** Unified Zetaris Lakehouse Virtualization Catalog */
export const ZETARIS_VIRTUAL_CATALOG: ZetarisVirtualTable[] = [
  {
    namespace: 'zetaris.files',
    tableName: 'sales_parquet',
    fullyQualifiedName: 'zetaris.files.sales_parquet',
    underlyingSource: 's3://lakehouse-aurabi/raw/sales_transactions.parquet',
    sourceFormat: 'parquet',
    rowCount: 124500,
    virtualizationMode: 'In-Memory Pushdown',
    columns: [
      { name: 'transaction_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
      { name: 'customer_id', type: 'INT', isPrimaryKey: false, isForeignKey: false },
      { name: 'amount', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
      { name: 'payment_status', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
    ],
  },
  {
    namespace: 'zetaris.files',
    tableName: 'customer_churn_csv',
    fullyQualifiedName: 'zetaris.files.customer_churn_csv',
    underlyingSource: 'lakefs://marketing/churn_analysis.csv',
    sourceFormat: 'csv',
    rowCount: 5000,
    virtualizationMode: 'In-Memory Pushdown',
    columns: [
      { name: 'customer_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { name: 'tenure_months', type: 'INT', isPrimaryKey: false, isForeignKey: false },
      { name: 'contract_type', type: 'VARCHAR(32)', isPrimaryKey: false, isForeignKey: false },
      { name: 'churn_risk_score', type: 'DECIMAL(4,2)', isPrimaryKey: false, isForeignKey: false },
    ],
  },
  {
    namespace: 'zetaris.postgres',
    tableName: 'customers',
    fullyQualifiedName: 'zetaris.postgres.customers',
    underlyingSource: 'postgresql://postgres-prod.internal:5432/production.public.customers',
    sourceFormat: 'postgresql',
    rowCount: 48200,
    virtualizationMode: 'Zero-Copy Zero-ETL',
    columns: [
      { name: 'customer_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
      { name: 'full_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
      { name: 'loyalty_tier', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false },
    ],
  },
  {
    namespace: 'zetaris.snowflake',
    tableName: 'dim_accounts',
    fullyQualifiedName: 'zetaris.snowflake.dim_accounts',
    underlyingSource: 'snowflake://aura_enterprise.us-east-1/ANALYTICS.CRM.DIM_ACCOUNTS',
    sourceFormat: 'snowflake',
    rowCount: 12500,
    virtualizationMode: 'Zero-Copy Zero-ETL',
    columns: [
      { name: 'account_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { name: 'account_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
      { name: 'arr_tier', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
      { name: 'industry', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
    ],
  },
  {
    namespace: 'zetaris.api',
    tableName: 'stripe_charges',
    fullyQualifiedName: 'zetaris.api.stripe_charges',
    underlyingSource: 'https://api.stripe.com/v1/charges (REST JSON Virtual Table)',
    sourceFormat: 'api',
    rowCount: 18400,
    virtualizationMode: 'Dynamic Virtual View',
    columns: [
      { name: 'charge_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
      { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
      { name: 'amount', type: 'INT', isPrimaryKey: false, isForeignKey: false },
      { name: 'status', type: 'VARCHAR(24)', isPrimaryKey: false, isForeignKey: false },
      { name: 'paid', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false },
    ],
  },
];

/**
 * Execute a simulated cross-source federated query through the Zetaris Virtualization Engine.
 * AI agents and users query heterogeneous databases, files, and APIs with standard ANSI SQL.
 */
export function executeZetarisFederatedQuery(query: string): ZetarisQueryResult {
  const normalized = query.toLowerCase();

  const federatedSources: string[] = [];
  const pushdownEngines: string[] = [];

  if (normalized.includes('zetaris.postgres') || normalized.includes('postgres')) {
    federatedSources.push('zetaris.postgres.customers (PostgreSQL Live)');
    pushdownEngines.push('PostgreSQL Optimizer Pushdown (Indexed Scan)');
  }
  if (normalized.includes('zetaris.files') || normalized.includes('parquet')) {
    federatedSources.push('zetaris.files.sales_parquet (Amazon S3 Parquet)');
    pushdownEngines.push('Parquet Columnar Pushdown (Vectorized RowGroup Pruning)');
  }
  if (normalized.includes('zetaris.api') || normalized.includes('stripe')) {
    federatedSources.push('zetaris.api.stripe_charges (Stripe REST API)');
    pushdownEngines.push('HTTP Streaming JSON Virtualizer');
  }
  if (normalized.includes('snowflake')) {
    federatedSources.push('zetaris.snowflake.dim_accounts (Snowflake)');
    pushdownEngines.push('Snowflake Remote Warehouse Delegator');
  }

  // Fallback defaults if query is simple or generic
  if (federatedSources.length === 0) {
    federatedSources.push('zetaris.postgres.customers', 'zetaris.files.sales_parquet');
    pushdownEngines.push('In-Memory Hash Join Optimizer');
  }

  return {
    executionTimeMs: 16,
    federatedSourcesInvolved: federatedSources,
    pushdownEngines,
    columns: ['customer_name', 'email', 'loyalty_tier', 'total_spend', 'charge_status', 'source_breakdown'],
    rows: [
      {
        customer_name: 'Sophia Bennett',
        email: 'sophia.b@apexcloud.io',
        loyalty_tier: 'Platinum',
        total_spend: '$4,820.00',
        charge_status: 'succeeded',
        source_breakdown: 'Postgres (Profile) + Parquet (Orders) + Stripe (Live API)',
      },
      {
        customer_name: 'Marcus Vance',
        email: 'mvance@hyperion.tech',
        loyalty_tier: 'Gold',
        total_spend: '$2,450.50',
        charge_status: 'succeeded',
        source_breakdown: 'Postgres (Profile) + Parquet (Orders) + Stripe (Live API)',
      },
      {
        customer_name: 'Elena Rostova',
        email: 'elena@novasystems.de',
        loyalty_tier: 'Diamond',
        total_spend: '$11,900.00',
        charge_status: 'succeeded',
        source_breakdown: 'Postgres (Profile) + Parquet (Orders) + Stripe (Live API)',
      },
      {
        customer_name: 'Kaito Tanaka',
        email: 'ktanaka@globalcorp.jp',
        loyalty_tier: 'Gold',
        total_spend: '$3,180.25',
        charge_status: 'succeeded',
        source_breakdown: 'Postgres (Profile) + Parquet (Orders) + Stripe (Live API)',
      },
      {
        customer_name: 'Amara Okafor',
        email: 'aokafor@lagosfintech.ng',
        loyalty_tier: 'Platinum',
        total_spend: '$6,250.00',
        charge_status: 'succeeded',
        source_breakdown: 'Postgres (Profile) + Parquet (Orders) + Stripe (Live API)',
      },
    ],
  };
}

