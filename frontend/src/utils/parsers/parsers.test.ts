import { describe, expect, it } from 'vitest';
import { parseCsv } from './csvParser';
import { parseSqlDdl } from './sqlDdlParser';

describe('parseCsv', () => {
  it('extracts columns from a header and infers types', () => {
    const csv = 'id,name,amount,active\n1,Acme,100.50,true\n2,Globex,250.00,false';
    const result = parseCsv(csv, { tableName: 'orders' });
    expect(result.ok).toBe(true);
    expect(result.tableName).toBe('orders');
    expect(result.rowCount).toBe(2);
    const byName = Object.fromEntries(result.columns.map((c) => [c.name, c.type]));
    expect(byName.id).toBe('INT');
    expect(byName.amount).toBe('DECIMAL(12,2)');
    expect(byName.active).toBe('BOOLEAN');
    expect(byName.name).toContain('VARCHAR');
  });

  it('marks the first column as the primary key', () => {
    const result = parseCsv('id,name\n1,a');
    expect(result.columns[0].isPrimaryKey).toBe(true);
    expect(result.columns[1].isPrimaryKey).toBe(false);
  });

  it('sanitizes messy header names', () => {
    const result = parseCsv('Order ID,Total $\n1,2');
    expect(result.columns[0].name).toBe('order_id');
    expect(result.columns[1].name).toBe('total');
  });

  it('reports an error for empty input', () => {
    const result = parseCsv('');
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('parseSqlDdl', () => {
  it('parses a CREATE TABLE statement with an inline primary key', () => {
    const sql = 'CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100), country VARCHAR(50));';
    const result = parseSqlDdl(sql);
    expect(result.ok).toBe(true);
    expect(result.tables).toHaveLength(1);
    const table = result.tables[0];
    expect(table.name).toBe('customers');
    expect(table.columns.map((c) => c.name)).toEqual(['id', 'name', 'country']);
    expect(table.columns.find((c) => c.name === 'id')?.isPrimaryKey).toBe(true);
  });

  it('parses multiple statements', () => {
    const sql =
      'CREATE TABLE a (id INT PRIMARY KEY); CREATE TABLE b (id INT PRIMARY KEY, a_id INT);';
    const result = parseSqlDdl(sql);
    expect(result.tables.map((t) => t.name).sort()).toEqual(['a', 'b']);
  });

  it('reports an error when there is no CREATE TABLE', () => {
    const result = parseSqlDdl('SELECT * FROM users;');
    expect(result.ok).toBe(false);
  });

  it('reports an error for invalid SQL', () => {
    const result = parseSqlDdl('CREATE TABLE (((');
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
