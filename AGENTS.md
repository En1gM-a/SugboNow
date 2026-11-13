# Sugbo Now — Agent Instructions

Shared repository instructions discovered natively by Antigravity across the repo and swarm worktrees. Keep changes focused, verified, and consistent with [`CLAUDE.md`](CLAUDE.md).

## Project Overview

- **Sugbo Now** is a Cebu Daily Intelligence Platform (`https://github.com/En1gM-a/SugboNow`).
- **Two independent applications** with separate `package.json`, `package-lock.json`, and `node_modules` (do not combine into an npm workspace):
  - `frontend/` — React + TypeScript + Vite + Tailwind CSS client.
  - `backend/` — Node 22 (`.nvmrc`) + Express + TypeScript API server and scheduled ingestion jobs.
  - `supabase/` — Postgres migrations, Row-Level Security (RLS) policies, and `seed.sql`.
- **REST contract:** `frontend/` and `backend/` communicate solely through [`docs/api-contract.md`](docs/api-contract.md). Update the contract before changing API request/response shapes.
- **Golden rule:** Browser users must never trigger calls to external data providers. Scheduled backend jobs ingest data into Supabase, and the REST API reads from Supabase.
- **Approved exception:** `POST /api/lgu-posts/refresh` checks the authenticated user's subscribed LGU Facebook page from the backend (throttled per page, falling back to saved posts on failure).

## Antigravity Swarm Setup

### Model & Concurrency

- **Orchestrator (`coordinator`):** `Gemini 4 Hydrogen (XHigh)` (`gemini-4-hydrogen-xhigh`).
- **Subagents / Workers:** `Gemini 4 Hydrogen (XHigh)` (`gemini-4-hydrogen-xhigh`). Leave `model` unset on `swarm{action:"add"}` to inherit the coordinator's model (or pass `gemini-4-hydrogen-xhigh` explicitly).
- **Concurrency limit:** Run at most **5** concurrent subagents so the swarm stays lean and token-efficient.

### Workspaces & Ownership

- **Authors (`workspace: "share"`):** Give every file-editing worker its own shared worktree and strictly disjoint file ownership (never allow two workers to edit the same file).
- **Readers & `verifier` (`workspace: "inherit"`):** Read-only investigators and the `verifier` run in the inherited workspace and must never edit files.
- **Landing before cleanup:** Always verify worker commits via `verifier` and land/cherry-pick them into the target branch **before** calling `kill` on workers (killing deletes `share` and `branch` workspaces).
- **Message board discipline:** Post concrete results (workspace path, commit SHA, checks run) and tag only the next acting peer (`@verifier`, or `@coordinator` only when verified/blocked).

## Verification & Hygiene

### Local Commands

Run and pass all relevant checks before committing or handing off to `@verifier`:

```bash
npm --prefix frontend run lint      # eslint . --max-warnings=0
npm --prefix backend run lint       # eslint . --max-warnings=0
npm --prefix frontend run build
npm --prefix backend run build
npm --prefix backend test
npx --prefix frontend prettier --check <changed-files>
```

### Code & Boundary Rules

- **Zero-warning ESLint:** Both apps enforce `eslint . --max-warnings=0`.
- **No explicit `any`:** `@typescript-eslint/no-explicit-any` is `'error'` across both `frontend/` and `backend/`.
- **Cross-boundary imports forbidden:** `frontend/eslint.config.mjs` enforces `no-restricted-imports` blocking `**/backend/**` and direct `@supabase/supabase-js` `createClient` service-role patterns.
- **Formatting & line endings:** All text files must use LF line endings (`.gitattributes` enforces `* text=auto eol=lf`) with no UTF-8 BOM (`efbbbf`).

### PR & Windows Hygiene (`scripts/ci/check-pr-hygiene.sh`)

- **Branch prefixes:** `frontend/`, `backend/`, `docs/`, `chore/`, `supabase/`, `fix/`, or `feat/` (`<area>/<topic>`).
- **PR title:** Conventional Commits with a lowercase summary (`type(scope): lowercase summary`).
- **PR body:** Non-empty, based on `.github/pull_request_template.md`, with all `<!-- ... -->` HTML comments removed.
- **Windows PowerShell 5.1 warning:** Never use `Out-File`, `>`, or `Set-Content` for commit messages or PR bodies (they inject UTF-8 BOM or UTF-16). Use `git commit -m`, Git Bash heredoc `<<'EOF'`, or `[IO.File]::WriteAllText(..., [Text.UTF8Encoding]::new($false))`, and quote backticks and `$` carefully.

## Gated Actions (Require Explicit User `"yes"`)

Follow the full approval policy in [`CLAUDE.md`](CLAUDE.md). Never run any of the following without an explicit `"yes"` from the user:

- **Git remote & destructive actions:** `git push`, opening/merging/closing PRs, deleting remote branches, `reset --hard`, `push --force`, `rebase`, `branch -D`, `clean`.
- **CI, secrets & config:** Editing `.github/` workflows or rulesets, `.env` files, `.mcp.json`, or running `scripts/apply-github-security.ps1`.
- **Dependencies:** Adding, removing, or upgrading npm packages.
- **Live database & external writes:** Mutating Supabase schema, data, RLS policies, functions, grants, or project settings (provide SQL for the user unless explicitly told otherwise), or publishing external comments/deploys.

## Source-of-Truth Links

- [`CLAUDE.md`](CLAUDE.md) — full architecture, conventions, team ownership, and permission rules.
- [`README.md`](README.md) — project overview, local setup, data sources, schedules, and roadmap.
- [`docs/api-contract.md`](docs/api-contract.md) — frontend/backend REST API contract.
- [`docs/git-workflow.md`](docs/git-workflow.md) — branching, rebasing, PowerShell BOM tips, pre-push verification, and ruleset rationale.
- [`docs/handoffs/frontend.md`](docs/handoffs/frontend.md) — frontend UI/UX spec, design system, and required skills (`ui-ux-pro-max`, `impeccable`, `motion`).
