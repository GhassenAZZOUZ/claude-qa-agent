// Flaky-test triage: aggregates the last N Playwright JSON reports per scenario.
// Usage: node flaky.mjs <runs-dir> [window=10] [project-root=<runs-dir>/..]
// Prints JSON: { window, runs: [...ids], scenarios: [{ key, feature, title, project, tags, history, ... }] }
import fs from 'fs';
import path from 'path';

const [runsDir, windowArg = '10', rootArg] = process.argv.slice(2);
if (!runsDir) { console.error('usage: node flaky.mjs <runs-dir> [window] [project-root]'); process.exit(2); }
const root = rootArg ?? path.dirname(path.resolve(runsDir));
// Bad input gets one readable line naming the path, not a stack trace
const fail = msg => { console.error(`flaky.mjs: ${msg}`); process.exit(1); };
if (!fs.existsSync(runsDir) || !fs.statSync(runsDir).isDirectory()) fail(`runs folder not found: ${runsDir}`);
const readReport = file => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { fail(`malformed results.json: ${file} (${e.message.split('\n')[0]})`); }
};

const NETWORK = /net::ERR_|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|getaddrinfo|socket hang up|page\.goto: Timeout|apiRequestContext\.\w+: connect/;
const NO_BASELINE = /A snapshot doesn't exist/;

const runs = fs.readdirSync(runsDir)
  .map(id => ({ id, file: path.join(runsDir, id, 'results.json') }))
  .filter(r => fs.existsSync(r.file))
  .map(r => ({ ...r, report: readReport(r.file) }))
  .map(r => ({ ...r, start: Date.parse(r.report.stats?.startTime ?? 0) }))
  .sort((a, b) => a.start - b.start)
  .slice(-Number(windowArg));

const scenarios = new Map();
const walk = (suite, run) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const last = t.results.at(-1);
      if (!last || last.status === 'skipped') continue;
      const msg = last.error?.message ?? '';
      const outcome = last.status === 'passed' ? 'pass'
        : NO_BASELINE.test(msg) ? 'no-baseline'
        : NETWORK.test(msg) ? 'network'
        : 'fail';
      // .features-gen/<project>/<path>.feature.spec.js -> <path>.feature
      const feature = spec.file.replace(/\\/g, '/').replace(/^\.features-gen\/[^/]+\//, '').replace(/\.spec\.js$/, '');
      const key = `${t.projectName}|${feature}|${spec.title}`;
      if (!scenarios.has(key)) scenarios.set(key, { key, feature, title: spec.title, project: t.projectName, tags: spec.tags, history: [] });
      scenarios.get(key).history.push({ run: run.id, outcome, error: outcome === 'pass' ? null : msg.split('\n')[0].slice(0, 200) });
    }
  }
  for (const child of suite.suites ?? []) walk(child, run);
};
for (const run of runs) for (const s of run.report.suites ?? []) walk(s, run);

const firstStart = runs[0]?.start ?? 0;
const out = [...scenarios.values()].map(s => {
  // Baseline creation and network errors say nothing about product stability — exclude them
  const seq = s.history.map(h => h.outcome).filter(o => o === 'pass' || o === 'fail');
  let flips = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) flips++;
  const passes = seq.filter(o => o === 'pass').length;
  const fails = seq.length - passes;
  let changedDuringWindow = false;
  for (const f of [s.feature, s.feature.replace(/\.feature$/, '.steps.ts')]) {
    const p = path.join(root, f);
    if (fs.existsSync(p) && fs.statSync(p).mtimeMs > firstStart) changedDuringWindow = true;
  }
  const flipRate = seq.length > 1 ? flips / (seq.length - 1) : 0;
  const verdict = seq.length < 3 ? 'insufficient-data'
    : passes === seq.length ? 'stable-pass'
    : fails === seq.length ? 'consistent-fail'
    : 'flaky';
  // Unquarantine candidate: quarantined, and the last 10 counted outcomes are all passes
  const recent = seq.slice(-10);
  const unquarantine = s.tags.includes('quarantine') && recent.length === 10 && recent.every(o => o === 'pass');
  return { ...s, counted: seq.length, passes, fails, flips, flipRate: +flipRate.toFixed(2), verdict, changedDuringWindow, unquarantine };
}).sort((a, b) => b.flipRate - a.flipRate);

console.log(JSON.stringify({ window: runs.length, runs: runs.map(r => r.id), scenarios: out }, null, 2));
