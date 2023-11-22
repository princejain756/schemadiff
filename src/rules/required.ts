import { joinPointer } from '../pointers';
import type { Rule, SchemaChange } from '../types';

export const requiredRule: Rule = {
  id: 'required',
  apply({ path, left, right }): SchemaChange[] {
    const before = names(left.required);
    const after = names(right.required);

    const added = after.filter((name) => !before.includes(name)).sort();
    const removed = before.filter((name) => !after.includes(name)).sort();
    const pointer = joinPointer(path, 'required');

    const changes: SchemaChange[] = [];
    for (const name of added) {
      changes.push({
        rule: requiredRule.id,
        path: pointer,
        severity: 'breaking',
        message: `property "${name}" became required`,
        after: name,
      });
    }
    for (const name of removed) {
      changes.push({
        rule: requiredRule.id,
        path: pointer,
        severity: 'non-breaking',
        message: `property "${name}" is no longer required`,
        before: name,
      });
    }
    return changes;
  },
};

function names(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((entry): entry is string => typeof entry === 'string');
}
