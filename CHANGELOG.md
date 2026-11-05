# Changelog

## Unreleased

WAY 19 (test plan): test design becomes its own reviewed step, between the story and the code ([#42](https://github.com/GhassenAZZOUZ/claude-qa-agent/issues/42)).

- **WAY 19 `test-plan`** (`plan it`): requirements → readiness gate → `test-writer` in the new `plan` mode designs a test plan and writes no code: scope, levels (ui / api, lowest level with the same oracle), one row per `Test#<nn>` with category, tags, covers and a **P0–P3 priority** (from must/should/could, raised when a failure would charge a wrong amount, bypass auth, expose or lose data), coverage, environments, entry/exit criteria, risks, and a **Retired** list (IDs are never renumbered or reused). Filed as a `test-plan` issue with `plan-awaiting-approval`; approving swaps it to `plan-approved`, which the agent does only on your OK
- **Plan before code in WAY 1 and 4**: `write it Plan: <ref>` / `e2e it Plan: <ref>` write exactly the approved plan's tests (`test-writer` `write` mode: nothing added, dropped or renumbered). Without `Plan:`, they design the plan, show it and wait for approval before writing any file. `plan: auto` skips the question for unattended runs (`plan-auto-approved`). The test folder's index links its plan (`**Plan:**`)
- **Stories no longer carry a Test Scenarios table**: `user-story-format` (WAY 6 and WAY 8) keeps the Gherkin ACs, Missing Information and DoD (+ "Test plan approved"). WAY 6 drops the table on its next rewrite of an older story; `plan it` and `test-writer` read a legacy table as hints. `requirements-analysis` gains the approved-plan intake row
- **`scripts/plan-check.mjs`**: checks a plan (IDs, categories, levels vs `@e2e`/`@api`, priority vs `@critical`/`@high`/`@medium`/`@low`, covers vs Requirements, retired IDs not reused, every requirement has a test, missing positive/negative tests warned unless the Coverage cell says why) and the drift between the plan and its test folder. Unit tests (`plan-check.test.mjs`) and a check of the example plan run in CI
- **WAY 11** orders its selection and MR/PR comment by priority (P0 first) and headlines failed P0/P1 tests; `mr-test-impact` returns each test's priority. **WAY 14** shows 🔵 *planned — not written* for requirements only the plan covers
- New example `examples/test-plans/checkout-discount-2026-10-09.md`. New evals: `routing-plan-it`, `plan-gated-missing-info`, `write-it-plans-first`, `write-from-approved-plan`

## 1.3.0 — 2026-10-16

WAY 18 (exploratory session): live exploration with a scoped Playwright MCP server, handed to `test-writer` as runnable playwright-bdd tests you run now or later.

- **WAY 18 `explore-session`** (`explore it`): exploratory testing with no requirements. New `exploratory-tester` agent drives a headless browser through a Playwright MCP server (`@playwright/mcp@0.0.83`) scoped to it: defined inline in its frontmatter from a clone, bundled in `plugin.json` for the plugin (plugin agents ignore frontmatter `mcpServers`). Charter + action budget → pages, flows, anomalies `A-NN` with reproducible steps and evidence (console errors, 4xx/5xx, broken links, raw error text, validation, state, access, a11y from the snapshot, UX)
- **Exploration → tests, run later**: the explorer's output is a `test-writer` handoff (flows `F-NN` with preconditions, steps, data, checkpoints; observed validations; anomalies `A-NN`). The user confirms the derived `R-NN` (today's behavior, marked as such) and picks anomalies; `test-writer` (new input form 5) writes `@e2e @exploratory` flow tests in `test-cases/explore-<charter>-<date>/` and `@regression @exploratory` anomaly tests in `regression/<RUN_ID>-A<NN>/`. Nothing runs by default: `run: now`, `explore it run <RUN_ID>` (resumes from `tests.yaml`), plain `npx playwright test`, or CI via `ci setup`
- No live finding is filed on its own: only an anomaly whose test fails (or a flow test that regresses) is filed, with approval and label `exploratory`; the anomaly's folder becomes `regression/bug-<ref>/` so `verify it` picks it up. `requirements-analysis` gains the exploration-session intake row. New eval `explore-handoff-to-tests` (handoff → flow, validation and anomaly tests, no run)
- Safe by default: no delete / payment / email / account actions without `allow:`, same origin only, prod read-only after confirmation, test account from `UI_TEST_USER` / `UI_TEST_PASSWORD`
- `qa-setup` installs the MCP's browser; `validate.py` checks plugin-form twins for every bundled MCP server and that an agent's inline server matches the plugin's

## 1.2.0 — 2026-10-15

WAY 17 (API integration & E2E API tests), shared requirements analysis with `R-NN` IDs, boundary tests from OpenAPI schema constraints, evals.

- **Boundaries from the OpenAPI spec**: `requirements-analysis` §5 gains an OpenAPI schema-constraints table (`minLength`/`maxLength`, `minimum`/`maximum` incl. exclusive, `minItems`/`maxItems`, `pattern`, `enum`, `format`, `required` as absent / `null` / empty, non-nullable, `type`, `default`, `additionalProperties`). Spec-only API tests now get one `@boundary` Outline per constrained property (test-writer mandatory case 10); rejected rows assert their 4xx, never 5xx. Input and numeric checklists now cover the lower bound too (min - 1, min). New eval `api-spec-boundaries`
- **Evals** (`evals/`, `claude plugin eval`): routing cases (one per hard-to-route WAY, plus "no WAY"), the readiness gate (plain text → R-NN + questions, no tests written), and WAY 17 end to end (spec → `@api @integration` triples with chaining, cleanup, watermark). New `evals.yml` workflow: weekly, on demand, or on the `run-evals` label, needs `ANTHROPIC_API_KEY`. Cases grant no Bash/MCP, so they can't reach a tracker
- **Capture scrubbing**: `api-responses/` files and `api-exchange` attachments now redact secret-named fields at any depth (password, token, api key, cookie, session, card, cvv, ssn, iban), response `set-cookie`, JWTs, non-placeholder emails and secret query params. Assertions still see real values. The self-test fails on a leak
- **CLAUDE.md routing table** keeps one trigger per WAY; the full trigger lists live in skill descriptions only (CLAUDE.md 9,473 → 8,702 chars). `validate.py` now fails when a WAY skill has no trigger list, when the table's trigger isn't in it, or when one phrase routes to two skills

- **New shared `requirements-analysis` skill**: the one definition of intake (text / issue / enhanced story / spec → requirements model), the readiness gate (Missing Information, unassertable outcomes, vague words, contradictions), requirement IDs, scenario categories + tags, and per-element checklists. `test-writer`, `user-story-enhancer`, `user-story-format`, WAY 1/4/14/17 and `benchmark-gap-story-writer` now use it instead of their own copies
- **`R-NN` requirement IDs** for plain-text requirements (and issues without ACs): derived one per testable statement, confirmed by the user, saved as a `## Requirements` table in the test folder's index, cited by tests like ACs (`**Covers:** R-03`). `trace it <folder>` traces them
- WAY 1/4/17 ask the gate's questions (and show the R-NN table) **before** starting `test-writer`, in one message
- Fixes drift: stories now include `permissions` scenarios; test-writer's required categories now include `performance` (when a number is stated); tests now cover concurrency, session expiry, backend-failure and empty-upload cases; story scoring now checks IDOR, uploads and numerics. Expect WAY 6 scores to drop a little on re-run, since it detects more gaps
- WAY 3 regression tests and spec-only API tests skip the gate (`**Covers:** untraced`, as before)

- **WAY 17 `integration-tests`** (`integration it`): OpenAPI spec → resource map (CRUD, ID fields, dependencies, states), confirmed with the user → one `@api @integration` test per workflow (lifecycle, list consistency, cross-resource chain, referential integrity, state transitions, idempotency, cross-user ownership). Writes files only; no run, no filing unless `file: true`
- `test-writer`: new `integration` scenario type. Shared API steps gain value chaining (`stores the response field … as …`, `{name}` substitution in paths/bodies/expectations, type-preserving), `the response field … equals …`, `will delete … after the scenario` (cleanup newest-first, with the creating identity) and `authenticated as the second user` (`API_TEST_TOKEN_B`)
- `api` fixture captures every request of a scenario (one `api-responses/` file each), not just the last one; a request body applies to the next request only
- Self-test runs an integration workflow too
- Naming: browser tests are called **UI E2E** everywhere (identifiers `e2e`, `@e2e`, `e2e-session` unchanged). README gains a **Test levels** table
- **E2E API** in WAY 17 (`e2e api it`, several specs): per-service maps + a cross-service map (sync/async, every link `(inferred)` until confirmed) → `@api @e2e-api` flows: happy flow, propagation, failure & compensation, cross-service integrity, duplicate delivery
- Shared API steps: service-prefixed requests (`"orders:/v1/orders"` → `ORDERS_BASE_URL`, `ORDERS_TOKEN` under default auth; a missing base URL fails as `BLOCKED:`), polling steps `within N seconds <METHOD> "<path>" has field … equal to …` / `returns status …` (`expect.poll` with backoff). `test-execution-agent` maps `BLOCKED:`/`NOT IMPLEMENTED:` step errors to `blocked`
- `ci-test-setup`: per-service variables, `@e2e-api` kept off MR pipelines
- Self-test runs an E2E API flow (two services, per-service token, async effect)

## 1.1.1 — 2026-10-11

Provider adapters checked against the real thing.

- **GitHub:** every write and CI path run live on a test repo (30 operations: labels, milestones, issues create/edit/comment/close/reopen/list, release-asset attachments, PRs, Actions runs and logs), plus a full `report it` through the plugin. Fixes: an empty-jobs failed run is now diagnosed as an invalid workflow file; ANSI colours stripped from logs; log retry + API fallback; `--event pull_request` for PR runs; screenshots attach automatically once `qa-setup` has created the `qa-artifacts` release
- **Jira:** checked against Atlassian's published OpenAPI spec. Fixed: issue search now uses `/rest/api/2/search/jql` on Cloud (the old `/search` is being removed, CHANGE-2046), with Data Center still on `/search`; priority lookup uses `/priority/search` on Cloud
- **Azure DevOps:** REST calls checked against Microsoft's 7.1 reference and `az` flags against `az` 2.91 + `azure-devops` 1.1. Fixed: `--project` is only passed to commands that accept it (`work-item update/show`, `relation add`, `repos pr …` reject it); the latest PR iteration lookup; the JSON-patch call that links an attachment to a work item
- **Bitbucket:** checked against Atlassian's published Bitbucket Cloud spec. No changes needed
- `validate.py` now rejects invisible control characters in instructions

## 1.1.0 — 2026-10-11

Works with any major provider, not just GitLab.

- **Issue trackers:** GitLab, GitHub, Jira (Cloud/Data Center), Azure Boards. **Code hosts + CI:** GitLab, GitHub, Azure DevOps, Bitbucket Cloud. Chosen per project with `QA_TRACKER` / `QA_CODE_HOST`
- New `tracker` skill (replaces `gitlab-filing`): one provider-neutral set of operations (`issue.*`, `change.*`, `ci.*`, `file.attach`) that every WAY calls
- New `provider-gitlab`, `provider-github` (`gh` CLI), `provider-jira` (Atlassian MCP or REST, Markdown → wiki markup), `provider-azure-devops` (`az` CLI + REST, HTML bodies), `provider-bitbucket` (REST) skills
- `ci-test-setup` writes GitLab CI, GitHub Actions, Azure Pipelines or Bitbucket Pipelines config
- `user-story-enhancer` and `test-writer` no longer touch the tracker (the calling WAY fetches and files), so they work with every provider
- `qa-setup` asks for the providers and checks access for each; secrets are never read into the conversation (only the non-secret `.env` keys are grepped)
- GitLab token is now optional in the plugin settings

**Verification:** GitLab operations were checked against `@zereight/mcp-gitlab@2.2.1` schemas. GitHub read operations were run against a live repo, including a full `trace it` through the plugin. Jira, Azure DevOps and Bitbucket follow their documented APIs and need field reports.

## 1.0.0 — 2026-10-11

First public release.

- Installable as a Claude Code plugin (`qa-agent@devops-qa-agent`) or used from a clone
- WAY 0 `qa-setup` prepares any project (runner, `.env` values, GitLab check)
- Sixteen WAY skills, 9 sub-agents, shared `gitlab-filing`, `bug-report`, `session-report` and `user-story-format` skills
- Runner template, `validate.py`, and an end-to-end template self-test in CI

### History before 1.0.0

**Retired:** `severity-classifier` + `bug-reporter` → `bug-report` skill · `requirements-analyzer` → `test-writer` · `session-reporter` → `session-report` skill · `e2e-test-writer`/`api-test-writer` → `test-writer` · `playwright-navigator`/`api-executor`/`accessibility-checker` → `test-execution-agent`.

**Removed:** the cross-PU integration pipeline (`integration-orchestrator`/`integration-cycle`, `pu-discovery-agent`, `env-access-agent`, `contract-validation-agent`, `test-selection-agent`, `observability-correlation-agent`, `report-agent`). It was out of scope for this project; recover it from git history if ever needed.
