import { joinPointer } from './pointers';
import { defaultRules } from './rules';
import type { CompareOptions, CompareResult, JsonSchema, Rule, SchemaChange, Severity } from './types';

/** Guards against pathological or cyclic documents. */
const MAX_DEPTH = 64;

/**
 * Compare two JSON Schema documents and collect every difference the registered
 * rules can see.
 *
 * The document root is compared first, then the walk descends into the
 * `properties` of matching names and into `items`, so nested changes are
 * reported at their own pointers.
 */
export function compareSchemas(
  left: JsonSchema,
  right: JsonSchema,
  options: CompareOptions = {},
): CompareResult {
  const ignore = new Set(options.ignore ?? []);
  const rules = defaultRules.filter((rule) => !ignore.has(rule.id));
  const strict = options.strict === true;
  const changes = walk('#', left, right, rules, strict, 0);
  const breaking = changes.filter((change) => change.severity === 'breaking');
  const nonBreaking = changes.filter((change) => change.severity === 'non-breaking');

  return { changes, breaking, nonBreaking, ok: breaking.length === 0 };
}

function walk(
  path: string,
  left: JsonSchema,
  right: JsonSchema,
  rules: readonly Rule[],
  strict: boolean,
  depth: number,
): SchemaChange[] {
  if (depth > MAX_DEPTH) return [];

  const changes: SchemaChange[] = [];
  for (const rule of rules) {
    for (const change of rule.apply({ path, left, right })) {
      const severity: Severity = strict ? 'breaking' : change.severity;
      changes.push({ ...change, severity });
    }
  }

  for (const name of sharedPropertyNames(left, right)) {
    const before = left.properties?.[name];
    const after = right.properties?.[name];
    if (!isSchema(before) || !isSchema(after)) continue;
    changes.push(...walk(joinPointer(path, 'properties', name), before, after, rules, strict, depth + 1));
  }

  if (isSchema(left.items) && isSchema(right.items)) {
    changes.push(...walk(joinPointer(path, 'items'), left.items, right.items, rules, strict, depth + 1));
  }

  return changes;
}

function sharedPropertyNames(left: JsonSchema, right: JsonSchema): string[] {
  const before = left.properties;