# Claude Code skills

This repository ships project-level [Claude Code](https://claude.com/claude-code) skills in `.claude/skills/`. Claude Code loads them automatically when it is opened in this repository; there is nothing to download for the skill files themselves.

| Skill | Use it for | Extra setup |
| --- | --- | --- |
| `ui-ux-pro-max` | Designing and reviewing frontend UI: layouts, palettes, typography, accessibility, component patterns | Python 3 (its search scripts run with `python`) |
| `graphify` | Asking questions about how the codebase fits together, via a local knowledge graph | The `graphify` CLI (below) |

Both are third-party skills. `graphify` is optional. `ui-ux-pro-max` is one of the three design skills that frontend work always uses (below).

## ui-ux-pro-max

The copy in `.claude/skills/` was installed with the older `uipro-cli`. That package is now stale: the CLI is published as [`ui-ux-pro-max-cli`](https://www.npmjs.com/package/ui-ux-pro-max-cli). Frontend developers install the current version in their user folder (below). A skill in your user folder wins over the repo's copy of the same name.

Try it from Claude Code with a request such as "design the dashboard layout for the Cebu Daily Brief". Its suggestions are generic, so check them against this project's stack (React, TypeScript, Tailwind) and conventions in `CLAUDE.md`.

## Frontend design skills

Frontend work always uses three skills: `ui-ux-pro-max`, [Impeccable](https://github.com/pbakaus/impeccable) (`impeccable`) and the [Motion AI Kit](https://motion.dev/docs/ai-kit) (`motion`). `CLAUDE.md` tells Claude Code to invoke all three on every frontend task, even when nobody asks.

Impeccable and Motion aren't shipped in this repo. Each developer installs them, and the current UI UX Pro Max, in their own user folder (`~/.claude/skills/`). The frontend handoff prompt has the agent do this on first use. The commands are under `<skills>` in [`docs/handoffs/frontend.md`](handoffs/frontend.md).

- **Impeccable:** its installer also adds a design hook that checks each UI file the agent edits. Its working files go in `.impeccable/`, which is gitignored.
- **Motion:** its installer, `npx motion-ai`, only runs in an interactive terminal, so the agent asks you to run it. Choose Global, then Claude Code. It also adds Motion's free docs-search server.

## graphify

[graphify](https://github.com/Graphify-Labs/graphify) builds a knowledge graph of the repository (files, imports, calls) so Claude Code can answer architecture questions without reading every file. Code is parsed locally; docs and images are summarised by your own Claude Code session.

To use it, install the CLI once per machine. The PyPI package name is `graphifyy` (double *y*); the command is `graphify`.

```bash
uv tool install graphifyy
```

Then, in Claude Code, run `/graphify .` to build the graph. Output goes to `graphify-out/`, which is gitignored because each developer builds their own. Run `graphify update .` to refresh it after code changes.

Without the CLI, the `/graphify` skill will not work, but nothing else is affected.

### Optional: search hooks

`graphify install --project` also writes `.claude/settings.json` with `PreToolUse` hooks that call `graphify` before every search and file read. These are **not committed**, because they would error for teammates who have not installed the CLI. If you want them, put the `hooks` block in your own `.claude/settings.local.json`, which is gitignored.
