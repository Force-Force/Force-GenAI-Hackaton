import { describe, expect, it } from 'vitest';
import { runValidations, countByType } from './validationRules';
import type { PipelineEdge, PipelineNode } from '../types/pipeline';

function resource(
  id: string,
  overrides: Partial<PipelineNode['data']> = {},
): PipelineNode {
  return {
    id,
    type: 'resource',
    position: { x: 0, y: 0 },
    data: {
      category: 'resource',
      kind: 'warehouse',
      label: id,
      description: '',
      columns: [],
      ...overrides,
    },
  } as PipelineNode;
}

describe('runValidations', () => {
  it('flags tables without a primary key as an error', () => {
    const nodes = [
      resource('NoPk', {
        columns: [{ name: 'a', type: 'INT', isPrimaryKey: false, isForeignKey: false }],
      }),
    ];
    const result = runValidations(nodes, []);
    const pk = result.find((r) => r.category === 'keys');
    expect(pk?.type).toBe('error');
    expect(pk?.message).toContain('NoPk');
  });

  it('passes the primary key audit when all tables have a PK', () => {
    const nodes = [
      resource('WithPk', {
        columns: [{ name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
      }),
    ];
    const result = runValidations(nodes, []);
    expect(result.find((r) => r.category === 'keys')?.type).toBe('success');
  });

  it('warns about an unlinked fact table', () => {
    const nodes = [
      resource('FactSales', {
        warehouseRole: 'fact',
        columns: [{ name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
      }),
    ];
    const result = runValidations(nodes, []);
    expect(result.find((r) => r.category === 'relationships')?.type).toBe('warning');
  });

  it('recognizes a linked fact table', () => {
    const nodes = [
      resource('FactSales', {
        warehouseRole: 'fact',
        columns: [{ name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
      }),
      resource('DimDate', {
        columns: [{ name: 'date_key', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
      }),
    ];
    const edges: PipelineEdge[] = [
      { id: 'e1', source: 'FactSales', target: 'DimDate' },
    ];
    const result = runValidations(nodes, edges);
    expect(result.find((r) => r.category === 'relationships')?.type).toBe('success');
    // DimDate also satisfies the calendar reference check.
    expect(result.find((r) => r.category === 'standards')?.type).toBe('success');
  });

  it('counts results by type', () => {
    const items = runValidations(
      [resource('NoPk', { columns: [{ name: 'a', type: 'INT', isPrimaryKey: false, isForeignKey: false }] })],
      [],
    );
    const counts = countByType(items);
    expect(counts.error).toBeGreaterThanOrEqual(1);
  });
});
