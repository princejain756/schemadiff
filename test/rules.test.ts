import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { additionalPropertiesRule, enumRule, propertiesRule, requiredRule, typeRule } from '../src/rules';
import { boundsRule } from '../src/rules/bounds';
import type { JsonSchema, Rule, SchemaChange } from '../src/types';

const run = (rule: Rule, left: JsonSchema, right: JsonSchema): SchemaChange[] =>
  rule.apply({ path: '#', left, right });

const severities = (changes: SchemaChange[]): string[] => changes.map((change) => change.severity);

describe('type rule', () => {
  it('reports a narrowed type as breaking', () => {
    const changes = run(typeRule, { type: ['string', 'number'] }, { type: 'string' });
    assert.deepEqual(severities(changes), ['breaking']);
  });

  it('reports a widened type as non-breaking', () => {
    const changes = run(typeRule, { type: 'string' }, { type: ['string', 'null'] });
    assert.deepEqual(severities(changes), ['non-breaking']);
  });

  it('reports an added type constraint as breaking', () => {
    const changes = run(typeRule, {}, { type: 'object' });
    assert.equal(changes.length, 1);
    assert.equal(changes[0]?.severity, 'breaking');
  });

  it('ignores a reordered but equal type union', () => {
    assert.deepEqual(run(typeRule, { type: ['string', 'null'] }, { type: ['null', 'string'] }), []);
  });
});

describe('enum rule', () => {
  it('reports removed values as breaking and added values as non-breaking', () => {
    const changes = run(enumRule, { enum: ['a', 'b'] }, { enum: ['b', 'c'] });
    assert.deepEqual(severities(changes), ['breaking', 'non-breaking']);
  });

  it('compares enum members structurally', () => {
    assert.deepEqual(run(enumRule, { enum: [{ a: 1 }] }, { enum: [{ a: 1 }] }), []);
  });

  it('reports a newly introduced enum as breaking', () => {
    const changes = run(enumRule, {}, { enum: ['a'] });
    assert.deepEqual(severities(changes), ['breaking']);
  });
});

describe('required rule', () => {
  it('reports added names as breaking one change per property', () => {
    const changes = run(requiredRule, { required: [] }, { required: ['a', 'b'] });
    assert.equal(changes.length, 2);
    assert.deepEqual(severities(changes), ['breaking', 'breaking']);
  });

  it('reports removed names as non-breaking', () => {
    const changes = run(requiredRule, { required: ['a'] }, { required: [] });
    assert.deepEqual(severities(changes), ['non-breaking']);
  });
});

describe('properties rule', () => {
  it('reports an added property as non-breaking', () => {
    const changes = run(propertiesRule, { properties: {} }, { properties: { a: { type: 'string' } } });
    assert.deepEqual(severities(changes), ['non-breaking']);
  });

  it('points at the property itself', () => {
    const changes = run(propertiesRule, { properties: {} }, { properties: { 'a/b': { type: 'string' } } });
    assert.equal(changes[0]?.path, '#/properties/a~1b');
  });
});

describe('additionalProperties rule', () => {
  it('reports a tightening as breaking', () => {
    assert.deepEqual(severities(run(additionalPropertiesRule, { additionalProperties: true }, { additionalProperties: false })), [
      'breaking',
    ]);
  });

  it('reports a loosening as non-breaking', () => {
    assert.deepEqual(severities(run(additionalPropertiesRule, { additionalProperties: false }, { additionalProperties: true })), [
      'non-breaking',
    ]);
  });

  it('treats a schema and true as loosenings of each other', () => {
    assert.deepEqual(severities(run(additionalPropertiesRule, { additionalProperties: { type: 'string' } }, { additionalProperties: true })), [
      'non-breaking',
    ]);
  });

  it('ignores an unchanged value', () => {
    assert.deepEqual(run(additionalPropertiesRule, { additionalProperties: false }, { additionalProperties: false }), []);
  });
});

describe('bounds rule', () => {
  it('treats a raised minimum as breaking', () => {
    assert.deepEqual(severities(run(boundsRule, { minimum: 1 }, { minimum: 2 })), ['breaking']);
  });

  it('treats a raised maximum as non-breaking', () => {
    assert.deepEqual(severities(run(boundsRule, { maximum: 10 }, { maximum: 20 })), ['non-breaking']);
  });

  it('reports each keyword that changed separately', () => {
    const changes = run(boundsRule, { minLength: 1, maxLength: 10 }, { minLength: 3, maxLength: 5 });
    assert.deepEqual(
      changes.map((change) => change.path),
      ['#/minLength', '#/maxLength'],
    );
  });
});
