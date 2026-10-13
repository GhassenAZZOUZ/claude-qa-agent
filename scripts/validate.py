"""Static checks for agents/skills. Run from the repo root: python scripts/validate.py
- every agent/skill has parseable YAML frontmatter with name + description
- skill folder name == skill name, agent file name == agent name
- every skill/agent named in CLAUDE.md's tables exists
- every human-facing template keeps the Output Watermark
- requirement-analysis rules live only in the requirements-analysis skill; its users point to it
"""
import glob, os, re, sys
import yaml

sys.stdout.reconfigure(encoding="utf-8")

errors = []
names = {'skill': set(), 'agent': set()}

for kind, pattern in (('skill', '.claude/skills/*/SKILL.md'), ('agent', '.claude/agents/*.md')):
    for p in sorted(glob.glob(pattern)):
        text = open(p, encoding='utf-8').read()
        parts = text.split('---')
        if not text.startswith('---') or len(parts) < 3:
            errors.append(f'{p}: missing frontmatter'); continue
        try:
            fm = yaml.safe_load(parts[1])
        except yaml.YAMLError as e:
            errors.append(f'{p}: invalid YAML frontmatter ({e.problem}). Quote the description'); continue
        for key in ('name', 'description'):
            if not fm or not fm.get(key):
                errors.append(f'{p}: frontmatter has no {key}')
        if not fm:
            continue
        expected = os.path.basename(os.path.dirname(p)) if kind == 'skill' else os.path.basename(p)[:-3]
        if fm.get('name') != expected:
            errors.append(f'{p}: name "{fm.get("name")}" != "{expected}"')
        names[kind].add(fm.get('name'))

claude = open('CLAUDE.md', encoding='utf-8').read()
for row in re.findall(r'^\|\s*(\d+)\s*\|\s*`([a-z0-9-]+)`', claude, re.M):
    if row[1] not in names['skill']:
        errors.append(f'CLAUDE.md: WAY {row[0]} points to missing skill `{row[1]}`')
section = claude.split('## Agents & Shared Skills', 1)[-1]
for n in re.findall(r'^\|\s*`([a-z0-9-]+)`', section, re.M):
    if n not in names['skill'] | names['agent']:
        errors.append(f'CLAUDE.md: references missing agent/skill `{n}`')

# The plugin's SessionStart hook prints CLAUDE.md as session context; Claude Code caps hook output at 10,000 chars
HOOK_HEADER = 500  # header line + ${CLAUDE_PLUGIN_ROOT} expanding to an absolute path
if len(claude) + HOOK_HEADER > 10_000:
    errors.append(f'CLAUDE.md is {len(claude)} chars; the plugin hook can only inject {10_000 - HOOK_HEADER}. Move detail into skills')

# The plugin manifest must list every agent file (its `agents` key replaces the default scan)
import json
manifest = json.load(open('.claude-plugin/plugin.json', encoding='utf-8'))
listed = {os.path.basename(a)[:-3] for a in manifest.get('agents', [])}
if listed != names['agent']:
    errors.append(f'.claude-plugin/plugin.json agents mismatch: missing {sorted(names["agent"] - listed)}, extra {sorted(listed - names["agent"])}')

# Agents restricted to GitLab tools must list both name forms (clone: mcp__gitlab__*, plugin: mcp__plugin_qa-agent_gitlab__*)
for p in glob.glob('.claude/agents/*.md'):
    fm = yaml.safe_load(open(p, encoding='utf-8').read().split('---')[1])
    tools = {t.strip() for t in str(fm.get('tools', '')).split(',')}
    for t in tools:
        if t.startswith('mcp__gitlab__') and t.replace('mcp__gitlab__', 'mcp__plugin_qa-agent_gitlab__') not in tools:
            errors.append(f'{p}: {t} has no plugin-form twin')

# Every provider value the tracker skill accepts needs a provider-<value> skill
tracker = open('.claude/skills/tracker/SKILL.md', encoding='utf-8').read()
for v in sorted(set(re.findall(r"`(gitlab|github|jira|azure-devops|bitbucket)`", tracker))):
    if f'provider-{v}' not in names['skill']:
        errors.append(f'tracker skill accepts `{v}` but there is no provider-{v} skill')

# No invisible control characters (e.g. a raw ESC byte) in instructions people copy from
for p in glob.glob('.claude/**/*.md', recursive=True) + ['CLAUDE.md']:
    bad = [hex(ord(c)) for c in open(p, encoding='utf-8').read() if ord(c) < 32 and c not in '\n\r\t']
    if bad:
        errors.append(f'{p}: control characters {sorted(set(bad))}. Write escapes as text (e.g. \\x1b)')

# Requirements analysis has one source: these files must point to it instead of keeping their own copy
for p in ['.claude/agents/test-writer.md', '.claude/agents/user-story-enhancer.md', '.claude/skills/user-story-format/SKILL.md',
          '.claude/skills/e2e-session/SKILL.md', '.claude/skills/write-tests/SKILL.md', '.claude/skills/traceability/SKILL.md']:
    if 'requirements-analysis' not in open(p, encoding='utf-8').read():
        errors.append(f'{p}: must reference the requirements-analysis skill instead of its own rules')
CHECKLIST_MARKER = 'max length + 1'  # a line of the §5 checklist: copies elsewhere drift
for p in glob.glob('.claude/**/*.md', recursive=True):
    if 'requirements-analysis' not in p and CHECKLIST_MARKER in open(p, encoding='utf-8').read():
        errors.append(f'{p}: copies the requirements-analysis checklist. Point to requirements-analysis §5 instead')

FOOTER = '🤖 _Generated by DevOps QA Agent — review before acting on this._'
for p in ['.claude/skills/bug-report/SKILL.md', '.claude/skills/session-report/SKILL.md',
          '.claude/agents/ci-diagnostician.md', '.claude/agents/user-story-enhancer.md']:
    if FOOTER not in open(p, encoding='utf-8').read():
        errors.append(f'{p}: Output Watermark footer missing')

if errors:
    print('\n'.join('✗ ' + e for e in errors)); sys.exit(1)
print(f"✅ {len(names['agent'])} agents, {len(names['skill'])} skills: frontmatter, names, CLAUDE.md references and watermarks OK")
