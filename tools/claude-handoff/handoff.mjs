// Automatic session handoff for Claude Code, used instead of compaction.
//
// Flow:
//   1. PostToolUse / UserPromptSubmit: read the session transcript, work out how
//      much of the context window is used, and once it passes the threshold
//      (35% by default) tell the agent to wrap up and write a handoff prompt.
//   2. The agent writes the prompt to .claude/handoff/NEXT_SESSION.md.
//   3. Stop: when that file exists, archive it, open a new terminal running
//      `claude` with "read the handoff and continue", and stop this session.
//
// Settings live in .claude/handoff/config.json. Turn the whole thing off with
// "enabled": false there, or CLAUDE_HANDOFF=off in the environment.
// Runtime state (per-session flags, launch history, log) is kept in
// .claude/handoff/state/, which is gitignored.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const DEFAULT_CONFIG = {
  enabled: true,
  thresholdPercent: 35,
  reminderPercent: 50,
  contextWindowTokens: 200000,
  handoffFile: '.claude/handoff/NEXT_SESSION.md',
  launch: { model: null, inheritPermissionMode: true, extraArgs: [], dryRun: false },
  guard: { maxChainLength: 15, maxLaunchesPerHour: 4, minMinutesBetweenLaunches: 5 },
};

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// Where runtime files live. Installed in a project (.claude/handoff inside it) they
// stay in that project. Installed globally (~/.claude/handoff) they stay there, so
// one copy serves every project and nothing is written into the repos.
export function dataDirFor(projectDir, scriptDir = SCRIPT_DIR) {
  const local = path.join(projectDir, '.claude', 'handoff');
  return path.resolve(scriptDir) === path.resolve(local) ? local : path.resolve(scriptDir);
}

let DATA_DIR = null;

export function loadConfig(projectDir) {
  let user = {};
  // A project's own config wins over the global one next to the script.
  for (const dir of [path.join(projectDir, '.claude', 'handoff'), dataDirFor(projectDir)]) {
    try {
      user = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
      break;
    } catch {
      // Missing or broken config: try the next one, then the defaults.
    }
  }
  const config = {
    ...DEFAULT_CONFIG,
    ...user,
    launch: { ...DEFAULT_CONFIG.launch, ...(user.launch || {}) },
    guard: { ...DEFAULT_CONFIG.guard, ...(user.guard || {}) },
  };
  const env = String(process.env.CLAUDE_HANDOFF || '').toLowerCase();
  if (['off', '0', 'false', 'no'].includes(env)) config.enabled = false;
  if (process.env.CLAUDE_HANDOFF_DRY_RUN === '1') config.launch.dryRun = true;
  return config;
}

// Tokens in the context window as of the latest main-thread assistant message:
// everything sent in (fresh + cache write + cache read) plus what it wrote.
export function contextTokensFromTranscript(text) {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('{')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== 'assistant' || entry.isSidechain) continue;
    const usage = entry.message?.usage;
    if (!usage || entry.message?.model === '<synthetic>') continue;
    return (usage.input_tokens || 0)
      + (usage.cache_creation_input_tokens || 0)
      + (usage.cache_read_input_tokens || 0)
      + (usage.output_tokens || 0);
  }
  return null;
}

