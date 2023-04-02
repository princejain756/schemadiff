import { joinPointer } from './pointers';
import { defaultRules } from './rules';
import type { JsonSchema, Rule, SchemaChange } from './types';

/** Guards against pathological or cyclic documents. */
const MAX_DEPTH = 64;

/**
 * Compare two JSON Schema documents and collect every difference the
 * registered rules can see.
 *
 * The document root is compared first, then the walk descends into the
 * `properties` of matching names and into `items`, so nested changes are
 * reported at their own pointers.
 */
export function compareSchemas(left: JsonSchema, right: JsonSchema): SchemaChange[] {
  return walk('#', left, right, defaultRules, 0);
}

function walk(
  path: string,
  left: JsonSchema,
  right: JsonSchema,
  rules: readonly Rule[],
  depth: number,
): SchemaChange[] {
  if (depth > MAX_DEPTH) return [];

  const changes: SchemaChange[] = [];
  for (const rule of rules) {
    changes.push(...rule.apply({ path, left, right }));
  }

  for (const name of sharedPropertyNames(left, right)) {
    const before = left.properties?.[name];
    const after = right.properties?.[name];
    if (!isSchema(before) || !isSchema(after)) continue;
    changes.push(...walk(joinPointer(path, 'properties', name), before, after, rules, depth + 1));
  }

  if (isSchema(left.items) && isSchema(right.items)) {
    changes.push(...walk(joinPointer(path, 'items'), left.items, right.items, rules, depth + 1));
  }

  return changes;
}

function sharedPropertyNames(left: JsonSchema, right: JsonSchema): string[] {
  const before = left.properties;
  if (typeof before !== 'object' || before === null) return [];
  return Object.keys(before).filter((name) => isSchema(right.properties?.[name])).sort();
}

function isSchema(input: unknown): input is JsonSchema {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
