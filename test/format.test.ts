import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatJson, formatText, serialize } from '../src/format';
import { compareSchemas } from '../src/compare';
import type { JsonSchema } from '../src/types';

describe('formatText', () => {
  const result = compareSchemas(
    { type: 'object', required: [] },
    { type: 'object', required: ['id'] },
  );

  it('lists breaking changes with their location', () => {
    const output = formatText(result);
    assert.match(output, /breaking \(1\)/);
    assert.match(output, /required {2}property "id" became required/);
  });

  it('summarizes the verdict', () => {
    assert.match(formatText(result), /1 change: 1 breaking, 0 non-breaking — breaking changes present/);
  });

  it('reports a clean comparison', () => {
    const same = compareSchemas({ type: 'string' }, { type: 'string' });
    assert.equal(formatText(same), 'no changes\n');
  });

  it('omits escape codes unless color is requested', () => {
    assert.equal(formatText(result).includes('\u001b['), false);
    assert.equal(formatText(result, { color: true }).includes('\u001b[31m'), true);
  });
});

describe('formatJson', () => {
  it('produces parseable output with a summary', () => {
    const result = compareSchemas({ type: 'string' }, { type: ['string', 'number'] });
    const parsed = JSON.parse(formatJson(result)) as {
      ok: boolean;
      summary: { total: number; breaking: number; nonBreaking: number };
      changes: Array<{ rule: string; path: string; severity: string }>;
    };

    assert.equal(parsed.ok, true);
    assert.equal(parsed.summary.total, 1);
    assert.equal(parsed.summary.breaking, 0);
    assert.equal(parsed.changes[0]?.rule, 'type');
    assert.equal(parsed.changes[0]?.path, '#/type');
  });

  it('keeps before and after values for machine consumers', () => {
    const before: JsonSchema = { type: 'string', enum: ['a', 'b'] };
    const after: JsonSchema = { type: 'string', enum: ['a'] };
    const serialized = serialize(compareSchemas(before, after)) as {
      changes: Array<{ before?: unknown; after?: unknown }>;
    };

    assert.deepEqual(serialized.changes[0]?.before, ['a', 'b']);
    assert.deepEqual(serialized.changes[0]?.after, ['a']);
  });

  it('ends with a trailing newline', () => {
    const output = formatJson(compareSchemas({}, {}));
    assert.equal(output.endsWith('\n'), true);
  });
});
