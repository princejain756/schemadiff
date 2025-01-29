import { describePointer } from './pointers';
import type { CompareResult, SchemaChange } from './types';

const RESET = '\u001b[0m';
const RED = '\u001b[31m';
const GREEN = '\u001b[32m';
const DIM = '\u001b[2m';

type Paint = (text: string, tone?: string) => string;

export interface FormatOptions {
  before?: string;
  after?: string;
  color?: boolean;
}

/** Human readable report, the default CLI output. */
export function formatText(result: CompareResult, options: FormatOptions = {}): string {
  const paint = painter(options.color === true);
  const lines: string[] = [];

  if (options.before !== undefined || options.after !== undefined) {
    lines.push(`${paint('before:', DIM)} ${options.before ?? '(inline)'}`);
    lines.push(`${paint('after: ', DIM)} ${options.after ?? '(inline)'}`);
    lines.push('');
  }

  if (result.changes.length === 0) {
    lines.push(paint('no changes', GREEN));
    return `${lines.join('\n')}\n`;
  }

  const sections = [section('breaking', result.breaking, RED, paint), section('non-breaking', result.nonBreaking, GREEN, paint)];
  lines.push(...sections.filter((entry) => entry !== ''));
  lines.push(summary(result, paint));

  return `${lines.join('\n').trimEnd()}\n`;
}

function section(
  title: string,
  changes: readonly SchemaChange[],
  tone: string,
  paint: Paint,
): string {
  if (changes.length === 0) return '';
  const rows = changes.map((change) => {
    const where = describePointer(change.path);
    return `  ${paint('●', tone)} ${where}  ${change.message}`;
  });
  return [`${paint(title, tone)} (${changes.length})`, ...rows, ''].join('\n');
}

function summary(result: CompareResult, paint: Paint): string {
  const total = result.changes.length;
  const noun = total === 1 ? 'change' : 'changes';
  const verdict = result.ok ? paint('compatible', GREEN) : paint('breaking changes present', RED);
  return `${total} ${noun}: ${result.breaking.length} breaking, ${result.nonBreaking.length} non-breaking — ${verdict}`;
}

function painter(enabled: boolean): Paint {
  return (text, tone) => (enabled && tone !== undefined ? `${tone}${text}${RESET}` : text);
}

/** Machine readable report for `--json`. */
export function formatJson(result: CompareResult): string {
  return `${JSON.stringify(serialize(result), null, 2)}\n`;
}

export function serialize(result: CompareResult): Record<string, unknown> {
  return {
    ok: result.ok,
    changes: result.changes.map((change) => ({
      rule: change.rule,
      path: change.path,
      severity: change.severity,
      message: change.message,
      ...(change.before === undefined ? {} : { before: change.before }),
      ...(change.after === undefined ? {} : { after: change.after }),
    })),
    summary: {
      total: result.changes.length,
      breaking: result.breaking.length,
      nonBreaking: result.nonBreaking.length,
    },
  };
}
