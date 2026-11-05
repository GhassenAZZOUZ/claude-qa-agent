---
name: tracker
description: Provider-neutral contract for every issue-tracker and code-host action (create/update/comment/close issues, attach files, comment on MRs/PRs, read CI runs and logs) plus label conventions and failure handling. Every WAY calls these operations; the matching provider-* skill says how to perform them on GitLab, GitHub, Jira, Azure DevOps, or Bitbucket.
---

# tracker

WAYs never talk to a provider directly. They call the **operations** below,
and the matching `provider-<name>` skill says how to perform each one. Skills
and agents that write content (e.g. `bug-report` formats a bug and picks its
labels) own the content; this skill owns the mechanics.

## 1. Pick the providers (every WAY, once per session)

Two settings in the project's `.env` (set by `qa-setup`):

| Setting | Values | Covers |
|---|---|---|
| `QA_TRACKER` | `gitlab` · `github` · `jira` · `azure-devops` | issues: bugs, test plans, test cases, stories, reports |
| `QA_CODE_HOST` | `gitlab` · `github` · `azure-devops` · `bitbucket` | MRs/PRs, CI runs and logs, CI config |

Read them **without exposing secrets**. Never `cat` or `Read` the whole `.env`, because it can hold tokens. Use:

```bash
grep -E '^(QA_TRACKER|QA_CODE_HOST|GITLAB_PROJECT_ID|GITHUB_REPO|JIRA_BASE_URL|JIRA_PROJECT_KEY|AZDO_ORG_URL|AZDO_PROJECT|AZDO_REPO|BITBUCKET_WORKSPACE|BITBUCKET_REPO|STAGING_URL|PROD_URL|FEATURE_BASE_URL|API_PERF_THRESHOLD_MS)=' .env
```

If they're unset, fall back like this: a connected GitLab MCP server means `gitlab`, a `github.com` git remote means `github`. Otherwise ask, and suggest `qa-setup`. Then load `provider-<QA_TRACKER>` (and `provider-<QA_CODE_HOST>` if it's different) and follow it for every operation below.

## 2. Vocabulary

WAY text uses neutral words. Each provider maps them:

| Neutral term | GitLab | GitHub | Jira | Azure DevOps | Bitbucket |
|---|---|---|---|---|---|
| issue | issue | issue | issue (Bug / Story / Task) | work item (Bug / User Story / Task) | — use Jira |
| issue ref | `#143` | `#143` | `PROJ-143` | `#143` (work item ID) | — |
| change request | merge request `!87` | pull request `#87` | — | pull request `!87` | pull request `#87` |
| CI run | pipeline | workflow run | — | pipeline run (build) | pipeline |
| milestone | milestone | milestone | fixVersion / sprint | iteration path | — |
| label | label | label | label | tag | — |

Always report refs back in the provider's own format (`#143`, `PROJ-143`, `!87`).

## 3. Operations

| Operation | Used by WAY | Notes |
|---|---|---|
| `issue.create(title, body, labels)` → ref + URL | 1, 2, 3, 4, 7, 8, 12, 13, 18, 19 | body is Markdown; the provider skill converts it if the tracker needs another format |
| `issue.get(ref)` → title, body, labels, state, milestone, links | 1, 4, 6, 9, 14, 19 | |
| `issue.update(ref, body?, labels+?, labels-?)` | 1, 4, 6, 9, 19 | body is a **full replace**: write the watermark again every time |
| `issue.comment(ref, body)` | 1, 6, 9 | |
| `issue.close(ref, comment)` / `issue.reopen(ref, comment)` | 9, 13 | outward-facing: only when the WAY says so, always with a comment |
| `issue.list(filters)` | 9, 12, 14, 18 | filters: labels, milestone, state, text search |
| `issue.link(ref, other_ref)` | 1, 19 | story ↔ test-plan, test-plan ↔ test-case, bug ↔ test-case |
| `file.attach(path)` → Markdown snippet or link | 1, 2, 3, 9, 18 | see §5 |
| `change.get(ref)` → title, description, source branch, linked issues, changed files | 5, 11 | |
| `change.diff(ref, files?)` | 5, 11 | only fetch the files you need |
| `change.comment(ref, body)` | 1, 4, 5, 11, 19 | |
| `ci.get_run(ref or URL)` → status, branch, commit, trigger, jobs | 5 | |
| `ci.job_log(job, tail=200)` | 5 | read the **end** first, page back only if needed |
| `ci.latest_run(branch)` | 12 | |
| `ci.lint(config)` | 10 | not every provider has one: the provider skill says what to do instead |
| `project.check()` | 0 | proves the credentials reach the project |

