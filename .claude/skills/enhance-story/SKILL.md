---
name: enhance-story
description: WAY 6 — score and rewrite a user story in your tracker (GitLab, GitHub, Jira, Azure Boards). Use when the user says "analyze us", "enhance us", "analyze and update us", "improve us" with an issue ref (#143, SHOP-143).
---

# WAY 6 — User Story Enhancer

**Required (ask if missing):** an issue ref (`#143`, `143`, `SHOP-143`).

1. **Fetch** the issue (`issue.get`, per the `tracker` skill). If it can't be fetched, stop and say why
2. **Analyze:** run `user-story-enhancer` with the title and the body **exactly as fetched**. It has no tracker access. It returns three things:
   - the new issue body, in the shared `user-story-format`, with the original preserved verbatim
   - the QA analysis comment (score, grade, strengths, issues with fixes)
   - the score and the open Missing Information questions
3. **Update:** `issue.update(ref, body)` with the new body (a full replace, so the watermark is in it). Then `issue.comment(ref, analysis)`. If either call fails, print that content to chat so the user can apply it
4. **Report:** the score and grade. If Missing Information isn't empty, say so: `plan it`, `e2e-session` and `write-tests` will stop on those questions. Otherwise offer the next step, `plan it <ref>` (WAY 19)

Body format: GitLab, GitHub and Jira (via the Atlassian MCP server) take the Markdown as is. Jira REST takes wiki markup, and Azure Boards takes HTML. The provider skill says how to convert.
