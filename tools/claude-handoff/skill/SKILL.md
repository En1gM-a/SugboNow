---
name: handoff
description: Turn the automatic session handoff on or off, or check it. Use when the user types /handoff, or asks to enable, disable, pause or check the automatic handoff to a new session at 35% context.
---

The automatic session handoff is always installed for every Claude Code session. It replaces compaction: at 35% context the agent wraps up, writes a handoff prompt, and a new session starts with it. This skill only switches it on or off.

Run the command that matches what the user asked, then tell them its output in one line.

- `/handoff status` (or no argument): `node "$HOME/.claude/handoff/cli.mjs" status`
- `/handoff on` or `/handoff off`: applies to this project. Run `node "$HOME/.claude/handoff/cli.mjs" on` or `off`.
- `/handoff off session` (or `on session`): this running session only. Add `--session`.
- `/handoff off all` (or `on all`): every project. Add `--global`.

On Windows use `%USERPROFILE%` or the full path to `.claude\handoff\cli.mjs` if `$HOME` does not expand. The change applies from the next tool call.

If the user asks to turn it off because it is interrupting right now, use `off --session`. If `~/.claude/handoff/cli.mjs` is missing, the handoff is not installed: tell them to run `node tools/claude-handoff/install.mjs` from the SugboNow repo root (see `docs/claude-handoff.md`).
