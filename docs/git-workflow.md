# Git Workflow and Merge Conflict Prevention

This guide defines the Git workflow, branching conventions, and conflict-resolution strategies for the **Sugbo Now** repository. Following these practices ensures clean linear history, prevents stale branches, and avoids merge conflicts across frontend, backend, and documentation work.

---

## 1. Branching Strategy & PR Hygiene

### Always branch from fresh `origin/main`

Before starting any new feature, bugfix, or chore, ensure you are branching from the latest remote `main`:

```bash
git fetch origin
git switch -c <area>/<topic> origin/main
```

### Branch Naming Conventions (`scripts/ci/check-pr-hygiene.sh`)

Branch names must use conventional area prefixes followed by a short, descriptive topic in lowercase joined by hyphens:

- `frontend/<topic>` — e.g. `frontend/dashboard-layout`
- `backend/<topic>` — e.g. `backend/weather-api`
- `docs/<topic>` — e.g. `docs/api-contract-update`
- `chore/<topic>` — e.g. `chore/ci-hardening`
- `supabase/<topic>` — e.g. `supabase/migration-lgu-posts`
- `fix/<topic>` — e.g. `fix/auth-redirect`
- `feat/<topic>` — e.g. `feat/alert-preview`

Branch names are validated in CI against `^(frontend|backend|docs|chore|supabase|fix|feat)/[a-z0-9-]+$` (automated dependency branches matching `^dependabot/` are also permitted). Branches that do not follow this naming structure will fail CI.

### PR Title Format (Conventional Commits)

Pull request titles must follow the Conventional Commits specification:

```text
type(scope): lowercase summary
```

or without scope:

```text
type: lowercase summary
```

- **Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Scope (optional):** lowercase identifier indicating the component or module touched (e.g. `frontend`, `backend`, `ci`, `weather-api`).
- **Summary rules:**
  - Written in the imperative mood (e.g. "add", not "added" or "adds").
  - Must begin with a **lowercase letter** (e.g. `feat(frontend): add weather hourly strip`).
  - Must **not** end with a period.
  - Breaking changes may append `!` before the colon (e.g. `feat(api)!: require auth header`).
- **Why this is enforced:** GitHub uses **Squash and Merge**. The PR title becomes the subject line of the squash commit on `main`. Enforcing this format guarantees a consistent, human-readable commit history and automated changelog generation.
- **CI enforcement:** Validated by `scripts/ci/check-pr-hygiene.sh` with regex:
  `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._-]+\))?!?: (?![A-Z]).+`

### PR Body Hygiene and Template Comments

When creating a pull request from `.github/pull_request_template.md`:

1. **Non-empty description:** Every PR must provide context on the problem solved, changes made, and verification steps. Empty PR bodies fail CI.
2. **Remove template comments:** You **must delete all HTML comments** (`<!-- ... -->`) from the PR template before submitting. Leaving comment placeholders pollutes the PR conversation and squashed commit messages.
3. **Fill out checklist items:** Ensure required sections (summary, testing evidence, checklist) are completed.

### Windows PowerShell UTF-8 BOM Warning & Shell Quoting

Windows PowerShell 5.1 has known quirks with text encoding and character expansion that can corrupt commit messages and PR metadata:

#### 1. The UTF-8 Byte Order Mark (BOM) Issue

By default, Windows PowerShell 5.1's `Out-File`, redirection operator `>`, and `Set-Content` write files with a UTF-8 Byte Order Mark (BOM: `efbbbf`) or in UTF-16 LE encoding.

- Git and GitHub Actions treat the BOM as unexpected binary bytes at the start of strings.
- CI (`scripts/ci/check-pr-hygiene.sh`) rejects any PR title or PR body starting with a BOM (`efbbbf`).
- **Safe practices:**
  - **Short messages:** Use `git commit -m "type(scope): lowercase summary"` directly in your terminal (safe in any shell).
  - **Long messages or PR bodies:**
    - Write and save the file in your code editor explicitly saved as **UTF-8 without BOM**.
    - In Git Bash, use a quoted heredoc (`<<'EOF'`):
      ```bash
      cat <<'EOF' > msg.txt
      feat(frontend): add weather forecast hourly strip

      Renders hourly weather forecast cards with precipitation probabilities.
      EOF
      git commit -F msg.txt
      ```
    - In PowerShell 5.1 (if scripting file generation), use the .NET API to force UTF-8 without BOM:
      ```powershell
      [IO.File]::WriteAllText("$PWD/msg.txt", $text, [Text.UTF8Encoding]::new($false))
      git commit -F msg.txt
      ```
  - **Never use in PowerShell 5.1:** `$text | Out-File msg.txt`, `$text > msg.txt`, or `Set-Content msg.txt $text`.

