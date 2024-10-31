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