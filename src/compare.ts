import type { JsonSchema, SchemaChange } from './types';

/**
 * Compare two JSON Schema documents and report every difference.
 *
 * The root of each document is inspected keyword by keyword. Nested schemas are
 * visited once the comparison is split up into rules; see `src/rules/`.
 */
export function compareSchemas(left: JsonSchema, right: JsonSchema): SchemaChange[] {
  return [
    ...compareType(left, right),
    ...compareEnum(left, right),
    ...compareRequired(left, right),
    ...compareProperties(left, right),
  ];
}

function compareType(left: JsonSchema, right: JsonSchema): SchemaChange[] {
  const before = typeList(left.type);
  const after = typeList(right.type);
  if (before === undefined && after === undefined) return [];

  if (before === undefined) {
    return [
      {
        rule: 'type',
        path: pointer('type'),
        severity: 'breaking',
        message: `type constraint added, instances are now limited to ${typeText(after ?? [])}`,
        after: right.type,
      },
    ];
  }

  if (after === undefined) {
    return [
      {
        rule: 'type',
        path: pointer('type'),
        severity: 'non-breaking',
        message: `type constraint removed, ${typeText(before)} was previously required`,
        before: left.type,
      },
    ];
  }

  if (before.length === after.length && before.every((type) => after.includes(type))) return [];

  const widened = before.every((type) => after.includes(type));
  return [
    {
      rule: 'type',
      path: pointer('type'),
      severity: widened ? 'non-breaking' : 'breaking',
      message: `type ${widened ? 'widened' : 'narrowed'} from ${typeText(before)} to ${typeText(after)}`,
      before: left.type,
      after: right.type,
    },
  ];
}

function compareEnum(left: JsonSchema, right: JsonSchema): SchemaChange[] {
  const before = enumList(left.enum);
  const after = enumList(right.enum);
  const changes: SchemaChange[] = [];

  if (before === undefined && after === undefined) return changes;

  if (before === undefined) {
    return [
      {
        rule: 'enum',
        path: pointer('enum'),
        severity: 'breaking',
        message: `enum constraint added, instances are now limited to ${valueText(after ?? [])}`,
        after: right.enum,
      },
    ];
  }

  if (after === undefined) {
    return [
      {
        rule: 'enum',
        path: pointer('enum'),
        severity: 'non-breaking',
        message: `enum constraint removed, ${valueText(before)} are no longer restricted`,
        before: left.enum,
      },
    ];
  }

  const beforeKeys = new Set(before.map(valueKey));
  const afterKeys = new Set(after.map(valueKey));
  const removed = before.filter((value) => !afterKeys.has(valueKey(value)));
  const added = after.filter((value) => !beforeKeys.has(valueKey(value)));

  if (removed.length > 0) {
    changes.push({
      rule: 'enum',
      path: pointer('enum'),
      severity: 'breaking',
      message: `values removed from enum, ${valueText(removed)} are no longer accepted`,
      before: left.enum,
      after: right.enum,
    });
  }

  if (added.length > 0) {
    changes.push({
      rule: 'enum',
      path: pointer('enum'),
      severity: 'non-breaking',
      message: `values added to enum, ${valueText(added)} are now accepted`,
      before: left.enum,
      after: right.enum,
    });
  }

  return changes;
}

function compareRequired(left: JsonSchema, right: JsonSchema): SchemaChange[] {
  const before = nameList(left.required);
  const after = nameList(right.required);
  const changes: SchemaChange[] = [];

  for (const name of after.filter((entry) => !before.includes(entry)).sort()) {
    changes.push({
      rule: 'required',
      path: pointer('required'),
      severity: 'breaking',
      message: `property "${name}" became required`,
      after: name,
    });
  }

  for (const name of before.filter((entry) => !after.includes(entry)).sort()) {
    changes.push({
      rule: 'required',
      path: pointer('required'),
      severity: 'non-breaking',
      message: `property "${name}" is no longer required`,
      before: name,
    });
  }

  return changes;
}

function compareProperties(left: JsonSchema, right: JsonSchema): SchemaChange[] {
  const before = names(left.properties);
  const after = names(right.properties);
  const closed = right.additionalProperties === false;
  const changes: SchemaChange[] = [];

  for (const name of before.filter((entry) => !after.includes(entry)).sort()) {
    changes.push({
      rule: 'properties',
      path: `#/properties/${name}`,
      severity: closed ? 'breaking' : 'non-breaking',
      message: closed
        ? `property "${name}" was removed and additionalProperties is false, instances using it are rejected`
        : `property "${name}" was removed, additional properties are still accepted`,
      before: left.properties?.[name],
    });
  }

  for (const name of after.filter((entry) => !before.includes(entry)).sort()) {
    changes.push({
      rule: 'properties',
      path: `#/properties/${name}`,
      severity: 'non-breaking',
      message: `property "${name}" was added`,
      after: right.properties?.[name],
    });
  }

  return changes;
}

function pointer(keyword: string): string {
  return `#/${keyword}`;
}

function typeList(input: unknown): string[] | undefined {
  if (typeof input === 'string') return [input];
  if (!Array.isArray(input)) return undefined;
  const types = input.filter((entry): entry is string => typeof entry === 'string');
  return types.length > 0 ? types : undefined;
}

function typeText(types: readonly string[]): string {
  return types.length === 1 ? `"${types[0]}"` : `(${types.map((type) => `"${type}"`).join(' | ')})`;
}

function enumList(input: unknown): unknown[] | undefined {
  return Array.isArray(input) ? input : undefined;
}

function valueKey(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function valueText(values: readonly unknown[]): string {
  return values.map((value) => valueKey(value)).join(', ');
}

function nameList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((entry): entry is string => typeof entry === 'string');
}

function names(input: Record<string, unknown> | undefined): string[] {
  return input === undefined ? [] : Object.keys(input);
}