#### 2. Shell Quoting Pitfalls (Backticks `` ` `` and `$`)

Both Windows PowerShell and Git Bash interpolate characters inside double quotes before `git` or `gh` receives them:

- **PowerShell:** Treats backtick `` ` `` as an escape character (e.g. `` `name` `` becomes a newline followed by `name`), and expands `$var` as a variable (usually replacing it with an empty string).
- **Git Bash:** Treats backticks as command substitution and expands `$var` as environment variables.
- **Guideline:** For commit messages, PR descriptions, or CLI arguments containing backticks (markdown code spans) or `$` symbols:
  - Enclose the argument in single quotes (in PowerShell, use `''` to represent a literal apostrophe).
  - Use a PowerShell single-quoted here-string (`@'...'@`) or Git Bash quoted heredoc (`<<'EOF'`).
  - Or draft the text in a file (UTF-8 without BOM) and pass it with `-F <file>`.

### Keep local `main` untouched

Never commit directly to `main`. The `protect-main` ruleset rejects direct pushes, non-fast-forward updates, and non-linear history.

Keep your local `main` synchronized with `origin/main`:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

---

## 2. Rebase Instead of Merge

The repository enforces **Squash and Merge** on GitHub and **Required Linear History** (`required_linear_history: true`).

- **Do NOT run `git merge main`** into your feature branch. Merge commits clutter git history and make rebasing more painful.
- **Always update your branch with rebase:**

```bash
git fetch origin
git rebase origin/main
```

If you have already pushed your branch to GitHub before rebasing, update the remote branch using `--force-with-lease`:

```bash
git push --force-with-lease origin <area>/<topic>
```

### Clean up merged branches

Once your PR has been squash-merged into `main`:

```bash
git fetch --prune
git branch -d <area>/<topic>
```

---

## 3. Keep PRs Small and Coordinate Shared Files

1. **Short-lived, single-purpose PRs**: Aim for pull requests that take hours or 1–2 days, rather than weeks. Smaller diffs are reviewed faster and rarely conflict.
2. **Independent workspaces**: `frontend/` and `backend/` have separate dependencies, manifests, and build pipelines. When working on frontend features, do not modify files in `backend/` (and vice-versa).
3. **Coordinate on shared files**:
   - Repository-level configs (`.github/`, `.nvmrc`, `.gitattributes`)
   - Cross-cutting documentation (`AGENTS.md`, `CLAUDE.md`, `README.md`)
   - Schema and contract files (`docs/api-contract.md`, `supabase/migrations/`)

   If your task requires changing shared files, communicate with teammates beforehand to avoid simultaneous conflicting PRs.

---

## 4. Node Version Consistency & Lockfile Conflicts

### Use Node 22 (.nvmrc)

All developers and CI must use Node 22 (`.nvmrc` specifies `22`). Different Node or npm versions can generate formatting discrepancies in `package-lock.json` and cause unexpected churn or CI failures.

Check your Node version with:

```bash
node -v   # Should be v22.x
```

If you use nvm:

```bash
nvm use
```

### Resolving `package-lock.json` conflicts during rebase

Never attempt to manually resolve line-by-line git conflicts in `package-lock.json`. Instead, accept the version from `origin/main` and regenerate the lockfile cleanly:

1. When git pauses rebase due to a lockfile conflict:
   ```bash
   git checkout --theirs frontend/package-lock.json
   # or for backend:
   git checkout --theirs backend/package-lock.json
   ```
2. Re-install packages to update the lockfile with your branch's changes:
   ```bash
   # For frontend:
   cd frontend && npm install && cd ..
   # For backend:
   cd backend && npm install && cd ..
   ```
3. Stage the resolved lockfile and continue rebase:
   ```bash
   git add frontend/package-lock.json
   # or: git add backend/package-lock.json
   git rebase --continue
   ```

---

## 5. Pre-Push Verification

Before pushing your branch or requesting review, run formatters and linters locally. CI will enforce these checks with zero tolerance for warnings or formatting errors.

```bash
# Format code with Prettier
npm --prefix frontend run format
npm --prefix backend run format

