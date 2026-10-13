---
name: qa-setup
description: WAY 0 — prepare the current project for DevOps QA Agent — test runner in qa-artifacts/, issue tracker and code host (GitLab, GitHub, Jira, Azure DevOps, Bitbucket), per-project .env values, access check. Use when the user says "qa setup", "set up qa", "init qa agent", or when another WAY finds qa-artifacts/ or its settings missing.
---

# WAY 0 — QA Setup

Run once per project. Ask before changing anything that already exists.

## 1. Test runner → `qa-artifacts/`
- If `qa-artifacts/playwright.config.ts` is missing, copy `${CLAUDE_PLUGIN_ROOT}/runner-template/` (`package.json`, `playwright.config.ts`, `README.md`) into it
- If a config already exists, compare it with the **Playwright config contract** in `test-execution-agent` and list the differences. Don't overwrite it
- From `qa-artifacts/`: `npm install`, then `npx playwright install chromium`. Report `npx playwright --version`

## 2. Providers
Ask, or detect from `git remote -v` and the connected MCP servers, then confirm:
- **Issue tracker** (`QA_TRACKER`): `gitlab` · `github` · `jira` · `azure-devops`
- **Code host / CI** (`QA_CODE_HOST`): `gitlab` · `github` · `azure-devops` · `bitbucket`

## 3. Project values → `.env` (project root)
Add only the keys for the chosen providers, keep existing values, and ask for each one (or leave it empty with a comment):

```
QA_TRACKER=github
QA_CODE_HOST=github
STAGING_URL=
PROD_URL=
FEATURE_BASE_URL=          # preview apps: FEATURE_BASE_URL/<branch>
API_TEST_TOKEN=            # test-account token for API tests, never a real user's
API_TEST_TOKEN_B=          # optional second test account (WAY 17 ownership workflows)
# <SERVICE>_BASE_URL= / <SERVICE>_TOKEN=   # E2E API only, one pair per service (ORDERS_BASE_URL…)
API_PERF_THRESHOLD_MS=2000

# gitlab        GITLAB_PROJECT_ID=        (token: plugin settings, or .mcp.json from a clone)
# github        GITHUB_REPO=owner/repo    (auth: `gh auth login`)
# jira          JIRA_BASE_URL=  JIRA_PROJECT_KEY=  JIRA_EMAIL=  JIRA_API_TOKEN=   (or a connected Atlassian MCP server)
# azure-devops  AZDO_ORG_URL=  AZDO_PROJECT=  AZDO_REPO=  AZURE_DEVOPS_EXT_PAT=
# bitbucket     BITBUCKET_WORKSPACE=  BITBUCKET_REPO=  BITBUCKET_EMAIL=  BITBUCKET_API_TOKEN=
```

Never echo secret values back. Make sure `.gitignore` covers `.env` and `qa-artifacts/` (add the missing lines with the user's OK).

## 4. Tools and access
For each chosen provider, check the tool its skill needs:

| Provider | Tool check |
|---|---|
| gitlab | `/mcp` shows the GitLab server connected (plugin: set the URL/token with `/plugin configure qa-agent@devops-qa-agent`; clone: `.mcp.json`) |
| github | `gh auth status` |
| jira | an Atlassian MCP server connected, **or** the REST settings above |
| azure-devops | `az version` plus the `azure-devops` extension (`az extension add --name azure-devops`) |
| bitbucket | `curl` plus the settings above |

Then run `project.check` (per `tracker` → the provider skill) for the tracker and the code host, and report the project or repo name each returns. On GitHub, offer two one-time setups (`provider-github`): the `tracker` label set, and the `qa-artifacts` prerelease that screenshots are attached to. With that release in place, later WAYs attach screenshots without asking.

## 5. Summary
Print what was created, changed, or skipped, plus a first command to try, e.g. `write it "<a small feature of this app>" App: <STAGING_URL>`.
