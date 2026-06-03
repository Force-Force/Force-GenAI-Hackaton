import {
  isResourceNode,
  type PipelineEdge,
  type PipelineNode,
  type ValidationItem,
} from '../types/pipeline';

/**
 * Pure schema validation over the pipeline graph. Returns a fresh list of
 * validation items; it never mutates inputs. Extracted from the original
 * App.handleValidateWarehouse so it can be unit tested in isolation.
 */
export function runValidations(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): ValidationItem[] {
  const checks: ValidationItem[] = [];
  const resources = nodes.filter(isResourceNode);
  const stamp = Date.now();

  // Primary key rule.
  const missingPk = resources
    .filter((n) => n.data.columns.length > 0)
    .filter((n) => !n.data.columns.some((c) => c.isPrimaryKey))
    .map((n) => n.data.label);

  if (missingPk.length > 0) {
    checks.push({
      id: `val_pk_${stamp}`,
      type: 'error',
      message: `Primary Key Failure: [ ${missingPk.join(', ')} ] have no primary key. Star schemas require unique surrogate keys.`,
      category: 'keys',
    });
  } else {
    checks.push({
      id: `val_pk_${stamp}`,
      type: 'success',
      message: 'Primary Key Audit: all resource tables declare a surrogate primary key.',
      category: 'keys',
    });
  }

  // Fact relationship rule.
  const factNodes = resources.filter((n) => n.data.warehouseRole === 'fact');
  if (factNodes.length > 0) {
    const fact = factNodes[0];
    const linked = edges.some(
      (e) => e.source === fact.id || e.target === fact.id,
    );
    checks.push(
      linked
        ? {
            id: `val_fact_${stamp}`,
            type: 'success',
            message: 'Star Schema Junction: central fact table is related to dimension keys.',
            category: 'relationships',
          }
        : {
            id: `val_fact_${stamp}`,
            type: 'warning',
            message: `Unlinked Fact: "${fact.data.label}" has no relationships. Connect dimension foreign keys.`,
            category: 'relationships',
          },
    );
  }

  // Date dimension rule.
  const hasDate = resources.some((n) => {
    const id = n.id.toLowerCase();
    const label = n.data.label.toLowerCase();
    return (
      id.includes('date') ||
      id.includes('calendar') ||
      label.includes('date') ||
      label.includes('calendar')
    );
  });
  checks.push(
    hasDate
      ? {
          id: `val_date_${stamp}`,
          type: 'success',
          message: 'Standard Calendar Reference present in the model.',
          category: 'standards',
        }
      : {
          id: `val_date_${stamp}`,
          type: 'warning',
          message: 'Date Dimension Missing: trend analysis benefits from a DimDate table.',
          category: 'standards',
        },
  );

  return checks;
}

export function countByType(items: ValidationItem[]) {
  return {
    success: items.filter((i) => i.type === 'success').length,
    warning: items.filter((i) => i.type === 'warning').length,
    error: items.filter((i) => i.type === 'error').length,
  };
}
