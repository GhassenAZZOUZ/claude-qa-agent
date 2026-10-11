---
name: e2e-session
description: WAY 1 — full browser E2E session. Use when the user says "e2e it", "test it", "run e2e", "start testing", "qa this", "ई2ई चलाओ", "इसका टेस्ट करो", "टेस्टिंग शुरू करो", "इसकी QA करो" — requirements (text or a tracker issue) → Gherkin/playwright-bdd tests → run → heal or file bugs → session report.
---

# WAY 1 — Full E2E Session

Run CLAUDE.md **Step 0** (environment) first, and pick the providers per the `tracker` skill.

## Step 1: Gather inputs
You need two things. Ask before proceeding if either is missing:
- **Requirements**: plain text, or an issue ref/URL (`#148`, `SHOP-148`)
- **App URL**: resolved from `--env` (ask if ambiguous)

For an issue ref: fetch it (`issue.get`) and extract the title, body, labels, linked MRs/PRs and milestone. Use that as the requirements, and don't ask the user again.

## Phase 1: Check requirements
If the issue has a **Missing Information** section with unanswered questions, ask the user to answer them first. Don't test against guesses. Scenario analysis itself happens inside `test-writer`.

## Phase 2: Write test cases
1. Run `test-writer` (`ui` type) with the raw requirements (plus `visual: true` if the user asked for visual checks)
2. It writes `Test#<nn>.{md,feature,steps.ts}` triples under `./qa-artifacts/test-cases/[feature]-[YYYY-MM-DD]/`, plus the index `.md`
3. File a `test-plan` issue (the index content) and one `test-case` issue per test, each linked to the test plan (`issue.link`, per the `tracker` skill)

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
