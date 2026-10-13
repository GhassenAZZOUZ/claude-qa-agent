# Changelog

## Unreleased

- **WAY 17 `integration-tests`** (`integration it`): OpenAPI spec → resource map (CRUD, ID fields, dependencies, states), confirmed with the user → one `@api @integration` test per workflow (lifecycle, list consistency, cross-resource chain, referential integrity, state transitions, idempotency, cross-user ownership). Writes files only; no run, no filing unless `file: true`
- `test-writer`: new `integration` scenario type. Shared API steps gain value chaining (`stores the response field … as …`, `{name}` substitution in paths/bodies/expectations, type-preserving), `the response field … equals …`, `will delete … after the scenario` (cleanup newest-first, with the creating identity) and `authenticated as the second user` (`API_TEST_TOKEN_B`)
- `api` fixture captures every request of a scenario (one `api-responses/` file each), not just the last one; a request body applies to the next request only
- Self-test runs an integration workflow too

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
