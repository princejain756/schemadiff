import { joinPointer } from '../pointers';
import type { Rule, SchemaChange } from '../types';

export const enumRule: Rule = {
  id: 'enum',
  apply({ path, left, right }): SchemaChange[] {
    const before = values(left.enum);
    const after = values(right.enum);
    if (before === undefined && after === undefined) return [];
    if (before !== undefined && after === undefined) {
      return [
        {
          rule: enumRule.id,
          path: joinPointer(path, 'enum'),
          severity: 'non-breaking',
          message: `enum constraint removed, ${format(before)} are no longer restricted`,
          before: left.enum,
        },
      ];
    }
    if (before === undefined || after === undefined) {
      return [
        {
          rule: enumRule.id,
          path: joinPointer(path, 'enum'),
          severity: 'breaking',
          message: `enum constraint added, instances are now limited to ${format(after ?? [])}`,
          after: right.enum,
        },
      ];
    }

    const afterKeys = new Set(after.map(keyOf));
    const beforeKeys = new Set(before.map(keyOf));
    const removed = before.filter((value) => !afterKeys.has(keyOf(value)));
    const added = after.filter((value) => !beforeKeys.has(keyOf(value)));
    const pointer = joinPointer(path, 'enum');

    const changes: SchemaChange[] = [];
    if (removed.length > 0) {
      changes.push({
        rule: enumRule.id,
        path: pointer,
        severity: 'breaking',
        message: `values removed from enum, ${format(removed)} ${removed.length === 1 ? 'is' : 'are'} no longer accepted`,
        before: left.enum,
        after: right.enum,
      });
    }
    if (added.length > 0) {
      changes.push({
        rule: enumRule.id,
        path: pointer,
        severity: 'non-breaking',
        message: `values added to enum, ${format(added)} ${added.length === 1 ? 'is' : 'are'} now accepted`,
        before: left.enum,
        after: right.enum,
      });
    }
    return changes;
  },
};

function values(input: unknown): unknown[] | undefined {
  return Array.isArray(input) ? input : undefined;
}

function keyOf(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function format(values: readonly unknown[]): string {
  return values.map((value) => keyOf(value)).join(', ');
}
