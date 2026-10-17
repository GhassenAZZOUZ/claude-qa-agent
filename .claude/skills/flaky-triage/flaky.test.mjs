// Unit tests for flaky.mjs. Run from the repo root: node --test .claude/skills/flaky-triage/
// Each case in __fixtures__/<case>/runs/ is a set of small Playwright results.json files.
// flaky.mjs runs as a child process, exactly as the flaky-triage skill calls it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, 'flaky.mjs');
const fixture = name => path.join(here, '__fixtures__', name);

const exec = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

function triage(caseName, ...args) {
  const r = exec(path.join(fixture(caseName), 'runs'), ...args);
  assert.equal(r.status, 0, `flaky.mjs exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function scenario(out, title) {
  const s = out.scenarios.find(x => x.title === title);
  assert.ok(s, `no scenario "${title}" in output`);
  return s;
}

test('AC-01: mixed pass/fail history is flaky', () => {
  const s = scenario(triage('flaky'), 'Mixed history');
  assert.equal(s.verdict, 'flaky');
  assert.equal(s.flips, 2);
  assert.equal(s.flipRate, 1);
  assert.deepEqual(s.history.map(h => h.outcome), ['pass', 'fail', 'pass']);
});

test('AC-02: all-fail history is consistent-fail, and a run with zero tests is harmless', () => {
  const out = triage('consistent-fail');
  assert.equal(out.window, 4);
  const s = scenario(out, 'Always fails');
  assert.equal(s.verdict, 'consistent-fail');
  assert.equal(s.flips, 0);
  assert.equal(s.counted, 3);
  assert.equal(s.history[0].error, 'Error: expect(locator).toHaveText(expected) failed', 'error keeps only the first line');
});

test('AC-03: all-pass history is stable-pass, and skipped results are ignored', () => {
  const s = scenario(triage('stable-pass'), 'Always passes');
  assert.equal(s.verdict, 'stable-pass');
  assert.equal(s.flips, 0);
  assert.equal(s.history.length, 3);
});

test('AC-04: fewer than 3 counted outcomes is insufficient-data (boundary 2 / 3)', () => {
  const out = triage('insufficient-data');
  assert.equal(scenario(out, 'Two outcomes').verdict, 'insufficient-data');
  assert.equal(scenario(out, 'Two outcomes').counted, 2);
  assert.equal(scenario(out, 'Three outcomes').verdict, 'stable-pass');
});

test('AC-05: baseline-creation runs count toward neither flips nor the 3-outcome minimum', () => {
  const out = triage('no-baseline');
  const s = scenario(out, 'Baseline then stable');
  assert.equal(s.history[1].outcome, 'no-baseline');
  assert.equal(s.verdict, 'stable-pass');
  assert.equal(s.flips, 0);
  assert.equal(s.counted, 3);
  assert.equal(scenario(out, 'Baseline in short history').verdict, 'insufficient-data');
});

test('AC-06: network errors count toward neither flips nor the 3-outcome minimum', () => {
  const out = triage('network');
  const s = scenario(out, 'Network blip in failures');
  assert.equal(s.history[1].outcome, 'network');
  assert.equal(s.verdict, 'consistent-fail');
  assert.equal(s.flips, 0);
  assert.equal(scenario(out, 'Network blip in short history').verdict, 'insufficient-data');
});

test('AC-07: flips, flipRate rounding and sort by flipRate descending', () => {
  const out = triage('flip-rate');
  const a = scenario(out, 'Scenario A');
  const b = scenario(out, 'Scenario B');
  assert.equal(a.flips, 2);
  assert.equal(a.flipRate, 0.67);
  assert.equal(b.flips, 2);
  assert.equal(b.flipRate, 1);
  assert.deepEqual(out.scenarios.map(s => s.title), ['Scenario B', 'Scenario A']);
});

test('AC-08: only the newest `window` runs count, ordered by stats.startTime', () => {
  const windowed = triage('window', '3');
  assert.equal(windowed.window, 3);
  // Folder names sort in reverse time order, so this proves ordering uses startTime
  assert.deepEqual(windowed.runs, ['run-c', 'run-b', 'run-a']);
  assert.equal(scenario(windowed, 'Recovered').verdict, 'stable-pass');

  const all = triage('window');
  assert.equal(all.window, 5);
  assert.deepEqual(all.runs, ['run-e', 'run-d', 'run-c', 'run-b', 'run-a']);
  assert.equal(scenario(all, 'Recovered').verdict, 'flaky');
});

test('AC-11: a missing runs folder gives a one-line error and exit 1', () => {
  const missing = path.join(here, '__fixtures__', 'does-not-exist', 'runs');
  const r = exec(missing);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /runs folder not found: .*does-not-exist/);
  assert.equal(r.stderr.trim().split('\n').length, 1, `expected one line, got:\n${r.stderr}`);
});

test('AC-11: a malformed results.json gives a one-line error naming the file and exit 1', () => {
  const r = exec(path.join(fixture('malformed'), 'runs'));
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /malformed results\.json: .*malformed.*results\.json/);
  assert.equal(r.stderr.trim().split('\n').length, 1, `expected one line, got:\n${r.stderr}`);
});

test('AC-12: unquarantine needs @quarantine and 10 straight counted passes', () => {
  const out = triage('unquarantine');
  assert.equal(scenario(out, 'Quarantined, 10 passes').unquarantine, true);
  assert.equal(scenario(out, 'Quarantined, one fail').unquarantine, false);
  assert.equal(scenario(out, 'Quarantined, 9 passes').unquarantine, false);
  assert.equal(scenario(out, 'Not quarantined, 10 passes').unquarantine, false);
});

test('AC-13: changedDuringWindow compares .feature / .steps.ts mtimes with the first run start', () => {
  const demo = path.join(fixture('changed-during-window'), 'test-cases', 'demo');
  const old = new Date('2020-01-01T00:00:00Z');
  const recent = new Date('2026-10-02T00:00:00Z'); // after the first run (2026-10-01T08:00Z)
  const touch = (file, when) => fs.utimesSync(path.join(demo, file), when, when);
  touch('feature-edited.feature', recent);
  touch('untouched.feature', old);
  touch('untouched.steps.ts', old);
  touch('steps-edited.feature', old);
  touch('steps-edited.steps.ts', recent);

  const out = triage('changed-during-window');
  assert.equal(scenario(out, 'Feature edited').changedDuringWindow, true);
  assert.equal(scenario(out, 'Untouched').changedDuringWindow, false);
  assert.equal(scenario(out, 'Steps edited').changedDuringWindow, true);
});
