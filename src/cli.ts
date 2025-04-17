import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compareSchemas } from './compare';
import { formatJson, formatText } from './format';
import type { CompareOptions } from './types';

export const EXIT_COMPATIBLE = 0;
export const EXIT_BREAKING = 1;
export const EXIT_ERROR = 2;

const USAGE = `schemadiff — compare two JSON Schema documents

Usage:
  schemadiff <before.json> <after.json> [options]

Options:
  --json              print a machine readable report
  --strict            treat every change as breaking
  --ignore <list>     comma separated rule ids to skip
  --no-color          disable colored output
  -h, --help          print this message
  -v, --version       print the version

Exit codes:
  0  the after schema is backward compatible with the before schema
  1  breaking changes were found
  2  the input could not be read or parsed
`;

interface Arguments {
  before: string;
  after: string;
  json: boolean;
  strict: boolean;
  color: boolean;
  ignore: string[];
}

/** Entry point used by the `schemadiff` bin. Returns the process exit code. */
export function main(argv: readonly string[]): number {
  let parsed: Arguments;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    if (error instanceof HelpRequested) {
      process.stdout.write(USAGE);
      return EXIT_COMPATIBLE;
    }
    if (error instanceof VersionRequested) {
      process.stdout.write(`${version()}\n`);
      return EXIT_COMPATIBLE;
    }
    process.stderr.write(`schemadiff: ${describeError(error)}\n\n${USAGE}`);
    return EXIT_ERROR;
  }

  let result;
  try {
    const before = readDocument(parsed.before);
    const after = readDocument(parsed.after);
    const options: CompareOptions = { strict: parsed.strict, ignore: parsed.ignore };
    result = compareSchemas(before, after, options);
  } catch (error) {
    process.stderr.write(`schemadiff: ${describeError(error)}\n`);
    return EXIT_ERROR;
  }

  const output = parsed.json
    ? formatJson(result)
    : formatText(result, { before: parsed.before, after: parsed.after, color: parsed.color });
  process.stdout.write(output);

  return result.ok ? EXIT_COMPATIBLE : EXIT_BREAKING;
}

/** Minimal `--flag value` parser; no dependencies, no surprises. */
export function parseArguments(argv: readonly string[]): Arguments {
  const positional: string[] = [];
  const ignore: string[] = [];
  let json = false;
  let strict = false;
  let color = true;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;

    if (argument === '-h' || argument === '--help') throw new HelpRequested();
    if (argument === '-v' || argument === '--version') throw new VersionRequested();

    if (argument === '--json') {
      json = true;
      continue;
    }
    if (argument === '--strict') {
      strict = true;
      continue;
    }
    if (argument === '--no-color') {
      color = false;
      continue;
    }
    if (argument === '--ignore') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new Error('--ignore requires a comma separated list of rule ids');
      }
      index += 1;
      ignore.push(...splitList(value));
      continue;
    }
    if (argument.startsWith('--ignore=')) {
      ignore.push(...splitList(argument.slice('--ignore='.length)));
      continue;
    }
    if (argument.startsWith('-') && argument !== '-') {
      throw new Error(`unknown option ${argument}`);
    }

    positional.push(argument);
  }

  if (positional.length !== 2) {
    throw new Error('expected two schema files, got ' + positional.length);
  }

  const [before, after] = positional;
  if (before === undefined || after === undefined) {
    throw new Error('expected two schema files');
  }

  return { before, after, json, strict, color: color && supportsColor(), ignore };
}

class HelpRequested extends Error {}
class VersionRequested extends Error {}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

function readDocument(path: string): Record<string, unknown> {
  const source = readFileSync(path, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path} does not contain a JSON Schema object`);
  }
  return parsed as Record<string, unknown>;
}

function supportsColor(): boolean {
  return process.stdout.isTTY === true && process.env['NO_COLOR'] === undefined;
}

function version(): string {
  try {
    const manifest = readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8');
    const parsed = JSON.parse(manifest) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
