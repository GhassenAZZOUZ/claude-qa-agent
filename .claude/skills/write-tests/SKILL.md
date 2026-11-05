---
name: write-tests
description: WAY 4 — write test cases only, no execution. Use when the user says "write it", "write tests", "generate test cases" — an approved test plan (`Plan:`), or requirements (text or a tracker issue) planned and approved first, optional App/Spec/MR or PR → exactly the planned test files.
---

# WAY 4 — Write Test Cases Only

## Step 1: Gather inputs
**Required (ask if missing):** `Plan:` (an approved test plan: issue ref or path), or requirements as plain text or an issue ref/URL (fetched with `issue.get`, per the `tracker` skill).
**Optional:** `App:` (feature URL, adds UI context to step wording) · `Spec:` (OpenAPI URL, adds API scenarios) · `MR:`/`PR:` (the change request to comment the plan on) · `visual: true` · `plan: auto` (unattended runs: no approval prompt).

With `Plan:`, read it per the `test-plan` skill's **Reading a plan**, ask for approval if it isn't approved, and go to Phase 3.

## Phase 1: Check requirements
Apply the `requirements-analysis` skill inline (§1–3): build the requirements model from the text or issue, and run the readiness gate. In **one** message, ask the gate's open questions and, when the source has no ACs, show the derived `R-NN` Requirements table for confirmation. Wait for the answers and update the model. Don't test against guesses.

## Phase 2: Plan and approve
Run the `test-plan` skill's Phase 2–3 with the confirmed model: `test-writer` in `plan` mode (`ui`, plus `api` on the same plan when `Spec:` is given), `plan-check.mjs`, the `test-plan` issue, and the approval question. No test file is written before the user approves.

With `plan: auto`: skip the question, set `**Status:** auto-approved` and file the issue with `test-plan` + `plan-auto-approved`. Use it only when the user asked for it (CI, scheduled tasks).

## Phase 3: Write
1. Run `test-writer` in `write` mode with the approved plan. It writes exactly the planned `Test#<nn>` triples into the plan's test folder, plus the index `.md` (`**Source:**`, `**Plan:**`, `**Covers:**` traceability lines)
2. Check: `node ${CLAUDE_PLUGIN_ROOT}/scripts/plan-check.mjs <plan path>`. A planned row it couldn't write, or a file the plan doesn't list, is reported to the user with the fix (change the plan via `plan it Plan: <ref>`, or remove the stray file with their OK)
3. If `MR:`/`PR:` was given, comment the test plan summary on it (`change.comment`), unless Phase 2 already did
