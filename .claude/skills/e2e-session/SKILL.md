---
name: e2e-session
description: WAY 1 — full UI E2E (browser) session. Use when the user says "e2e it", "test it", "run e2e", "start testing", "qa this" — requirements (text or a tracker issue) or an approved test plan → plan approved → Gherkin/playwright-bdd tests → run → heal or file bugs → session report.
---

# WAY 1 — Full UI E2E Session

Run CLAUDE.md **Step 0** (environment) first, and pick the providers per the `tracker` skill.

## Step 1: Gather inputs
You need two things. Ask before proceeding if either is missing:
- **Requirements**: plain text, an issue ref/URL (`#148`, `SHOP-148`), or `Plan:` (an approved test plan, which skips Phase 1)
- **App URL**: resolved from `--env` (ask if ambiguous)

For an issue ref: fetch it (`issue.get`) and extract the title, body, labels, linked MRs/PRs and milestone. Use that as the requirements, and don't ask the user again.

## Phase 1: Check requirements
Apply the `requirements-analysis` skill inline (§1–3): build the requirements model from the text or issue, and run the readiness gate. In **one** message, ask the gate's open questions and, when the source has no ACs, show the derived `R-NN` Requirements table for confirmation. Wait for the answers and update the model. Don't test against guesses. Scenario selection (§4–5) happens inside `test-writer`.

## Phase 2: Plan, approve, write
1. **Plan**: with `Plan:`, read it per the `test-plan` skill's **Reading a plan**. Otherwise run that skill's Phase 2–3 (`ui` type, plus `visual: true` if the user asked for visual checks): `test-writer` in `plan` mode, `plan-check.mjs`, the `test-plan` issue, and the approval question. `plan: auto` skips the question (status `auto-approved`, label `plan-auto-approved`). Nothing is written or run before approval
2. **Write**: `test-writer` in `write` mode with the approved plan writes exactly its `Test#<nn>.{md,feature,steps.ts}` triples into the plan's test folder, plus the index `.md`. Then `node ${CLAUDE_PLUGIN_ROOT}/scripts/plan-check.mjs <plan path>`, and report anything it flags
3. File one `test-case` issue per test, each linked to the `test-plan` issue (`issue.link`, per the `tracker` skill)

## Phase 3: Execute
Run `test-execution-agent` with `--project=e2e`, scoped to the Phase 2 folder. Accessibility checks run inside each scenario, and failure artifacts are captured automatically.

## Phase 4: Heal, then report bugs
For each failure, go by `test-execution-agent`'s fields:
1. `failure_kind: locator` → run `test-healer` (propose mode) on all of them in one call. Show the proposed heals to the user. On approval, re-run `test-healer` in apply mode. Healed tests go into the session report under "Tests healed — confirm intended" and get no bug. `not-healable: element missing` continues to step 2
2. Otherwise apply the `bug-report` skill. It also skips the non-bug outcomes (baseline created, quarantined, network/setup blocked)
3. File the bug with its labels (`issue.create`), attaching the screenshot (`file.attach`)
4. If an MR/PR is linked to the feature, comment on it referencing the bug (`change.comment`)
5. Comment on the matching `test-case` issue: `Failed in run <RUN_ID> → <bug ref>`

## Phase 5: Session summary
Apply the `session-report` skill (WAY 1 template). It saves `./qa-artifacts/sessions/session-<YYYY-MM-DD-HH-MM>.md` and files the `qa-session-report` issue. Include: tests healed, quarantined failures, and baselines created, each in its own short list.
