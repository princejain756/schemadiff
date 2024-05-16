import { joinPointer } from '../pointers';
import type { Rule, SchemaChange } from '../types';

export const itemsRule: Rule = {
  id: 'items',
  apply({ path, left, right }): SchemaChange[] {
    const before = left.items;
    const after = right.items;
    if (before === after) return [];

    const pointer = joinPointer(path, 'items');

    if (before === undefined && after !== undefined) {
      return [
        {
          rule: itemsRule.id,
          path: pointer,
          severity: 'breaking',
          message: 'array items are now constrained by a schema',
          after,
        },
      ];
    }

    if (before !== undefined && after === undefined) {
      return [
        {
          rule: itemsRule.id,
          path: pointer,
          severity: 'non-breaking',
          message: 'array items are no longer constrained by a schema',
          before,
        },
      ];
    }

    return [];
  },
};
