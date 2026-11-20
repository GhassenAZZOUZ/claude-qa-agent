---
name: flaky-triage
description: WAY 13 — find flaky tests across recent runs and quarantine them so they stop producing false bug reports. Use when the user says "flaky", "find flaky tests", "triage flaky", "quarantine", or after repeated unexplained failures.
---

# WAY 13 — Flaky Test Triage

## Phase 1: Aggregate
From the directory containing `playwright.config.ts` (normally `qa-artifacts/`):

```bash
node "${CLAUDE_PLUGIN_ROOT}/.claude/skills/flaky-triage/flaky.mjs" runs <window=10> .
```

The script reads the last N `runs/*/results.json` and prints, per scenario: its outcome history, flips, flip rate, a verdict (`flaky` | `consistent-fail` | `stable-pass` | `insufficient-data`), `changedDuringWindow` (the `.feature`/`.steps.ts` changed after the window started), and `unquarantine` (a quarantined test with 10 straight passes). Outcomes that say nothing about stability are excluded from the counts: `no-baseline` (first visual run) and `network`.

If there are fewer than 3 runs, say so and suggest scheduling `e2e-session` runs (or `ci-test-setup`) first.

## Phase 2: Judge (don't just trust the flip rate)

For each `flaky` scenario, read the error messages in its history:
- **`@race` or `@known-gap` scenario** → never quarantined. A `@race` scenario fails only when it reproduces the defect it hunts: that's a bug to file (`bug-report`), not flakiness. A `@known-gap` scenario that flips is reported to the user against its ticket (the gap may be intermittent, or the known-gap step sits before a flaky precondition)
- **Same error each time it fails** (timing, a race, animation) → real flakiness. Propose quarantine
- **Different errors** → the app or data was changing between runs, not flakiness. Leave it alone
- **`changedDuringWindow: true`** → the flips may be your own edits. Re-run triage after a few stable runs
- **`consistent-fail`** isn't flaky. It's a real failure: point to `e2e-session`/`bug-report`

## Phase 3: Quarantine (with the user's approval, per test)
1. Add `@quarantine` to the scenario's tag line in its `.feature` (keep the watermark header)
2. File an issue labeled `flaky-test` (`issue.create`) with the history table, the suspected cause, and a fix suggestion (a wait-for condition instead of a timeout, test data isolation, disabling animations). This is a **test** issue, not a product bug
3. Quarantined tests keep running. Callers just don't file bugs for them (`quarantined: true` in results), so triage can see when they stabilize

**Unquarantine:** for every `unquarantine: true` scenario, propose removing the tag and closing its `flaky-test` issue.

## Phase 4: Report
Save `./qa-artifacts/sessions/flaky-<YYYY-MM-DD>.md` (with the watermark footer): a table of scenario · history · flip rate · verdict · action, plus the totals.
