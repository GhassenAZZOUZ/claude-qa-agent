---
name: test-plan
description: WAY 19 — design a test plan before any test code. Use when the user says "plan it", "plan tests", "test plan", "design tests" with requirements (text or a tracker issue), optional App/Spec/MR or PR. Output is the test plan (scope, levels, one row per Test#<nn> with category, tags, covers, priority, coverage, entry/exit criteria, risks), reviewed by `review-plan` (WAY 20), filed for approval; `write it Plan:` / `e2e it Plan:` then write exactly that plan. Also holds the plan format every other WAY reads.
---

# WAY 19 — Test Plan

Test design is its own reviewed step. The story (WAY 6) owns **what the product must do** (ACs). The plan owns **what we test, at which level, in which order**. `write it` / `e2e it` turn an approved plan into code and add nothing to it.

## Step 1: Gather inputs
**Required (ask if missing):** requirements, as plain text or an issue ref/URL (`issue.get`, per the `tracker` skill), or `Plan: <ref or path>` to change an existing plan (see **Changing a plan**).
**Optional:** `App:` (adds UI context) · `Spec:` (OpenAPI, adds API rows) · `MR:`/`PR:` (comment the plan summary on it) · `visual: true` · `approve: true` (the user approves in the same message) · `review: off` (skip the automatic review) · `budget: <minutes>` (passed to the review).

## Phase 1: Check requirements
Apply the `requirements-analysis` skill inline (§1–3), exactly as `write-tests` Phase 1: build the model, run the readiness gate, and in **one** message ask the open questions and show the derived `R-NN` table when the source has no ACs. Wait for the answers. A spec with no story or text skips the gate (§2).

## Phase 2: Design
1. Run `test-writer` in **`plan` mode** with the confirmed model (`ui`; again with `api` and the **same** plan path when `Spec:` is given). It writes only `./qa-artifacts/test-plans/<feature>-<YYYY-MM-DD>.md` in the format below, and no `.feature` / `.steps.ts`
2. Check it: `node ${CLAUDE_PLUGIN_ROOT}/scripts/plan-check.mjs <plan path>`. On errors, run `test-writer` (`plan` mode) once more with the error list. Warnings are shown to the user, not fixed silently
3. **Review** (unless `review: off`): run the `review-plan` skill's Phases 1–3 on the plan file. Its scorecard and proposals are shown in Phase 3 with the plan

## Phase 3: File and ask for approval
1. Set `**Status:** awaiting-approval`, then file the plan: `issue.create("Test plan: <feature>", <plan body>, [test-plan, plan-awaiting-approval])`, then `issue.link` it to the source story when there is one. Put the issue ref in the plan's `**Plan:**` line and save the file again. If the tracker is unavailable, keep the local file only and say so
2. With `MR:`/`PR:`: `change.comment` with the Planned tests table and the coverage line
3. Show the **Planned tests** and **Coverage** tables, then the review's score and proposals, and ask: *"Pick the proposals to apply (all / A1,R2 / none), and tell me what else to change. Approve the plan as it is then?"* Apply the picks per `review-plan` Phase 5 (its floor check included), then show the updated tables. A score below 70 gets the review's warning line; it never blocks approval
4. **On approval** (or `approve: true`): set `**Status:** approved` in the file, `issue.update(ref, body, labels+ [plan-approved], labels- [plan-awaiting-approval])`. Next step to offer: `write it Plan: <ref>` or `e2e it Plan: <ref>`
5. **On changes**: apply them per **Changing a plan**, re-run the check, and ask again

Never set `approved` without the user's explicit OK in this conversation. Labelling the issue `plan-approved` in the tracker UI is the other way a person approves it.

## Changing a plan
`plan it Plan: <ref> <change>` (or a change asked during Phase 3):
- **Add**: next free `Test#<nn>` after every ID ever used in this plan, including retired ones
- **Drop**: move the row to **Retired**, with the reason. An ID is never reused
- **Re-level / re-prioritize / retitle**: edit the row, keep its ID
- Then: status back to `awaiting-approval` (labels swapped back), full body replace on the issue (`issue.update`, watermark included), and `plan-check.mjs` again. If the plan's test folder already has files, list the IDs `write it Plan:` will add or retire; never delete test files here

## Reading a plan (`Plan:` in WAY 1/4)
- An issue ref: `issue.get`. The issue body is authoritative (people edit it there): overwrite the local file with it. A body without `## Planned tests` isn't a plan: stop and say so
- A path: read the file
- Approved when the issue has `plan-approved` or `plan-auto-approved`, or (local file only) `**Status:**` is `approved` / `auto-approved`. Otherwise ask for approval as in Phase 3.3–3.4 before writing any test

---

## Plan format

The one definition. `test-writer` writes it, `plan-check.mjs` checks it, WAY 1/4/11/14 read it. Keep the headings and column order exactly.

```markdown
# Test plan — <Feature name>

**Source:** <issue ref> | text | <spec URL>
**Status:** draft | awaiting-approval | approved | auto-approved
**Plan:** <test-plan issue ref, or "local">
**Test folder:** test-cases/<feature>-<YYYY-MM-DD>/
**App:** <url> · **Spec:** <url>          (only the ones known)

## Scope
- **In scope:** <areas, flows, endpoints>
- **Out of scope:** <area> (<reason: not in the requirements / covered by WAY 15 load tests / …>)

## Levels
| Level | Project | Used for |
|---|---|---|
| ui | e2e | <flows only a browser can check> |
| api | api | <rules the API enforces: validation, permissions, boundaries> |

## Requirements
| ID | Requirement | Priority |
|---|---|---|
| AC-01 | <title, as in the story> | must |

## Planned tests
| Test | Title | Category | Level | Tags | Covers | Priority |
|---|---|---|---|---|---|---|
| Test#01 | <outcome when condition> | happy_path | ui | @e2e @positive @critical | AC-01 | P0 |
| Test#02 | <…> | negative | api | @api @negative @high | AC-01 | P1 |

## Coverage
| Requirement | Tests | Positive | Negative | Required categories |
|---|---|---|---|---|
| AC-01 | Test#01, Test#02 | ✅ | ✅ | ✅ |

## Environments & data
- <env from --env, accounts (`UI_TEST_USER`, `API_TEST_TOKEN`, …), seed data, feature flags>

## Entry criteria
- <e.g. story Missing Information empty · build deployed to <env> · test accounts exist>

## Exit criteria
- All P0 and P1 tests pass · no open sev-1/sev-2 on the feature · every `must` requirement covered and passing

## Risks
- <risk> → <mitigation>

## Review log
| Date | Score | Applied | Rejected |
|---|---|---|---|

## Retired
| Test | Reason |
|---|---|

---
🤖 _Generated by DevOps QA Agent — review before acting on this._
```

Rules:
- **Requirements**: always present. AC IDs, titles and priorities copied from the story; `R-NN` as confirmed (`requirements-analysis` §3); spec-only plans list the operations as `untraced` units and leave the table empty
- **Category** is one of `requirements-analysis` §4 (`happy_path`, `negative`, `edge_case`, `boundary`, `security`, `permissions`, `performance`). One row per test; variants that share a flow are one row (a Scenario Outline), and the Title says so (`… (Outline: 4 rows)`)
- **Level** `ui` → tags start with `@e2e`, `api` → `@api` (the Playwright project routes on these). Put a check at the lowest level that has the same oracle: a validation message the API also returns is an `api` test
- **Covers**: requirement IDs, or `untraced`
- **Priority** (P0–P3) from the requirement and the impact:

  | Requirement | Default | Raise one step (max P0) when its failure would |
  |---|---|---|
  | `must` | P1 | charge a wrong amount, bypass auth or permissions, expose data, or lose / corrupt data |
  | `should` | P2 | same |
  | `could` | P3 | same |

  The priority tag matches it: P0 `@critical`, P1 `@high`, P2 `@medium`, P3 `@low`
- **Coverage**: one line per requirement. Positive = a `happy_path` row covers it. Negative = a `negative` (or `security` / `permissions` denial) row covers it, required when the requirement takes input or an action. Required categories = every category §4 marks required for it is present. A cell that is empty on purpose says why: a requirement that is itself a rejection ("expired code is rejected") has its negative test as its main flow. A cell covered by another category's rows says which (`✅ (8 and 64 rows)`: a boundary Outline has an accepted and a rejected side). `plan-check.mjs` fails a requirement with no test and warns on a missing positive or negative one
- **IDs**: `Test#01` upward, two digits, never renumbered, never reused (Retired keeps them)
- **Review log**: one line per review (`review-plan`), with the proposals applied and the ones the user rejected, so the next review doesn't propose them again. Optional until the first review
- The body ends with the report footer above: it is filed verbatim as the `test-plan` issue
