---
name: write-tests
description: WAY 4 — write test cases only, no execution. Use when the user says "write it", "write tests", "generate test cases" — requirements (text or a tracker issue), optional App/Spec/MR or PR → test files + test-plan issue.
---

# WAY 4 — Write Test Cases Only

## Step 1: Gather inputs
**Required (ask if missing):** requirements, as plain text or an issue ref/URL (fetched with `issue.get`, per the `tracker` skill).
**Optional:** `App:` (feature URL, adds UI context to step wording) · `Spec:` (OpenAPI URL, adds API scenarios) · `MR:`/`PR:` (the change request to comment the plan on) · `visual: true`.

## Phase 1: Check requirements
Apply the `requirements-analysis` skill inline (§1–3): build the requirements model from the text or issue, and run the readiness gate. In **one** message, ask the gate's open questions and, when the source has no ACs, show the derived `R-NN` Requirements table for confirmation. Wait for the answers and update the model. Don't test against guesses.

## Phase 2: Write & file
1. Run `test-writer` for `ui` scenarios with the confirmed model. If `Spec:` was given, run it again for `api` scenarios with the **same** model and folder, so both cite the same IDs and share one index
2. Both write `Test#<nn>` triples under `./qa-artifacts/test-cases/[feature]-[YYYY-MM-DD]/` plus the index `.md`, with `**Source:**`/`**Covers:**` traceability lines
3. File a `test-plan` issue with the index content (`issue.create`)
4. If `MR:`/`PR:` was given, comment the test plan summary on it (`change.comment`)
