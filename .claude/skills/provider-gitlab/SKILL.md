---
name: provider-gitlab
description: How to perform the tracker skill's operations on GitLab (gitlab.com or self-hosted) through the bundled GitLab MCP server — issues, merge requests, pipelines, CI lint, uploads. Load it when QA_TRACKER or QA_CODE_HOST is gitlab.
---

# provider-gitlab

**Tool:** the GitLab MCP server `@zereight/mcp-gitlab@2.2.1` (tool names and parameters checked against that version).
- **Plugin install:** it ships with the plugin. Tools are named `mcp__plugin_qualigate_gitlab__<tool>`, and the URL/token are plugin settings (`/plugin configure qualigate@qa-qualigate`)
- **Clone install:** registered as `gitlab` in `.mcp.json`. Tools are named `mcp__gitlab__<tool>`

Below, `<tool>` means whichever form is loaded. The config must set `GITLAB_TOOLSETS=core,issues,merge_requests,pipelines,ci` (an explicit list replaces the default, so `core` stays in it) and `GITLAB_TOOLS=upload_markdown`. If a tool is missing from `/mcp`, check those first.

**Settings:** `GITLAB_PROJECT_ID` (numeric ID or URL-encoded `group%2Fproject`). It's passed as `project_id` on every call.

## Operations

| Operation | Call |
|---|---|
| `issue.create` | `create_issue(project_id, title, description, labels: [..])` |
| `issue.get` | `get_issue(project_id, issue_iid)` |
| `issue.update` | `update_issue(project_id, issue_iid, description?, labels?)`. `labels` replaces the set, so send the full list |
| `issue.comment` | `create_note(project_id, noteable_type: "issue", noteable_iid, body)` |
| `issue.close` / `reopen` | `update_issue(…, state_event: "close" \| "reopen")`, plus a `create_note` explaining why |
| `issue.list` | `list_issues(project_id, labels, milestone, state: "opened" \| "closed", search)` |
| `issue.link` | put `Relates to #<IID>` in the body. GitLab renders `#<IID>` as a link |
| `file.attach` | `upload_markdown(project_id, file_path: <absolute path>)` returns `![name](/uploads/…)` |
| `change.get` | `get_merge_request(project_id, merge_request_iid)`, then `list_merge_request_changed_files` |
| `change.diff` | `get_merge_request_diffs(project_id, merge_request_iid)`. Skip lockfiles and generated files |
| `change.comment` | `create_note(project_id, noteable_type: "merge_request", noteable_iid, body)` |
| find the MR for a branch | `list_merge_requests(project_id, source_branch, state: "opened")`, then `"merged"` |
| `ci.get_run` | `get_pipeline(project_id, pipeline_id)`, then `list_pipeline_jobs(project_id, pipeline_id, scope: "failed")` |
| `ci.job_log` | `get_pipeline_job_output(project_id, job_id, limit, offset)`. Read the tail first |
| `ci.latest_run` | `list_pipelines(project_id, ref: <branch>)`, newest first |
| `ci.lint` | `validate_ci_lint(project_id, content)` |
| `project.check` | `get_project(project_id)` |

## Notes
- **IID vs id:** issues and MRs have a project-scoped **IID** (`#143`, `!87`), which is what users see, and a global `id`. Always use and report the IID. If a call rejects one, fetch the object to resolve it rather than guessing
- **Labels:** GitLab creates a missing label on first use. No setup needed
- **Markdown:** GitLab renders it natively, including `<details>` blocks
