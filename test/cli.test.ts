import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { EXIT_BREAKING, EXIT_COMPATIBLE, EXIT_ERROR, main } from '../src/cli';

const cli = join(__dirname, '..', 'src', 'cli.js');

function fixture(name: string, document: unknown): string {
  const directory = mkdtempSync(join(tmpdir(), 'schemadiff-'));
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify(document, null, 2));
  return path;
}

function capture(): { restore(): string } {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  return {
    restore() {
      process.stdout.write = original;
      return chunks.join('');
    },
  };
}

const BEFORE = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
};

const AFTER_BREAKING = {
  type: 'object',
  required: ['id', 'email'],
  properties: { id: { type: 'string' }, email: { type: 'string' } },
};

describe('cli exit codes', () => {
  it('exits 0 when the schemas are compatible', () => {
    const before = fixture('before.json', BEFORE);
    const after = fixture('after.json', { ...BEFORE, properties: { ...BEFORE.properties, email: { type: 'string' } } });
    assert.equal(main([before, after]), EXIT_COMPATIBLE);
  });

  it('exits 1 when a breaking change is found', () => {
    const before = fixture('before.json', BEFORE);
    const after = fixture('after.json', AFTER_BREAKING);
    assert.equal(main([before, after]), EXIT_BREAKING);
  });

  it('exits 2 when an input file is missing', () => {
    const after = fixture('after.json', BEFORE);
    assert.equal(main([join(tmpdir(), 'nope-does-not-exist.json'), after]), EXIT_ERROR);
  });

  it('exits 2 when an input file is not valid JSON', () => {
    const before = fixture('before.json', BEFORE);
    const broken = join(mkdtempSync(join(tmpdir(), 'schemadiff-')), 'broken.json');
    writeFileSync(broken, '{ not json');
    assert.equal(main([before, broken]), EXIT_ERROR);
  });

  it('exits 2 when only one path is given', () => {
    assert.equal(main(['only-one.json']), EXIT_ERROR);
  });
});

describe('cli output', () => {
  it('prints json that reflects the changes', () => {
    const before = fixture('before.json', BEFORE);
    const after = fixture('after.json', AFTER_BREAKING);
    const stream = capture();
    main([before, after, '--json', '--no-color']);
    const parsed = JSON.parse(stream.restore()) as { ok: boolean; summary: { breaking: number } };
    assert.equal(parsed.ok, false);
    assert.equal(parsed.summary.breaking, 1);
  });

  it('turns every change into a breaking one with --strict', () => {
    const before = fixture('before.json', BEFORE);
    const after = fixture('after.json', { ...BEFORE, properties: { ...BEFORE.properties, email: { type: 'string' } } });
    const stream = capture();
    const code = main([before, after, '--strict', '--no-color']);
    stream.restore();
    assert.equal(code, EXIT_BREAKING);
  });

  it('skips rules named with --ignore', () => {
    const before = fixture('before.json', BEFORE);
    const after = fixture('after.json', AFTER_BREAKING);
    assert.equal(main([before, after, '--ignore', 'required,properties', '--no-color']), EXIT_COMPATIBLE);
  });

  it('runs as a bin and propagates the exit code', () => {
    const before = fixture('before.json', BEFORE);
    const after = fixture('after.json', AFTER_BREAKING);
    const child = spawnSync(process.execPath, [cli, before, after, '--json'], { encoding: 'utf8' });
    assert.equal(child.status, EXIT_BREAKING);
    assert.equal(JSON.parse(child.stdout).ok, false);
  });
});