If the provider skill marks an operation as unsupported, say so in the WAY's output and carry on. Never fake it.

## 4. Label conventions

Draw labels only from this set, unless a WAY says otherwise. On Jira they're labels (severity/priority also go in the Priority field), on Azure DevOps they're tags (plus the Severity/Priority fields). See the provider skill.

| Label | Meaning | Set by |
|---|---|---|
| `bug` | Any filed defect | WAY 1/2/3/18 |
| `sev-1` / `sev-2` / `sev-3` / `sev-4` | Severity, from the `bug-report` skill | WAY 1/2/3/18 |
| `p1` / `p2` / `p3` | Priority, from the `bug-report` skill | WAY 1/2/3/18 |
| `test-plan` | A test plan (`test-plan` skill format), designed before the tests | WAY 1/4/19 |
| `plan-awaiting-approval` / `plan-approved` / `plan-auto-approved` | Test plan status. People approve by swapping to `plan-approved`; the agent swaps only on the user's OK, `plan-auto-approved` only with `plan: auto` | WAY 1/4/19 |
| `test-case` | One issue per generated `Test#<nn>` | WAY 1 |
| `api` | Bug or test case from API testing | WAY 2 |
| `e2e` | Bug or test case from browser testing | WAY 1/18 |
| `accessibility` | Bug from an axe-core violation | WAY 1/18 |
| `exploratory` | Bug found in an exploratory session (and confirmed by a regression test) | WAY 18 |
| `qa-session-report` | End-of-session summary issue | WAY 1/2 |
| `benchmark` | Competitor benchmark report, or a gap backlog index | WAY 7/8 |
| `user-story` | User story written from a benchmark gap | WAY 8 |
| `benchmark-gap` | Story closing a feature gap vs a competitor | WAY 8 |
| `decision-needed` | Story that conflicts with a deliberate product choice | WAY 8 |
| `verified` | Bug whose regression test passed after the fix | WAY 9 |
| `fix-failed` | Bug whose regression test still fails after a claimed fix | WAY 9 |
| `performance` | Bug from a load-test threshold breach | WAY 15 |
| `flaky-test` | Test (not product) issue: a quarantined flaky scenario | WAY 13 |
| `release-readiness` | Go/no-go report for a milestone | WAY 12 |

If a label doesn't exist yet, the provider skill says whether to create it or just apply it.

## 5. Attachments

A local path like `runs/<id>/artifacts/…/test-failed-1.png` means nothing to a developer. Attach the file (`file.attach`) and put the returned snippet in the body. Attach only what helps reproduce: the failure screenshot, plus `error-context.md` or a short console excerpt. Never attach traces (`trace.zip`, not scrubbed) or `api-responses/` captures unless you've checked they hold no tokens or personal data. The `api` fixture scrubs captures by key name and pattern, which catches the usual cases, not every case. If attaching fails or isn't supported, keep the local path, label it "on the QA machine", and carry on.

## 6. Failure handling

If any provider call fails (auth, network, rate limit, not found):
1. Log what was attempted and what the provider returned
2. Skip that operation. Don't retry in a loop
3. Continue the rest of the WAY, and don't abort

If that call was the only way to deliver something a human needs (e.g. an enhanced story body), print the content to chat so the user can apply it by hand.

## Rules
- Never invent a project ID, repo, key or ref. If a required setting is missing, stop and ask (or suggest `qa-setup`)
- **Secrets stay out of the conversation.** Pass tokens only as environment variables inside the command that needs them (`set -a; . ./.env; set +a; curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" …`). Never echo them, and never put them in a body, URL or file
- Every human-facing body and comment carries the watermark footer from CLAUDE.md's Output Watermark. The caller includes it. This skill doesn't add it
- Write bodies to a temp file and pass it by path (`--body-file`, `-d @file`), not as a shell argument. That avoids quoting and length problems
