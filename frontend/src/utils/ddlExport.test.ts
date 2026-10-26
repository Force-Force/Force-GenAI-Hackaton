import { describe, expect, it } from 'vitest';
import { exportSchemaToSql } from './ddlExport';
import type { PipelineEdge, PipelineNode } from '../types/pipeline';

const fact: PipelineNode = {
  id: 'FactSales',
  type: 'resource',
  position: { x: 0, y: 0 },
  data: {
    category: 'resource',
    kind: 'warehouse',
    label: 'FactSales',
    description: 'Sales fact',
    warehouseRole: 'fact',
    columns: [
      { name: 'sales_key', type: 'INT', isPrimaryKey: true, isForeignKey: false },
      { name: 'date_key', type: 'INT', isPrimaryKey: false, isForeignKey: true },
    ],
  },
};

const dim: PipelineNode = {
  id: 'DimDate',
  type: 'resource',
  position: { x: 0, y: 0 },
  data: {
    category: 'resource',
    kind: 'warehouse',
    label: 'DimDate',
    description: 'Date dim',
    warehouseRole: 'dimension',
    columns: [{ name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
  },
};

const processing: PipelineNode = {
  id: 'proc',
  type: 'processing',
  position: { x: 0, y: 0 },
  data: {
    category: 'processing',
    language: 'sql',
    label: 'transform',
    description: '',
    code: 'SELECT 1',
    inputColumns: [],
    outputColumns: [],
  },
};

describe('exportSchemaToSql', () => {
  it('emits CREATE TABLE for resource nodes only', () => {
    const sql = exportSchemaToSql('Proj', [fact, dim, processing], []);
    expect(sql).toContain('CREATE TABLE FactSales');
    expect(sql).toContain('CREATE TABLE DimDate');
    expect(sql).not.toContain('CREATE TABLE transform');
  });

  it('marks primary keys', () => {
    const sql = exportSchemaToSql('Proj', [fact], []);
    expect(sql).toMatch(/sales_key\s+INT PRIMARY KEY/);
  });

  it('emits foreign key constraints from edges between resources', () => {
    const edges: PipelineEdge[] = [
      {
        id: 'e1',
        source: 'FactSales',
        target: 'DimDate',
        data: { fromColumn: 'date_key', toColumn: 'date_key' },
      },
    ];
    const sql = exportSchemaToSql('Proj', [fact, dim], edges);
    expect(sql).toContain('ALTER TABLE FactSales ADD CONSTRAINT');
    expect(sql).toContain('FOREIGN KEY (date_key) REFERENCES DimDate(date_key)');
  });

  it('includes the project name header', () => {
    expect(exportSchemaToSql('MyProject', [], [])).toContain('Project: MyProject');
  });
});
