# Contributing

Thanks for helping QA engineers everywhere test faster. This project is a set of Claude Code **skills** and **sub-agents**: markdown instructions plus a few templates and scripts. Most contributions are prose, and prose needs the same care as code.

## Ways to help
- **Report a problem**: a WAY that misbehaves, a template that doesn't compile, a GitLab call that fails. Use the bug report issue template and include the WAY, the trigger phrase, and what the agent did
- **Propose a WAY**: open a "New WAY / feature" issue before writing it, so we can agree on its scope and whether it's a skill or an agent
- **Improve a WAY**: tighter instructions, better defaults, clearer reports
- **Translate**: docs in more languages are welcome. Trigger phrases stay in English: Claude already routes requests written in other languages

## Picking work
Open issues are ranked on the **QA Agent Roadmap** project board (the repo's **Projects** tab). Take the top card of **Ready**: highest Priority first, smallest Effort first within a priority. Assign yourself and move it to **In progress** before you start.

| Priority | Meaning |
|---|---|
| P0 | `must`, unblocks other work or protects quality; do next |
| P1 | `must` or verifies shipped features (provider live-runs) |
| P2 | `should` |
| P3 | `could`, nice to have |

| Column | Rule |
|---|---|
| Needs info | The story's Missing Information has open questions. Answer them on the issue; don't code yet |
| Ready | Decisions made, nothing blocking |
| Blocked | Waits on another issue named in its body |
| In progress → In review → Done | Assigned → PR open → merged |

Maintainers set Priority and Effort on new issues (the `project-board` workflow adds them to the board). `scripts/setup-project-board.sh` recreates the board and its ranking.

## Skill or agent?
- **Skill** (`.claude/skills/<name>/SKILL.md`): runs inline in the main session. Use one for workflows (every WAY is a skill) and for rubrics or templates applied to data already in context (`bug-report`, `session-report`)
- **Agent** (`.claude/agents/<name>.md`): runs in its own context. Use one only when it reads or produces a lot (logs, diffs, many files, web pages) or needs a restricted tool list. Agents can't start other agents, so orchestration belongs in skills

## Conventions (CI enforces the starred ones)
- ★ Frontmatter is valid YAML with `name` and `description`. **Quote the description** if it contains `: ` or ` #`
- ★ The skill folder name / agent file name equals `name`
- ★ Every skill or agent listed in `CLAUDE.md` exists
- ★ Human-facing output templates end with the Output Watermark footer, and generated test files start with the watermark header (see `CLAUDE.md` → Output Watermark). This is a fixed policy, so don't remove it
- ★ The step templates in `.claude/agents/test-writer.md` compile and run (`scripts/selftest.mjs`)
- ★ `flaky-triage/flaky.mjs` passes its unit tests (`flaky.test.mjs`, fixtures in `__fixtures__/`)
- ★ **Plugin-safe.** The repo root is also the `qa-agent` plugin:
  - a new agent file must be added to the `agents` list in `.claude-plugin/plugin.json`
  - refer to files inside this repo as `${CLAUDE_PLUGIN_ROOT}/…`, never as a relative path
  - an agent that lists GitLab or Playwright MCP tools in `tools:` lists both `mcp__<server>__<tool>` (clone) and `mcp__plugin_qa-agent_<server>__<tool>` (plugin)
  - plugin agents ignore `mcpServers` in frontmatter: an agent-scoped MCP server (as in `exploratory-tester`) must also be in `plugin.json` → `mcpServers`, with the same args
  - `CLAUDE.md` stays under ~9,500 characters, because the plugin hook injects it and Claude Code caps hook context at 10,000
- Test IDs are `Test#<nn>`. Labels come only from the `tracker` skill's label conventions. Never call a provider directly from a WAY: use a `tracker` operation
- Outward-facing actions (closing issues, posting on MRs, quarantining, heavy load tests) need the user's confirmation unless the WAY says otherwise
- Never put real credentials, internal URLs, company names or personal data in examples. Use `myapp.com`, `user@test.local`, `#142`
- A new WAY needs: its skill (★ with `Use when the user says "…"` trigger phrases in its description, none shared with another skill), a row in `CLAUDE.md`'s routing table with **one** short trigger taken from that list, a usage example and a "What the agent produces" entry in `README.md`, plus any new labels in `tracker`. Add a routing case to `evals/` for it
- ★ Trigger phrases live in skill descriptions only. `CLAUDE.md` keeps one per WAY, so it stays well under its size cap

## Adding a provider
1. Add `.claude/skills/provider-<name>/SKILL.md`: map every operation in the `tracker` skill's table to that provider's tool (prefer its official CLI or MCP server), plus its ref format, body format, labels/tags and attachments. Mark unsupported operations explicitly
2. Add the value to the `QA_TRACKER` / `QA_CODE_HOST` lists and the vocabulary table in `tracker`, the `.env` block in `qa-setup`, `.env.example`, and a `ci-test-setup` template if it has CI
3. Read-only commands must be tested against a real project before merging; say in the PR which operations you ran live. To report a live run of an existing provider, use the **Provider live-run report** issue template

## Before opening a PR
```bash
pip install pyyaml
python scripts/validate.py      # frontmatter, names, references, plugin rules, watermarks
claude plugin validate .        # marketplace + plugin manifest (Claude Code CLI)
node scripts/selftest.mjs       # templates compile + UI/a11y/visual/API scenarios run (needs Node 20+)
node --test ".claude/skills/flaky-triage/*.test.mjs"   # flaky.mjs unit tests (needs Node 22+)
```
Changed a WAY's instructions? Also run its evals (`evals/`, real model calls, a few cents per routing case, about a dollar or two for an end-to-end case):
```bash
claude plugin eval . --case 'routing-*' --runs 1 --no-publish --ablation none   # cheap: does each trigger reach its WAY
claude plugin eval . --runs 1 --no-publish --ablation none --max-cost-usd 10 --allow-tools Write Edit   # everything
```
`--allow-tools Write Edit` lets WAYs write into the eval's sandboxed workspace; without it, file checks can't pass and "wrote nothing" checks pass for the wrong reason. Cases grant no Bash and no MCP tools, and the GitLab server isn't started, so no eval can reach a real tracker. CI runs them weekly, on demand, or when a maintainer labels a PR `run-evals` (needs the `ANTHROPIC_API_KEY` secret).

Then try your change for real in Claude Code on a sample app. Say in the PR what you ran and what happened.

## Commit style
Short imperative subject (`Add verify-fix WAY`, `Fix flaky.mjs window sort`), with a body explaining *why*. One logical change per PR.

By contributing, you agree your work is released under the [MIT License](LICENSE) and you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
