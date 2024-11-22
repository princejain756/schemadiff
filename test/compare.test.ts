import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareSchemas } from '../src/compare';
import type { JsonSchema } from '../src/types';

const objectWith = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({
  type: 'object',
  properties,
  required,
});

describe('compareSchemas', () => {
  it('reports no changes for identical documents', () => {
    const schema = objectWith({ id: { type: 'string' } }, ['id']);
    const result = compareSchemas(schema, schema);

    assert.deepEqual(result.changes, []);
    assert.equal(result.ok, true);
  });

  it('flags an added required property as breaking', () => {
    const before = objectWith({ id: { type: 'string' } }, ['id']);
    const after = objectWith({ id: { type: 'string' }, email: { type: 'string' } }, ['id', 'email']);
    const result = compareSchemas(before, after);

    const change = result.changes.find((entry) => entry.rule === 'required');
    assert.ok(change, 'expected a required rule change');
    assert.equal(change.severity, 'breaking');
    assert.equal(change.message, 'property "email" became required');
    assert.equal(result.ok, false);
  });

  it('flags a removed property as non-breaking when additionalProperties allows extras', () => {
    const before = objectWith({ id: { type: 'string' }, legacy: { type: 'boolean' } });
    const after = objectWith({ id: { type: 'string' } });
    const result = compareSchemas({ ...before, additionalProperties: true }, { ...after, additionalProperties: true });

    const change = result.changes.find((entry) => entry.rule === 'properties');
    assert.ok(change);
    assert.equal(change.severity, 'non-breaking');
    assert.equal(change.path, '#/properties/legacy');
  });

  it('flags a removed property as breaking when additionalProperties is false', () => {
    const before = { ...objectWith({ legacy: { type: 'boolean' } }), additionalProperties: false };
    const after = { ...objectWith({}), additionalProperties: false };
    const result = compareSchemas(before, after);

    const change = result.changes.find((entry) => entry.rule === 'properties');
    assert.ok(change);
    assert.equal(change.severity, 'breaking');
  });

  it('walks nested properties and reports the nested pointer', () => {
    const before = objectWith({
      owner: objectWith({ name: { type: 'string', minLength: 1 } }),
    });
    const after = objectWith({
      owner: objectWith({ name: { type: 'string', minLength: 4 } }),
    });
    const result = compareSchemas(before, after);

    assert.equal(result.changes.length, 1);
    const change = result.changes[0];
    assert.ok(change);
    assert.equal(change.path, '#/properties/owner/properties/name/minLength');
    assert.equal(change.severity, 'breaking');
  });

  it('walks array items', () => {
    const before: JsonSchema = { type: 'array', items: { type: 'string' } };
    const after: JsonSchema = { type: 'array', items: { type: 'number' } };
    const result = compareSchemas(before, after);

    assert.equal(result.changes.length, 1);
    assert.equal(result.changes[0]?.path, '#/items/type');
  });

  it('skips rules named in ignore', () => {
    const before: JsonSchema = { type: 'string', minLength: 1 };