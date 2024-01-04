import { joinPointer } from '../pointers';
import type { JsonSchema, Rule, SchemaChange } from '../types';

export const additionalPropertiesRule: Rule = {
  id: 'additionalProperties',
  apply({ path, left, right }): SchemaChange[] {
    const before = mode(left.additionalProperties);
    const after = mode(right.additionalProperties);
    if (before === after) return [];

    const pointer = joinPointer(path, 'additionalProperties');
    const acceptsMore = allowed(after) >= allowed(before);

    return [
      {
        rule: additionalPropertiesRule.id,
        path: pointer,
        severity: acceptsMore ? 'non-breaking' : 'breaking',
        message: acceptsMore
          ? `additionalProperties loosened from ${label(before)} to ${label(after)}, undeclared properties are accepted`
          : `additionalProperties tightened from ${label(before)} to ${label(after)}, undeclared properties are rejected`,
        before: left.additionalProperties,
        after: right.additionalProperties,
      },
    ];
  },
};

function mode(input: JsonSchema['additionalProperties']): string {
  if (input === undefined) return 'schema';
  if (typeof input === 'boolean') return `boolean:${input}`;
  return 'schema';
}

/** How permissive each mode is, used to decide which direction is breaking. */
function allowed(mode: string): number {
  switch (mode) {
    case 'boolean:true':
      return 2;
    case 'boolean:false':
      return 0;
    default:
      return 1;
  }
}

function label(mode: string): string {
  switch (mode) {
    case 'boolean:true':
      return 'true';
    case 'boolean:false':
      return 'false';
    default:
      return 'a schema';
  }
}
