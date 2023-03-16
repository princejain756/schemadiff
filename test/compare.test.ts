import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareSchemas } from '../src/compare';

describe('compareSchemas', () => {
  it('reports no changes for identical documents', () => {
    assert.deepEqual(compareSchemas({ type: 'string' }, { type: 'string' }), []);
  });

  it('reports a narrowed type as breaking', () => {
    const changes = compareSchemas({ type: ['string', 'number'] }, { type: 'string' });
    assert.equal(changes.length, 1);
    assert.equal(changes[0]?.severity, 'breaking');
    assert.match(changes[0]?.message ?? '', /narrowed/);
  });

  it('reports a widened type as non-breaking', () => {
    const changes = compareSchemas({ type: 'string' }, { type: ['string', 'null'] });
    assert.equal(changes.length, 1);
    assert.equal(changes[0]?.severity, 'non-breaking');
    assert.match(changes[0]?.message ?? '', /widened/);
  });

  it('reports an added type constraint as breaking', () => {
    const changes = compareSchemas({}, { type: 'object' });
    assert.equal(changes.length, 1);
    assert.equal(changes[0]?.message, 'type constraint added, instances are now limited to "object"');
  });

  it('points at the keyword that changed', () => {
    const changes = compareSchemas({ type: 'string' }, { type: 'number' });
    assert.equal(changes[0]?.path, '#/type');
  });

  it('ignores a reordered but equal type union', () => {
    assert.deepEqual(compareSchemas({ type: ['string', 'null'] }, { type: ['null', 'string'] }), []);
  });
});
