# Claude Code skills

This repository ships project-level [Claude Code](https://claude.com/claude-code) skills in `.claude/skills/`. Claude Code loads them automatically when it is opened in this repository; there is nothing to download for the skill files themselves.

| Skill | Use it for | Extra setup |
| --- | --- | --- |
| `ui-ux-pro-max` | Designing and reviewing frontend UI: layouts, palettes, typography, accessibility, component patterns | Python 3 (its search scripts run with `python`) |
| `graphify` | Asking questions about how the codebase fits together, via a local knowledge graph | The `graphify` CLI (below) |

Both are third-party skills. They are optional; nobody has to use them to work on the project.

## ui-ux-pro-max

Installed with [`uipro-cli`](https://www.npmjs.com/package/uipro-cli) (`uipro init --ai claude`). You only need `uipro-cli` to reinstall or update the skill, not to use it.

Try it from Claude Code with a request such as "design the dashboard layout for the Cebu Daily Brief". Its suggestions are generic, so check them against this project's stack (React, TypeScript, Tailwind) and conventions in `CLAUDE.md`.

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
