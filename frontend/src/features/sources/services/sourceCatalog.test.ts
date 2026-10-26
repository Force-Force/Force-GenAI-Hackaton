import { describe, expect, it } from 'vitest';
import {
  inferParquetSchema,
  inferApiSchema,
  executeZetarisFederatedQuery,
  sanitizeIdentifier,
  ZETARIS_VIRTUAL_CATALOG,
  DATABASE_CATALOG_PRESETS,
} from './sourceCatalog';

describe('sourceCatalog', () => {
  describe('sanitizeIdentifier', () => {
    it('normalizes dirty identifiers to snake_case', () => {
      expect(sanitizeIdentifier('My Raw Table! #1')).toBe('my_raw_table_1');
      expect(sanitizeIdentifier('  leading_trailing_ ')).toBe('leading_trailing');
      expect(sanitizeIdentifier('')).toBe('source_table');
    });
  });

  describe('inferParquetSchema', () => {
    it('infers schema for events parquet', () => {
      const meta = inferParquetSchema('clickstream_events.parquet');
      expect(meta.tableName).toBe('clickstream_events');
      expect(meta.columns.some((c) => c.name === 'event_id')).toBe(true);
      expect(meta.codec).toBe('ZSTD');
      expect(meta.rowGroups).toBeGreaterThan(0);
    });

    it('infers schema for transactions parquet', () => {
      const meta = inferParquetSchema('sales_2026.parquet');
      expect(meta.tableName).toBe('sales_2026');
      expect(meta.columns.some((c) => c.name === 'transaction_id')).toBe(true);
      expect(meta.codec).toBe('SNAPPY');
    });
  });

  describe('inferApiSchema', () => {
    it('infers Stripe schema from stripe endpoint URL', () => {
      const result = inferApiSchema('https://api.stripe.com/v1/charges');
      expect(result.tableName).toBe('api_stripe_charges');
      expect(result.columns.some((c) => c.name === 'charge_id')).toBe(true);
    });

    it('infers custom schema from provided JSON sample', () => {
      const sample = JSON.stringify({
        data: [{ id: 101, username: 'kyler', balance: 99.5, is_active: true }]
      });
      const result = inferApiSchema('https://api.example.com/users', sample);
      expect(result.columns.some((c) => c.name === 'username')).toBe(true);
      expect(result.columns.find((c) => c.name === 'id')?.isPrimaryKey).toBe(true);
    });
  });

  describe('Zetaris Virtualization', () => {
    it('has unified virtual tables for databases, files, and APIs', () => {
      expect(ZETARIS_VIRTUAL_CATALOG.length).toBeGreaterThanOrEqual(4);
      const formats = ZETARIS_VIRTUAL_CATALOG.map((t) => t.sourceFormat);
      expect(formats).toContain('parquet');
      expect(formats).toContain('csv');
      expect(formats).toContain('postgresql');
      expect(formats).toContain('snowflake');
      expect(formats).toContain('api');
    });

    it('executes federated queries combining multiple source engines without separate connectors', () => {
      const query = `
        SELECT c.name, p.amount, s.status 
        FROM zetaris.postgres.customers c 
        JOIN zetaris.files.sales_parquet p ON c.id = p.customer_id
        JOIN zetaris.api.stripe_charges s ON c.id = s.customer_id
      `;
      const result = executeZetarisFederatedQuery(query);
      expect(result.federatedSourcesInvolved.length).toBeGreaterThanOrEqual(2);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeLessThan(100);
    });

    it('has catalog presets for PostgreSQL, MySQL, and Snowflake', () => {
      expect(DATABASE_CATALOG_PRESETS.postgresql.length).toBeGreaterThan(0);
      expect(DATABASE_CATALOG_PRESETS.snowflake.length).toBeGreaterThan(0);
      expect(DATABASE_CATALOG_PRESETS.mysql.length).toBeGreaterThan(0);
    });
  });
});