function readTail(file, bytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buffer = Buffer.alloc(size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

export function contextPercent(transcriptPath, windowTokens) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
  let tokens = contextTokensFromTranscript(readTail(transcriptPath, 512 * 1024));
  if (tokens === null) tokens = contextTokensFromTranscript(readTail(transcriptPath, 8 * 1024 * 1024));
  if (tokens === null) return null;
  return { tokens, percent: Math.round((tokens / windowTokens) * 1000) / 10 };
}

export function wrapUpMessage(percent, config) {
  return [
    `[Session handoff] This session has used about ${percent}% of its context window (handoff threshold ${config.thresholdPercent}%).`,
    'We do not compact in this project. Instead this session hands off to a fresh one:',
    '1. Find a natural stopping point soon. Finish the small step you are on; do not start new large work.',
    '2. Record the work in the proper files in the codebase: code, docs and notes that should outlive this session. If a fix is finished and tested, ship it the way this project normally does.',
    `3. Write a self-contained handoff prompt for the next agent to \`${config.handoffFile}\`. Include: the goal, what is done (files, commits), the current state, the exact next steps, open questions or blockers, decisions and user preferences learned this session, gotchas, and the commands to verify things. Write it so a new agent with no memory of this conversation can carry on.`,
    '4. Then end your turn with a one-line summary. The handoff system detects the file and starts the next session automatically.',
    'If you are waiting on the user, put the open question in the handoff file too.',
  ].join('\n');
}

export function reminderMessage(percent, config) {
  return `[Session handoff] Context is now about ${percent}%. Wrap up and write the handoff prompt to \`${config.handoffFile}\` as soon as you reach a stopping point.`;
}

// Decide whether another automatic launch is allowed. Pure so it can be tested.
export function checkGuard({ chain, launches, now, guard }) {
  if (chain >= guard.maxChainLength) {
    return `this would be handoff number ${chain + 1} in a row (limit ${guard.maxChainLength})`;
  }
  const hourAgo = now - 60 * 60 * 1000;
  const recent = launches.filter((l) => l.at >= hourAgo);
  if (recent.length >= guard.maxLaunchesPerHour) {
    return `${recent.length} sessions were already launched in the last hour (limit ${guard.maxLaunchesPerHour})`;
  }
  const last = launches.reduce((max, l) => Math.max(max, l.at), 0);
  if (last && now - last < guard.minMinutesBetweenLaunches * 60 * 1000) {
    return `the previous handoff was less than ${guard.minMinutesBetweenLaunches} minutes ago`;
  }
  return null;
}

function stateDir(projectDir) {
  const dir = path.join(DATA_DIR || dataDirFor(projectDir), 'state');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function log(projectDir, message) {
  try {
    fs.appendFileSync(path.join(stateDir(projectDir), 'handoff.log'), `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Logging must never break the hook.
  }
}

function sessionStateFile(projectDir, sessionId) {
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_');
  return path.join(stateDir(projectDir), `session-${safe}.json`);
}

function loadSession(projectDir, sessionId) {
  const file = sessionStateFile(projectDir, sessionId);
  const state = readJson(file, null);
  if (state) return state;
  const fresh = { startedAt: Date.now() };
  writeJson(file, fresh);
  return fresh;
}

function saveSession(projectDir, sessionId, state) {
  writeJson(sessionStateFile(projectDir, sessionId), state);
}

function timestamp(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

function commandExists(name) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(finder, [name], { stdio: 'ignore' }).status === 0;
}

export function claudeArgs(config, input, prompt) {
  const args = [];
  if (config.launch.model) args.push('--model', config.launch.model);
  const mode = input.permission_mode;
  if (config.launch.inheritPermissionMode && mode && mode !== 'default' && mode !== 'plan') {
    if (mode === 'bypassPermissions') args.push('--dangerously-skip-permissions');
    else args.push('--permission-mode', mode);
  }
  args.push(...(config.launch.extraArgs || []));
  args.push(prompt);
  return args;
}

const quoteWin = (s) => (/^[A-Za-z0-9_./:=-]+$/.test(s) ? s : `"${s.replace(/"/g, '')}"`);
const quoteSh = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

// Opens a new terminal window running claude. Returns a description of what ran.
function launch(projectDir, config, args, chain) {
  const env = { ...process.env, CLAUDE_HANDOFF_CHAIN: String(chain) };
  // Claude Code refuses to start when CLAUDECODE=1 (it thinks it is nested),
  // and the other values belong to this session, not the next one.
  for (const key of ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_SSE_PORT', 'CLAUDE_PROJECT_DIR', 'CLAUDE_ENV_FILE']) {
    delete env[key];
  }
  if (process.platform === 'win32') {
    const claude = ['claude', ...args].map(quoteWin).join(' ');
    // A plain console window via `start`, so CLAUDE_HANDOFF_CHAIN reaches the new session.
    const command = `start "Claude (handoff)" /D "${projectDir}" cmd /k ${claude}`;
    if (!config.launch.dryRun) {
      spawn('cmd.exe', ['/d', '/s', '/c', `"${command}"`], {
        cwd: projectDir, env, detached: true, stdio: 'ignore', windowsVerbatimArguments: true, windowsHide: false,
      }).unref();
    }
    return command;
  }
  const shell = `cd ${quoteSh(projectDir)} && CLAUDE_HANDOFF_CHAIN=${chain} claude ${args.map(quoteSh).join(' ')}`;
  if (process.platform === 'darwin') {
    const script = `tell application "Terminal" to do script ${JSON.stringify(shell)}`;
    if (!config.launch.dryRun) spawn('osascript', ['-e', script], { env, detached: true, stdio: 'ignore' }).unref();
    return `osascript: ${shell}`;
  }
  const emulator = ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm'].find(commandExists);
  if (!emulator) return config.launch.dryRun ? `(no terminal found): ${shell}` : null;
  const emulatorArgs = emulator === 'gnome-terminal' ? ['--', 'bash', '-lc', shell] : ['-e', `bash -lc ${quoteSh(shell)}`];
  if (!config.launch.dryRun) spawn(emulator, emulatorArgs, { env, detached: true, stdio: 'ignore' }).unref();
  return `${emulator}: ${shell}`;
}

function onContextCheck(input, projectDir, config, eventName) {
  const usage = contextPercent(input.transcript_path, config.contextWindowTokens);
  if (!usage) return null;
  const session = loadSession(projectDir, input.session_id);
  let message = null;
  if (!session.warnedAt && usage.percent >= config.thresholdPercent) {
    session.warnedAt = Date.now();
    message = wrapUpMessage(usage.percent, config);
    log(projectDir, `session ${input.session_id}: ${usage.percent}% (${usage.tokens} tokens), asked agent to wrap up`);
  } else if (session.warnedAt && !session.remindedAt && config.reminderPercent && usage.percent >= config.reminderPercent) {
    session.remindedAt = Date.now();
    message = reminderMessage(usage.percent, config);
    log(projectDir, `session ${input.session_id}: ${usage.percent}%, reminded agent`);
  }
  if (!message) return null;
  saveSession(projectDir, input.session_id, session);
  return { hookSpecificOutput: { hookEventName: eventName, additionalContext: message } };
}

function onStop(input, projectDir, config) {
  const session = loadSession(projectDir, input.session_id);
  if (session.handedOff) return null;
  const handoffPath = path.resolve(projectDir, config.handoffFile);
  let written = false;
  try {
    // Only a file written during this session counts, so a stale one from a
    // crashed session cannot trigger a launch on its own.
    written = fs.statSync(handoffPath).mtimeMs >= session.startedAt - 1000;
  } catch {
    written = false;
  }

  if (!written) {
    if (!session.warnedAt || session.stopBlocked) return null;
    session.stopBlocked = true;
    saveSession(projectDir, input.session_id, session);
    if (input.stop_hook_active) return null;
    return {
      decision: 'block',
      reason: `Context is past the handoff threshold. Before stopping, record your work and write the handoff prompt to \`${config.handoffFile}\` (see the earlier [Session handoff] note), then end your turn.`,
    };
  }

  const chain = Number(process.env.CLAUDE_HANDOFF_CHAIN || 0) + 1;
  const launchesFile = path.join(stateDir(projectDir), 'launches.json');
  const launches = readJson(launchesFile, []);
  const blocked = checkGuard({ chain: chain - 1, launches, now: Date.now(), guard: config.guard });
  if (blocked) {
    session.handedOff = 'refused';
    saveSession(projectDir, input.session_id, session);
    log(projectDir, `session ${input.session_id}: launch refused, ${blocked}`);
    return {
      systemMessage: `Handoff written to ${config.handoffFile}, but no new session was started because ${blocked}. Start one yourself with: claude "Read ${config.handoffFile} and continue the work it describes."`,
    };
  }

  const archiveDir = path.join(DATA_DIR, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  const archivedName = `${timestamp()}-${String(input.session_id || 'session').slice(0, 8)}.md`;
  fs.renameSync(handoffPath, path.join(archiveDir, archivedName));
  // Project installs use a project-relative path; global installs use an absolute one.
  const archivedRel = DATA_DIR.startsWith(path.resolve(projectDir)) ? path.relative(projectDir, path.join(archiveDir, archivedName)).split(path.sep).join('/') : path.join(archiveDir, archivedName);
  const prompt = `Read ${archivedRel} (the handoff from the previous session) and continue the work it describes.`;
  const args = claudeArgs(config, input, prompt);

  let ran = null;
  try {
    ran = launch(projectDir, config, args, chain);
  } catch (error) {
    log(projectDir, `session ${input.session_id}: launch failed, ${error}`);
  }
  session.handedOff = Date.now();
  saveSession(projectDir, input.session_id, session);
  launches.push({ at: Date.now(), from: input.session_id, chain });
  writeJson(launchesFile, launches.slice(-50));
  if (!ran) {
    return {
      systemMessage: `Handoff saved to ${archivedRel}, but no terminal could be opened. Start the next session with: claude "${prompt}"`,
    };
  }
  log(projectDir, `session ${input.session_id}: handed off (chain ${chain})${config.launch.dryRun ? ' [dry run]' : ''}: ${ran}`);
  if (config.launch.dryRun) {
    return { systemMessage: `[dry run] Would start the next session with: ${ran}` };
  }
  return {
    continue: false,
    stopReason: `Handed off to a new Claude session (handoff ${chain} in this chain), using ${archivedRel}. You can close this window.`,
  };
}

export function handle(input, projectDir) {
  DATA_DIR = dataDirFor(projectDir);
  const localDir = path.join(projectDir, '.claude', 'handoff');
  // A project with its own copy handles itself; the global one stays out of the way.
  if (DATA_DIR !== localDir && fs.existsSync(path.join(localDir, 'hook.mjs'))) return null;
  const config = loadConfig(projectDir);
  // /handoff on|off for this project beats the config files; /handoff off --session beats both.
  const override = readJson(path.join(projectDir, '.claude', 'handoff.local.json'), {});
  if (typeof override.enabled === 'boolean') config.enabled = override.enabled;
  if (!config.enabled) return null;
  if (input.session_id && loadSession(projectDir, input.session_id).disabled) return null;
  if (input.session_id) {
    writeJson(path.join(stateDir(projectDir), 'last-session.json'), { projectDir: path.resolve(projectDir), sessionId: input.session_id, at: Date.now() });
  }
  if (DATA_DIR !== path.join(projectDir, '.claude', 'handoff') && config.handoffFile === DEFAULT_CONFIG.handoffFile) {
    // Global install: one file per session, outside the repo, so projects never collide.
    const safe = String(input.session_id || 'session').replace(/[^A-Za-z0-9_-]/g, '_');
    config.handoffFile = path.join(DATA_DIR, 'pending', `${safe}.md`);
    fs.mkdirSync(path.dirname(config.handoffFile), { recursive: true });
  }
  const event = input.hook_event_name;
  if (event === 'PostToolUse' || event === 'UserPromptSubmit') return onContextCheck(input, projectDir, config, event);
  if (event === 'Stop') return onStop(input, projectDir, config);
  return null;
}

export async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  try {
    const output = handle(input, projectDir);
    if (output) process.stdout.write(JSON.stringify(output));
  } catch (error) {
    log(projectDir, `hook error (${input.hook_event_name}): ${error?.stack || error}`);
  }
}
