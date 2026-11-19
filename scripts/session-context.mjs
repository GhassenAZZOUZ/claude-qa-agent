// SessionStart hook for the plugin install. Plugins don't load CLAUDE.md, so this
// prints it (plain stdout becomes session context), with ${CLAUDE_PLUGIN_ROOT}
// resolved to the real install path. Claude Code caps hook context at 10,000
// characters; scripts/validate.py keeps CLAUDE.md under that.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rules = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8')
  .replaceAll('${CLAUDE_PLUGIN_ROOT}', root.replace(/\\/g, '/'));

process.stdout.write(
  `[QA QualiGate plugin is enabled: its skills and agents are named qa-agent:<name>, ` +
  `its GitLab tools mcp__plugin_qa-agent_gitlab__<tool>.]\n\n${rules}`,
);
