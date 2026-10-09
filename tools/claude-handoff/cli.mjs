// /handoff on | off | status, for the current project (default), this session, or every project.
//
//   node cli.mjs off              turn the handoff off for this project (.claude/handoff.local.json)
//   node cli.mjs off --session    turn it off for the running session only
//   node cli.mjs off --global     turn it off everywhere (the global config.json)
//   node cli.mjs on [...]         the same, to turn it back on
//   node cli.mjs status

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDirFor, loadConfig } from './handoff.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function run(args, projectDir) {
  const [action, ...flags] = args;
  const dataDir = dataDirFor(projectDir, SCRIPT_DIR);
  const sessionFile = (id) => path.join(dataDir, 'state', `session-${String(id).replace(/[^A-Za-z0-9_-]/g, '_')}.json`);

  if (action === 'on' || action === 'off') {
    const enabled = action === 'on';
    if (flags.includes('--global')) {
      const file = path.join(dataDir, 'config.json');
      writeJson(file, { ...readJson(file, {}), enabled });
      return `Session handoff is ${action} globally (${file}). Projects with their own on/off setting keep it.`;
    }
    if (flags.includes('--session')) {
      const last = readJson(path.join(dataDir, 'state', 'last-session.json'), null);
      if (!last || path.resolve(last.projectDir) !== path.resolve(projectDir)) {
        return 'No running session was seen in this project yet, so I cannot tell which one to change. Send one more message and try again.';
      }
      const file = sessionFile(last.sessionId);
      writeJson(file, { startedAt: Date.now(), ...readJson(file, {}), disabled: !enabled });
      return `Session handoff is ${action} for this session only.`;
    }
    const file = path.join(projectDir, '.claude', 'handoff.local.json');
    writeJson(file, { ...readJson(file, {}), enabled });
    return `Session handoff is ${action} for this project (${file}). It applies from the next tool call.`;
  }

  const config = loadConfig(projectDir);
  const override = readJson(path.join(projectDir, '.claude', 'handoff.local.json'), {});
  const last = readJson(path.join(dataDir, 'state', 'last-session.json'), null);
  const sessionOff = last && path.resolve(last.projectDir) === path.resolve(projectDir) && readJson(sessionFile(last.sessionId), {}).disabled;
  const on = (typeof override.enabled === 'boolean' ? override.enabled : config.enabled) && !sessionOff;
  const why = sessionOff ? 'turned off for this session'
    : typeof override.enabled === 'boolean' ? 'set for this project'
    : 'global setting';
  return `Session handoff is ${on ? 'ON' : 'OFF'} here (${why}). Threshold ${config.thresholdPercent}% of ${config.contextWindowTokens} tokens. Log: ${path.join(dataDir, 'state', 'handoff.log')}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!['on', 'off', 'status'].includes(args[0])) {
    console.error('Usage: cli.mjs on|off|status [--session|--global]');
    process.exit(2);
  }
  console.log(run(args, process.env.CLAUDE_PROJECT_DIR || process.cwd()));
}