# Run ESLint checks (zero warnings allowed: --max-warnings=0)
npm --prefix frontend run lint
npm --prefix backend run lint

# Run builds and tests
npm --prefix frontend run build
npm --prefix backend run build
npm --prefix backend test
```

### Zero-Warning ESLint Policy (`--max-warnings=0`)

Both `frontend` and `backend` lint scripts enforce `eslint . --max-warnings=0`. CI will fail if any ESLint warnings or errors are detected.

Key architectural rules enforced by ESLint:

- **No explicit `any`:** `@typescript-eslint/no-explicit-any` is configured to `'error'` across both frontend and backend. Use proper type definitions, generics, or `unknown` with type narrowing instead of `any`.
- **Cross-boundary imports forbidden:** `frontend/eslint.config.mjs` enforces `no-restricted-imports` preventing `frontend/src/**` from importing anything from `backend/` (`**/backend/**`). Frontend and backend are decoupled applications communicating solely over HTTP via `docs/api-contract.md`.
- **No service-role client in frontend:** Frontend code must not import or initialize Supabase service-role clients or keys (`@supabase/supabase-js` `createClient` with service-role patterns). Client-side access must strictly use public anon keys governed by Row Level Security (RLS).

> In CI, Prettier runs against all files added or modified in the PR (`scripts/ci/changed-files.sh | xargs -0 -r npx prettier --check --ignore-unknown --`), while ESLint runs across the entire application with `--max-warnings=0`.

---

## 6. Repository Admin Settings (`@En1gM-a`)

This section documents key repository settings managed by repository administrators.

### 1. Enable GitHub Auto-merge

Enable auto-merge on the repository so PRs merge automatically as soon as approvals and required status checks pass:

```bash
gh api -X PATCH repos/En1gM-a/SugboNow -f allow_auto_merge=true
```

Once enabled, developers can click "Enable auto-merge" (or run `gh pr merge --auto --squash`) as soon as their PR is ready, avoiding manual follow-up once CI finishes.

### 2. Branch Protection Ruleset (`protect-main.json`)

The repository ruleset (`.github/rulesets/protect-main.json`) configures branch protection for `main`:

```json
{
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "frontend" },
          { "context": "backend" }
        ]
      }
    }
  ]
}
```

#### Why `strict_required_status_checks_policy: false` and `require_last_push_approval: false`

The repository previously evaluated strict required status checks (`strict_required_status_checks_policy: true`), which mandated that every PR branch be strictly up to date with the latest tip of `main` before merging.

However, in combination with `dismiss_stale_reviews_on_push: true` and `required_linear_history: true`, strict status checks caused a severe developer bottleneck:

1. Whenever **any** PR squash-merged into `main`, every other currently open and approved PR immediately fell behind and became "out of date".
2. Rebasing the branch against updated `origin/main` registered as a new push on GitHub, which triggered `dismiss_stale_reviews_on_push: true`.
3. This wiped out existing approvals on every open PR, requiring another round of manual review approvals and another full CI run.
4. If another teammate merged during that window, the rebase cycle repeated indefinitely.

Following the ruleset architecture battle-tested in `dreeyanzz/studyhub`:

- **`strict_required_status_checks_policy: false`**: Allows orthogonal pull requests (e.g. an independent frontend feature and a backend bugfix) that passed CI on their own branch to merge without requiring serial rebases after every `main` advance.
- **`require_last_push_approval: false`**: Ensures that rebase pushes or automated updates do not permanently lock out auto-merge queues when substantive code reviews have already been completed.
- **`dismiss_stale_reviews_on_push: true`**: Retained to ensure new commits made during active review dismiss stale approvals.
- **`required_linear_history: true`**: Enforced alongside Squash and Merge to guarantee a clean, linear git commit history on `main`.
