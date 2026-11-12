# Git Workflow and Merge Conflict Prevention

This guide defines the Git workflow, branching conventions, and conflict-resolution strategies for the **Sugbo Now** repository. Following these practices ensures clean linear history, prevents stale branches, and avoids merge conflicts across frontend, backend, and documentation work.

---

## 1. Branching Strategy

### Always branch from fresh `origin/main`

Before starting any new feature, bugfix, or chore, ensure you are branching from the latest remote `main`:

```bash
git fetch origin
git switch -c <area>/<topic> origin/main
```

Use conventional area prefixes for branch names:

- `frontend/<topic>` — e.g. `frontend/dashboard-layout`
- `backend/<topic>` — e.g. `backend/weather-api`
- `docs/<topic>` — e.g. `docs/api-contract-update`
- `chore/<topic>` — e.g. `chore/ci-hardening`

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
   - Cross-cutting documentation (`CLAUDE.md`, `README.md`)
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

Before pushing your branch or requesting review, run formatters and linters locally. CI will enforce these checks and block unformatted or failing code.

```bash
# Format code with Prettier
npm --prefix frontend run format
npm --prefix backend run format

# Run ESLint checks
npm --prefix frontend run lint
npm --prefix backend run lint

# Run builds and tests
npm --prefix frontend run build
npm --prefix backend run build
npm --prefix backend test
```

> In CI, Prettier runs against all files added or modified in the PR (`scripts/ci/changed-files.sh | xargs -0 -r npx prettier --check --ignore-unknown --`), while ESLint runs across the entire application.

---

## 6. Repository Admin Settings (`@En1gM-a`)

This section documents key repository settings managed by repository administrators.

### 1. Enable GitHub Auto-merge

Enable auto-merge on the repository so PRs merge automatically as soon as approvals and required status checks pass:

```bash
gh api -X PATCH repos/En1gM-a/SugboNow -f allow_auto_merge=true
```

Once enabled, developers can click "Enable auto-merge" (or run `gh pr merge --auto --squash`) as soon as their PR is ready, avoiding manual follow-up once CI finishes.

### 2. Trade-offs of `strict_required_status_checks_policy`

The repository ruleset (`.github/rulesets/protect-main.json`) configures:

```json
"strict_required_status_checks_policy": true
```

#### What this means

A PR branch **must be strictly up to date with the tip of `main`** before GitHub permits merging.

#### Trade-off analysis

- **Strict enabled (`true`, current setting):**
  - **Pros:** Guarantees that the exact integration of the PR branch on top of current `main` has passed all tests and checks. Eliminates regressions caused by two PRs that pass in isolation but conflict semantically when merged.
  - **Cons:** Serializes merging. Whenever any PR merges into `main`, all other open PRs become "out of date". Teammates must rebase their branch (`git rebase origin/main`) and wait for CI checks to re-run before merging.
- **Strict disabled (`false`):**
  - **Pros:** Significantly faster merge throughput. When PRs touch independent areas (e.g. one frontend PR and one backend PR), both can merge without waiting on sequential rebases and rebuilds.
  - **Cons:** Small risk that concurrent merges introduce incompatible changes that pass branch CI but break on `main`.

#### Recommendation

Keep `strict_required_status_checks_policy: true` alongside `allow_auto_merge=true`. GitHub Auto-merge automatically handles the queue, updating branches and merging them in sequence once checks pass. If the team size grows and serial rebase queues become a bottleneck for orthogonal changes, consider toggling strict checks to `false`.
