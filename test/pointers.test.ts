import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describePointer, joinPointer, unescapeToken } from '../src/pointers';

describe('pointers', () => {
  it('escapes the two reserved characters', () => {
    assert.equal(joinPointer('#', 'a/b'), '#/a~1b');
    assert.equal(joinPointer('#', 'a~b'), '#/a~0b');
  });

  it('round-trips escaped tokens', () => {
    assert.equal(unescapeToken('a~1b'), 'a/b');
    assert.equal(unescapeToken('a~0b'), 'a~b');
  });

  it('builds nested pointers from the root fragment', () => {
    assert.equal(joinPointer('#', 'properties', 'id'), '#/properties/id');
    assert.equal(joinPointer('#/properties/id', 'type'), '#/properties/id/type');
  });

  it('describes the root pointer', () => {
    assert.equal(describePointer('#'), '(root)');
    assert.equal(describePointer('#/properties/owner/required'), 'properties.owner.required');
  });

  it('describes a pointer with escaped tokens', () => {
    assert.equal(describePointer('#/properties/a~1b'), 'properties.a/b');
  });
});
