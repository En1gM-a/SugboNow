# claude-session-handoff

Hand off to a fresh Claude Code session at 35% context, instead of compacting.

When a session's context reaches 35%, this tells the agent to find a natural stopping point, save its
work to the proper files, and write a handoff prompt. It then detects the prompt, opens a new terminal
running `claude` with it, and stops the old session. No compaction, no copy and paste.

It runs as Claude Code hooks, so it works in every project once installed. Plain Node (18+; SugboNow already needs 20+), no dependencies.
Works on Windows, macOS and Linux.

## Install

From the SugboNow repo root (full guide: `docs/claude-handoff.md`):

```
node tools/claude-handoff/install.mjs
```

This copies the scripts to `~/.claude/handoff`, adds the hooks and `DISABLE_AUTO_COMPACT=1` to
`~/.claude/settings.json` (a backup is kept next to it) and installs the `/handoff` skill.
Start new Claude Code sessions afterwards; already-open ones won't pick the hooks up.
Run `node install.mjs` again to update. `node install.mjs --uninstall` removes the hooks.

## How it works

1. After every tool call and prompt, a hook reads the session transcript and works out how full the
   context window is.
2. At 35% it tells the agent to wrap up and write a handoff prompt to
   `~/.claude/handoff/pending/<session>.md`. At 50% it reminds once more. If the agent tries to stop
   without writing the file, it is asked once to write it.
3. When the agent stops with the file written, the file is moved to `~/.claude/handoff/archive/`, a new
   terminal window opens running `claude "Read <that file> and continue"` in the same folder and
   permission mode, and the old session is stopped. Close the old window when you like.

## Switching it

`/handoff status`, `/handoff on`, `/handoff off` (this project, stored in `.claude/handoff.local.json`),
add `session` to switch only the running session, or `all` for every project. The same from a shell:
`node ~/.claude/handoff/cli.mjs on|off|status [--session|--global]`.

Add `.claude/handoff.local.json` to your project's `.gitignore` if you don't want it committed.

## Config

Edit `~/.claude/handoff/config.json` (a project can have its own `.claude/handoff/config.json`).

| Key | Meaning |
| --- | --- |
| `thresholdPercent` | Context % that triggers the wrap-up (35). |
| `reminderPercent` | Second nudge if the agent is still going (50). |
| `contextWindowTokens` | Size of the model's window: 200000 by default. Set 1000000 for a 1M-context model, or the percentage will be wrong. |
| `launch.model` | Model for the new session (`null` keeps your default). |
| `launch.inheritPermissionMode` | Start the new session in the same permission mode. |
| `launch.extraArgs` | Extra `claude` arguments. |
| `launch.dryRun` | Log what would launch without opening a window (also `CLAUDE_HANDOFF_DRY_RUN=1`). |
| `guard.*` | Safety limits: at most 15 handoffs in a row, 4 per hour, none within 5 minutes of the last. When a limit is hit, the handoff file is kept and nothing launches. |

`CLAUDE_HANDOFF=off` in the environment turns it off for that run. Every warning and launch is logged to
`~/.claude/handoff/state/handoff.log`.

## Notes

- Only for Claude Code run on your own machine. Hosted or cloud sessions manage their own context.
- Context is measured from the token counts in the session transcript, as a share of
  `contextWindowTokens`.
- On macOS and Linux the new session opens in Terminal, or the first terminal emulator found.
  On Windows it opens a new console window.
- Tested: the unit tests (`npm test`), and a Windows run of the hook, the switches and opening the console
  window. A full live handoff depends on your Claude Code version's hook behavior; check the log if nothing opens.
