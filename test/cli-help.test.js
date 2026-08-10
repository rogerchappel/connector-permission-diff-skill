import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('CLI help entrypoint prints usage', () => {
  const result = spawnSync(process.execPath, ['./src/cli.js', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout + result.stderr, /Usage:/);
  assert.match(result.stdout + result.stderr, /Empty action lists are rejected\./);
  assert.match(result.stdout + result.stderr, /Blank required strings are rejected\./);
  assert.match(result.stdout + result.stderr, /Markdown cell delimiters and line breaks are escaped\./);
});

test('CLI entrypoint reports argument errors without internal stacks', () => {
  const cases = [
    [['--manifest'], '--manifest requires a value.'],
    [['--policy', '--format', 'json'], '--policy requires a value.'],
    [['--format', 'json', '--format', 'markdown'], '--format may only be specified once.']
  ];

  for (const [args, message] of cases) {
    const result = spawnSync(process.execPath, ['./src/cli.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, `${message}\n`);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
});
