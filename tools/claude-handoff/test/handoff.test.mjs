import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { run } from '../cli.mjs';
import { checkGuard, claudeArgs, contextTokensFromTranscript, DEFAULT_CONFIG, dataDirFor } from '../handoff.mjs';
import { mergeSettings } from '../install.mjs';

const line = (entry) => JSON.stringify(entry);

describe('session handoff hook', () => {
  it('counts context from the latest main-thread assistant message', () => {
    const transcript = [
      line({ type: 'assistant', message: { model: 'm', usage: { input_tokens: 5 } } }),
      line({ type: 'assistant', message: { model: 'm', usage: { input_tokens: 10, cache_read_input_tokens: 70000, cache_creation_input_tokens: 5000, output_tokens: 990 } } }),
      line({ type: 'assistant', isSidechain: true, message: { model: 'm', usage: { input_tokens: 150000 } } }),
      line({ type: 'assistant', message: { model: '<synthetic>', usage: { input_tokens: 0 } } }),
      line({ type: 'user', message: { content: 'hi' } }),
      '{"partial line',
    ].join('\n');
    assert.equal(contextTokensFromTranscript(transcript), 76000);
    assert.equal(contextTokensFromTranscript(''), null);
  });

  it('limits chains and rapid relaunches', () => {
    const guard = DEFAULT_CONFIG.guard;
    const now = Date.now();
    assert.equal(checkGuard({ chain: 0, launches: [], now, guard }), null);
    assert.match(checkGuard({ chain: guard.maxChainLength, launches: [], now, guard }), /in a row/);
    assert.match(checkGuard({ chain: 1, launches: [{ at: now - 60_000 }], now, guard }), /minutes ago/);
    const hour = Array.from({ length: guard.maxLaunchesPerHour }, (_, i) => ({ at: now - (10 + i) * 60_000 }));
    assert.match(checkGuard({ chain: 1, launches: hour, now, guard }), /last hour/);
    assert.equal(checkGuard({ chain: 1, launches: [{ at: now - 2 * 60 * 60_000 }], now, guard }), null);
  });

  it('carries the permission mode into the new session', () => {
    const config = { ...DEFAULT_CONFIG, launch: { ...DEFAULT_CONFIG.launch } };
    assert.deepEqual(claudeArgs(config, { permission_mode: 'acceptEdits' }, 'go'), ['--permission-mode', 'acceptEdits', 'go']);
    assert.deepEqual(claudeArgs(config, { permission_mode: 'bypassPermissions' }, 'go'), ['--dangerously-skip-permissions', 'go']);
    assert.deepEqual(claudeArgs(config, { permission_mode: 'default' }, 'go'), ['go']);
  });
});

describe('install and switches', () => {
  it('adds the hooks once, keeps other settings, and removes them cleanly', () => {
    const existing = { model: 'opus', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo hi' }] }] } };
    const once = mergeSettings(existing, 'C:\\Users\\dev\\.claude\\handoff\\hook.mjs');
    const twice = mergeSettings(once, 'C:\\Users\\dev\\.claude\\handoff\\hook.mjs');
    assert.deepEqual(twice, once);
    assert.equal(once.model, 'opus');
    assert.equal(once.env.DISABLE_AUTO_COMPACT, '1');
    assert.equal(once.hooks.Stop.length, 2);
    assert.deepEqual(Object.keys(once.hooks).sort(), ['PostToolUse', 'Stop', 'UserPromptSubmit']);
    assert.deepEqual(mergeSettings(once, 'x/handoff/hook.mjs', { uninstall: true }), { model: 'opus', hooks: existing.hooks });
  });

  it('keeps runtime files next to a global install, inside the project for a local one', () => {
    assert.equal(dataDirFor('/work/app', '/home/u/.claude/handoff'), path.resolve('/home/u/.claude/handoff'));
    assert.equal(dataDirFor('/work/app', '/work/app/.claude/handoff'), path.join('/work/app', '.claude', 'handoff'));
  });

  it('switches a project on and off', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
    assert.match(run(['off'], dir), /off for this project/);
    assert.match(run(['status'], dir), /OFF here \(set for this project\)/);
    assert.match(run(['on'], dir), /on for this project/);
    assert.match(run(['status'], dir), /ON here/);
  });
});
