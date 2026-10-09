// Installs (or removes) the session handoff for every Claude Code project on this machine.
//
//   node install.mjs             copy the scripts to ~/.claude/handoff and add the hooks
//                                and DISABLE_AUTO_COMPACT to ~/.claude/settings.json
//   node install.mjs --uninstall remove the hooks again (keeps ~/.claude/handoff)
//
// It also installs the /handoff skill (on | off | status) into ~/.claude/skills/handoff.
//
// Safe to run again: it updates the scripts and never duplicates the hooks.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = 'handoff/hook.mjs';
const EVENTS = { PostToolUse: { matcher: '*', timeout: 15 }, UserPromptSubmit: { timeout: 15 }, Stop: { timeout: 30 } };

export function mergeSettings(settings, hookPath, { uninstall = false } = {}) {
  const next = JSON.parse(JSON.stringify(settings || {}));
  next.hooks = next.hooks || {};
  const command = `node "${hookPath}"`;
  for (const [event, options] of Object.entries(EVENTS)) {
    const groups = (next.hooks[event] || [])
      .map((group) => ({ ...group, hooks: (group.hooks || []).filter((h) => !String(h.command || '').replace(/\\/g, '/').includes(MARKER)) }))
      .filter((group) => group.hooks.length > 0);
    if (!uninstall) {
      const group = { hooks: [{ type: 'command', command, timeout: options.timeout }] };
      if (options.matcher) group.matcher = options.matcher;
      groups.push(group);
    }
    if (groups.length) next.hooks[event] = groups;
    else delete next.hooks[event];
  }
  if (!Object.keys(next.hooks).length) delete next.hooks;
  next.env = next.env || {};
  if (uninstall) delete next.env.DISABLE_AUTO_COMPACT;
  else next.env.DISABLE_AUTO_COMPACT = '1';
  if (!Object.keys(next.env).length) delete next.env;
  return next;
}

function main() {
  const uninstall = process.argv.includes('--uninstall');
  const source = path.dirname(fileURLToPath(import.meta.url));
  const claudeDir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));
  const target = path.join(claudeDir, 'handoff');
  const settingsFile = path.join(claudeDir, 'settings.json');

  if (!uninstall && path.resolve(source) !== path.resolve(target)) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of ['handoff.mjs', 'hook.mjs', 'cli.mjs', 'README.md']) fs.copyFileSync(path.join(source, name), path.join(target, name));
    const skillDir = path.join(claudeDir, 'skills', 'handoff');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.copyFileSync(path.join(source, 'skill', 'SKILL.md'), path.join(skillDir, 'SKILL.md'));
    const config = path.join(target, 'config.json');
    if (!fs.existsSync(config)) fs.copyFileSync(path.join(source, 'config.json'), config);
  }

  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    } catch (error) {
      console.error(`Could not parse ${settingsFile} (${error.message}). Fix it and run again; nothing was changed.`);
      process.exit(1);
    }
    fs.copyFileSync(settingsFile, `${settingsFile}.handoff-backup`);
  }
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(settingsFile, `${JSON.stringify(mergeSettings(settings, path.join(target, 'hook.mjs'), { uninstall }), null, 2)}\n`);
  console.log(uninstall
    ? `Removed the handoff hooks from ${settingsFile}.`
    : `Installed. Scripts: ${target}. Hooks added to ${settingsFile} (backup: settings.json.handoff-backup). Applies to new Claude Code sessions in any project.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
