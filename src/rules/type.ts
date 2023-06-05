import { joinPointer } from '../pointers';
import type { JsonSchema, Rule, SchemaChange } from '../types';

export const typeRule: Rule = {
  id: 'type',
  apply({ path, left, right }): SchemaChange[] {
    const before = normalize(left.type);
    const after = normalize(right.type);
    if (before === undefined && after === undefined) return [];

    const pointer = joinPointer(path, 'type');

    if (before === undefined && after !== undefined) {
      return [
        {
          rule: typeRule.id,
          path: pointer,
          severity: 'breaking',
          message: `type constraint added, instances are now limited to ${format(after)}`,
          after: right.type,
        },
      ];
    }

    if (before !== undefined && after === undefined) {
      return [
        {
          rule: typeRule.id,
          path: pointer,
          severity: 'non-breaking',
          message: `type constraint removed, ${format(before)} was previously required`,
          before: left.type,
        },
      ];
    }

    if (before === undefined || after === undefined) return [];
    if (before.length === after.length && before.every((type) => after.includes(type))) return [];

    const narrowed = after.every((type) => before.includes(type));
    const widened = before.every((type) => after.includes(type));
    const severity = widened && !narrowed ? 'non-breaking' : 'breaking';
    const direction = severity === 'non-breaking' ? 'widened' : 'narrowed';

    return [
      {
        rule: typeRule.id,
        path: pointer,
        severity,
        message: `type ${direction} from ${format(before)} to ${format(after)}`,
        before: left.type,
        after: right.type,
      },
    ];
  },
};

function normalize(type: JsonSchema['type']): string[] | undefined {
  if (typeof type === 'string') return [type];
  if (!Array.isArray(type)) return undefined;
  const types = type.filter((entry): entry is string => typeof entry === 'string');
  return types.length > 0 ? types : undefined;
}

function format(types: readonly string[]): string {
  return types.length === 1 ? `"${types[0]}"` : `(${types.map((type) => `"${type}"`).join(' | ')})`;
}
