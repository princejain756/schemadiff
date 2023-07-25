import { joinPointer } from '../pointers';
import type { Rule, SchemaChange } from '../types';

export const propertiesRule: Rule = {
  id: 'properties',
  apply({ path, left, right }): SchemaChange[] {
    const before = propertyNames(left.properties);
    const after = propertyNames(right.properties);

    const removesProperty = right.additionalProperties !== false;
    const changes: SchemaChange[] = [];

    for (const name of before.filter((name) => !after.includes(name)).sort()) {
      changes.push({
        rule: propertiesRule.id,
        path: joinPointer(path, 'properties', name),
        severity: removesProperty ? 'non-breaking' : 'breaking',
        message: removesProperty
          ? `property "${name}" was removed, additional properties are still accepted`
          : `property "${name}" was removed and additionalProperties is false, instances using it are rejected`,
        before: left.properties?.[name],
      });
    }

    for (const name of after.filter((name) => !before.includes(name)).sort()) {
      changes.push({
        rule: propertiesRule.id,
        path: joinPointer(path, 'properties', name),
        severity: 'non-breaking',
        message: `property "${name}" was added`,
        after: right.properties?.[name],
      });
    }

    return changes;
  },
};

function propertyNames(properties: Record<string, unknown> | undefined): string[] {
  return properties === undefined ? [] : Object.keys(properties);
}
