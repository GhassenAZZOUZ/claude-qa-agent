---
name: review-plan
description: WAY 20 — independent review of a test plan before it's approved. Use when the user says "review plan", "review the plan", "review test plan", "plan review", "improve the plan" with a plan ref or path. Scores the plan out of 100 with evidence, proposes test cases to add, remove, merge or modify (each with its reason and technique), applies the ones the user picks without breaking AC coverage, and sends the plan back for approval. `plan it` runs it automatically.
---

# WAY 20 — Review a Test Plan

`plan it` (WAY 19) designs the plan; this WAY checks it with a second pair of eyes before a human approves it. The reviewer, `test-plan-reviewer`, is a different agent from the one that wrote the plan, and it only proposes. **Nothing changes until the user picks.**

## Step 1: Gather inputs
**Required (ask if missing):** `Plan:` (a `test-plan` issue ref or a plan path). "The plan" or "the last plan" means the newest file in `qa-artifacts/test-plans/`: name it back to the user.
**Optional:** `budget: <minutes>` for the P0+P1 tests that run on every MR/PR (default `QA_PLAN_BUDGET_MIN` from `.env`, else 10) · `history: off` (skip bug and flaky history).

## Phase 1: Read
1. Read the plan per the `test-plan` skill's **Reading a plan** (an issue body is authoritative; a body without `## Planned tests` isn't a plan: stop and say so)
2. The requirements: when `**Source:**` is an issue ref, `issue.get` it (ACs, Gherkin, Missing Information). Otherwise the plan's own `## Requirements` table is the source

## Phase 2: Context
1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/plan-check.mjs <plan> --estimate --budget <minutes>`. Keep the whole output: errors, warnings and the `⏱` lines
2. Unless `history: off`:
   - **Bugs**: `issue.list` with label `bug`, state closed, text = the plan's test folder name, then again with the source ref. Keep those closed in the last 90 days: ref, title, area, root cause if the body states one
   - **Flaky**: if `qa-artifacts/runs/` has ≥ 3 runs, `node "${CLAUDE_PLUGIN_ROOT}/.claude/skills/flaky-triage/flaky.mjs" runs 10 .` from `qa-artifacts/`, and keep the scenarios of the plan's test folder with verdict `flaky`
   - Neither source available: say "no history" in the review, and carry on

## Phase 3: Review
Run `test-plan-reviewer` with the plan, the requirements, the `plan-check.mjs` output, the history and the plan's `## Review log`. It returns a scorecard, proposals (`A1` add, `R1` remove, `G1` merge, `M1` modify) and a summary line.

## Phase 4: Show and ask
Show the scorecard and the proposals table. If the score is below 70, add one line: *"Score <n>/100: read the proposals before approving."* It's a warning, never a block. Then ask:

*"Apply all, apply by ID (e.g. A1,R2), or none?"*

With `plan: auto` (unattended, from WAY 1/4), don't ask and apply nothing: the proposals go in the review comment for a human to pick later.

## Phase 5: Apply
1. Save a copy of the plan as it is now (`qa-artifacts/test-plans/.<plan-name>.before.md`)
2. Apply the picked proposals per the `test-plan` skill's **Changing a plan**:
   - **ADD**: a new Planned tests row with the proposal's ID, fields and priority tag
   - **REMOVE**: the row moves to `## Retired` with the reason
   - **MERGE**: the lowest ID becomes the Outline row (`… (Outline: N rows)`), the others move to Retired ("merged into Test#<nn>")
   - **MODIFY**: change the named field; the tags follow the level and priority
   - Update `## Coverage` for every requirement touched
3. Check the floor: `node ${CLAUDE_PLUGIN_ROOT}/scripts/plan-check.mjs <plan> --against <the copy>`. For each `coverage floor` or `disappeared` error, undo the proposal that caused it, tell the user why (*"R2 not applied: AC-02 would have no negative test"*), and run the check again until it passes
4. Append one line to `## Review log` (create the section above `## Retired` if missing):

   ```markdown
   ## Review log
   | Date | Score | Applied | Rejected |
   |---|---|---|---|
   | 2026-11-05 | 74/100 | A1, A2, R1 | M1 (user: the UI message differs from the API's) |
   ```
   "Rejected" lists what the user didn't pick, with their reason when they gave one. The reviewer reads it next time and doesn't propose those again (convergence)
5. If anything was applied: `**Status:** awaiting-approval`, `issue.update(ref, body, labels+ [plan-awaiting-approval], labels- [plan-approved, plan-auto-approved])` (a full replace, watermark included). The plan goes back for approval: never mark it approved here
6. If the user picked none: only the Review log line changes. Status and rows stay as they were (an approved plan stays approved)
7. `issue.comment(plan ref, <scorecard + proposals, then "Applied: … · Rejected: …">)`. A local-only plan has no issue: save the review as `qa-artifacts/test-plans/<plan-name>.review-<YYYY-MM-DD>.md` instead
8. If the plan's test folder already has files, list what `write it Plan: <ref>` will add, and the retired IDs whose files `plan-check.mjs` will flag. Never delete test files here

## Report
The score, what was applied and refused, the floor result, the run-time line, and the next step: approve the plan (`plan it Plan: <ref> approve`, or the `plan-approved` label), then `write it Plan: <ref>` or `e2e it Plan: <ref>`.
