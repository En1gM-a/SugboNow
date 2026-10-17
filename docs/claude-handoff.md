# Claude Code session handoff

Optional tooling for teammates who use [Claude Code](https://claude.com/claude-code). The files live in
[`tools/claude-handoff/`](../tools/claude-handoff/).

Long Claude Code sessions normally get **auto-compacted** when the context window fills up, and the agent
loses detail. This tool replaces that: when a session reaches **35% context**, the agent is told to wrap
up, save its work and write a handoff prompt. The tool then opens a new terminal running a fresh `claude`
session with that prompt, and stops the old one. No compaction, no copy and paste.

---

## Prerequisites

- Claude Code (CLI) on your own machine. Cloud/hosted sessions manage their own context and ignore this.
- Node.js 18+ (SugboNow already requires 20+). No npm install needed; the scripts have no dependencies.
- Windows, macOS or Linux.

## Install (once per machine)

From the SugboNow repo root:

```bash
node tools/claude-handoff/install.mjs
```

This:

1. Copies the scripts to `~/.claude/handoff/` (on Windows `%USERPROFILE%\.claude\handoff\`).
2. Adds three hooks (`PostToolUse`, `UserPromptSubmit`, `Stop`) and `DISABLE_AUTO_COMPACT=1` to your
   **user** settings, `~/.claude/settings.json`. Existing settings and hooks are kept, and a backup is
   written to `~/.claude/settings.json.handoff-backup`.
3. Installs the `/handoff` skill to `~/.claude/skills/handoff/`.

Then **start a new Claude Code session**. Sessions that were already open don't pick up new hooks.

> It's a user-level install, so it applies to **every** project you open in Claude Code, not only
> SugboNow. Turn it off per project with `/handoff off` (see below) if you don't want it somewhere.

Check it worked, inside Claude Code:

```
/handoff status
```

or from a shell: `node ~/.claude/handoff/cli.mjs status`. Expect `Session handoff is ON here ...`.

### Update / uninstall

- **Update** after this folder changes: `git pull`, then run `node tools/claude-handoff/install.mjs` again.
  It overwrites the scripts and never duplicates the hooks. Your `config.json` is kept.
- **Uninstall:** `node tools/claude-handoff/install.mjs --uninstall`. Removes the hooks and
  `DISABLE_AUTO_COMPACT` from your settings (auto-compact comes back). You can then delete
  `~/.claude/handoff/` and `~/.claude/skills/handoff/` by hand.

---

## Using it

Normally you do nothing. Work as usual; at 35% the agent wraps up and a new terminal window opens with
the next session already running. Close the old window when you like.

| You want to | In Claude Code | From a shell |
| --- | --- | --- |
| Check if it's on | `/handoff status` | `node ~/.claude/handoff/cli.mjs status` |
| Turn off for this project | `/handoff off` | `node ~/.claude/handoff/cli.mjs off` |
| Turn off just this session (e.g. it's interrupting right now) | `/handoff off session` | `... off --session` |
| Turn off everywhere | `/handoff off all` | `... off --global` |
| Turn back on | `/handoff on` (+ `session` / `all`) | `... on [--session\|--global]` |
| Skip it for one run | start Claude with `CLAUDE_HANDOFF=off` | |
| Hand off early | ask the agent to write its handoff file and stop | |

`/handoff off` (project level) writes `.claude/handoff.local.json` in the repo. It's gitignored here, so
it stays personal.

Manual `/compact` still works.

### Where files go

Everything lives under `~/.claude/handoff/`; nothing is written into the repo except the optional
`.claude/handoff.local.json` switch.

| Path | What |
| --- | --- |
| `pending/<session-id>.md` | The handoff prompt the agent is writing. |
| `archive/<timestamp>-<id>.md` | Handoffs that were launched. The new session is started with `Read <this file> (the handoff from the previous session) and continue the work it describes.` |
| `state/handoff.log` | Every warning, launch and refusal. Look here first if nothing opens. |
| `config.json` | Your settings (below). |

### Settings

Edit `~/.claude/handoff/config.json`:

| Key | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Global on/off. |
| `thresholdPercent` | `35` | Context % that triggers the wrap-up. |
| `reminderPercent` | `50` | Second nudge if the agent keeps going. |
| `contextWindowTokens` | `200000` | Your model's window. **Set `1000000` if you use a 1M-context model**, or the percentage will be off. |
| `launch.model` | `null` | Model for the new session (`null` = your default). |
| `launch.inheritPermissionMode` | `true` | New session starts in the same permission mode. |
| `launch.extraArgs` | `[]` | Extra `claude` CLI arguments. |
| `launch.dryRun` | `false` | Log what would launch without opening a window (also `CLAUDE_HANDOFF_DRY_RUN=1`). |
| `guard.*` | 15 / 4 / 5 | Safety limits: max 15 handoffs in a row, 4 per hour, none within 5 minutes of the last. When hit, the handoff file is kept and nothing launches; start it yourself with the command in the message. |

### Troubleshooting

- **Nothing happens at 35%.** Was the session started after installing? Run `/handoff status`, then read
  `~/.claude/handoff/state/handoff.log`.
- **Percent looks wrong.** Fix `contextWindowTokens` for your model.
- **No new window opens.** Check the log. On Linux it uses the first terminal emulator it finds; on macOS,
  Terminal. A guard limit may also have been hit; the message tells you the command to run by hand.
- **`/handoff` says it isn't installed.** Run `node tools/claude-handoff/install.mjs` from the repo root.

---

## For agents

If you are an AI agent working in this repo, this section is for you.

**When a message starting with `[Session handoff]` appears** (injected by a hook after a tool call or a
prompt), the session has passed the context threshold. Do this:

1. **Stop at a natural point soon.** Finish the small step you're on. Don't start new large work.
2. **Record the work in the codebase** — code, docs and notes that should outlive the session. If a fix is
   finished and tested, ship it the way this repo normally does (branch + PR into `main`; never push to
   `main` directly). Don't commit, push or merge anything the user hasn't asked for.
3. **Write the handoff prompt to the exact path given in the message** (usually
   `~/.claude/handoff/pending/<session-id>.md`). Make it self-contained, for an agent with no memory of
   this conversation:
   - **Goal** — what the user asked for, in their words if possible.
   - **Done** — files changed, branches, commits, PR numbers.
   - **Current state** — what works, what is half-done, uncommitted changes.
   - **Next steps** — exact, ordered.
   - **Open questions / blockers** — including anything you are waiting on the user for.
   - **Decisions and user preferences** learned this session.
   - **Gotchas** — traps you hit (paths, env, tooling).
   - **Verify** — commands to check the state (`git status`, `npm run build`, `npm --prefix backend test`, ...).
4. **End your turn with a one-line summary.** Don't keep working. The hook detects the file, opens a new
   session with it and stops this one.

A `[Session handoff] Context is now about 50%` message is a second reminder: write the file now. If you
try to stop without writing it, the `Stop` hook asks you once to write it first.

**When a new session starts with "Read `<file>` (the handoff from the previous session) and continue ...":** read that file
first, run its verify commands to confirm the state, then carry on with the next steps. Treat its
"preferences" section as the user's instructions.

**When the user types `/handoff ...`** or asks to pause/enable/check the handoff, use the `handoff` skill: it
runs `node ~/.claude/handoff/cli.mjs on|off|status [--session|--global]` and reports the output in one line.
If they want it off because it's interrupting right now, use `off --session`.
