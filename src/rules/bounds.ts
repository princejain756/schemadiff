import { joinPointer } from '../pointers';
import type { Rule, SchemaChange } from '../types';

interface Bound {
  keyword: 'minimum' | 'maximum' | 'minLength' | 'maxLength' | 'minItems' | 'maxItems' | 'minProperties' | 'maxProperties';
  /** `true` when a larger value is more restrictive. */
  higherIsTighter: boolean;
}

const BOUNDS: readonly Bound[] = [
  { keyword: 'minimum', higherIsTighter: true },
  { keyword: 'maximum', higherIsTighter: false },
  { keyword: 'minLength', higherIsTighter: true },
  { keyword: 'maxLength', higherIsTighter: false },
  { keyword: 'minItems', higherIsTighter: true },
  { keyword: 'maxItems', higherIsTighter: false },
  { keyword: 'minProperties', higherIsTighter: true },
  { keyword: 'maxProperties', higherIsTighter: false },
];

export const boundsRule: Rule = {
  id: 'bounds',
  apply({ path, left, right }): SchemaChange[] {
    const changes: SchemaChange[] = [];

    for (const bound of BOUNDS) {
      const before = numeric(left[bound.keyword]);
      const after = numeric(right[bound.keyword]);
      if (before === after) continue;

      const change = describe(bound, before, after);
      changes.push({
        rule: boundsRule.id,
        path: joinPointer(path, bound.keyword),
        severity: change.severity,
        message: change.message,
        ...(before === undefined ? {} : { before }),
        ...(after === undefined ? {} : { after }),
      });
    }

    return changes;
  },
};

function describe(
  bound: Bound,
  before: number | undefined,
  after: number | undefined,
): { severity: 'breaking' | 'non-breaking'; message: string } {
  const { keyword, higherIsTighter } = bound;

  if (before === undefined) {
    return { severity: 'breaking', message: `${keyword} constraint added, limit is now ${after}` };
  }
  if (after === undefined) {
    return { severity: 'non-breaking', message: `${keyword} constraint removed, limit was ${before}` };
  }

  const tighter = higherIsTighter ? after > before : after < before;
  const verb = tighter ? 'tightened' : 'loosened';
  return {
    severity: tighter ? 'breaking' : 'non-breaking',
    message: `${keyword} ${verb} from ${before} to ${after}`,
  };
}

function numeric(input: unknown): number | undefined {
  return typeof input === 'number' && Number.isFinite(input) ? input : undefined;
}
