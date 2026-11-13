#!/usr/bin/env bash
# Validate PR metadata (title, branch name, and body hygiene) on pull_request events.
# Inspired by dreeyanzz/studyhub pr-title and commit hygiene standards.
#
# Environment variables:
#   PR_TITLE: Title of the pull request
#   PR_BODY:  Description body of the pull request
#   HEAD_REF: Source branch name of the pull request
#
# Checks:
#   1. Rejects UTF-8 BOM (efbbbf) at the start of PR_TITLE or PR_BODY.
#   2. Rejects empty PR_BODY (skipped for dependabot/ branches).
#   3. Rejects leftover HTML comments (<!--) in PR_BODY (skipped for dependabot/ branches).
#   4. Validates HEAD_REF matches conventional prefixes or dependabot/.
#   5. Validates PR_TITLE matches Conventional Commits format.

set -euo pipefail

PR_TITLE="${PR_TITLE:-}"
PR_BODY="${PR_BODY:-}"
HEAD_REF="${HEAD_REF:-}"

has_error=0

# -----------------------------------------------------------------------------
# 1. UTF-8 BOM Check (efbbbf)
# -----------------------------------------------------------------------------
BOM=$(printf '\xef\xbb\xbf')

if [[ "$PR_TITLE" == "$BOM"* ]]; then
  echo "::error::PR title starts with a UTF-8 BOM (Byte Order Mark, efbbbf)."
  echo "::error::Windows PowerShell 5.1 often injects a UTF-8 BOM. Use 'git commit -m \"...\"', Git Bash heredocs (cat << 'EOF'), or configure your editor to save UTF-8 without BOM."
  has_error=1
fi

if [[ "$PR_BODY" == "$BOM"* ]]; then
  echo "::error::PR body starts with a UTF-8 BOM (Byte Order Mark, efbbbf)."
  echo "::error::Windows PowerShell 5.1 ('Out-File', '>', 'Set-Content') injects a UTF-8 BOM. Save PR descriptions as UTF-8 without BOM or edit directly in the GitHub web UI."
  has_error=1
fi

DEPENDABOT_REGEX='^dependabot/'

# -----------------------------------------------------------------------------
# 2 & 3. PR Body Checks (skipped for automated Dependabot PRs)
# -----------------------------------------------------------------------------
if [[ ! "$HEAD_REF" =~ $DEPENDABOT_REGEX ]]; then
  # 2. PR Body Non-Empty Check
  trimmed_body=$(printf '%s' "$PR_BODY" | tr -d '[:space:]')
  if [ -z "$trimmed_body" ]; then
    echo "::error::PR body cannot be empty. Please provide a description of the changes."
    has_error=1
  fi

  # 3. PR Body HTML Comments Check
  if [[ "$PR_BODY" == *"<!--"* ]]; then
    echo "::error::PR body contains leftover HTML comments ('<!--'). Please remove PR template comments/placeholders before submitting."
    has_error=1
  fi
fi

# -----------------------------------------------------------------------------
# 4. HEAD_REF (Branch Name) Check
# -----------------------------------------------------------------------------
BRANCH_REGEX='^(frontend|backend|docs|chore|supabase|fix|feat|feature|sample)/[a-z0-9-]+$'

if [ -z "$HEAD_REF" ]; then
  echo "::error::HEAD_REF environment variable is empty or unset."
  has_error=1
elif ! [[ "$HEAD_REF" =~ $BRANCH_REGEX ]] && ! [[ "$HEAD_REF" =~ $DEPENDABOT_REGEX ]]; then
  echo "::error::Branch name '$HEAD_REF' is invalid."
  echo "::error::Branches must match: $BRANCH_REGEX or start with dependabot/"
  has_error=1
fi

# -----------------------------------------------------------------------------
# 5. PR Title Conventional Commits Check
# -----------------------------------------------------------------------------
CONVENTIONAL_REGEX='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._-]+\))?!?: (?![A-Z]).+'

validate_title() {
  local title="$1"
  if echo "" | grep -P "" >/dev/null 2>&1; then
    printf '%s\n' "$title" | grep -Pq "$CONVENTIONAL_REGEX"
  elif command -v node >/dev/null 2>&1; then
    node -e '
      const re = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._-]+\))?!?: (?![A-Z]).+/;
      process.exit(re.test(process.argv[1]) ? 0 : 1);
    ' "$title"
  else
    if [[ "$title" =~ ^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._-]+\))?(!)?:[[:space:]](.+)$ ]]; then
      local desc="${BASH_REMATCH[4]}"
      local first="${desc:0:1}"
      [[ ! "$first" =~ [A-Z] ]]
    else
      return 1
    fi
  fi
}

if [ -z "$PR_TITLE" ]; then
  echo "::error::PR_TITLE environment variable is empty or unset."
  has_error=1
elif ! validate_title "$PR_TITLE"; then
  echo "::error::PR title '$PR_TITLE' does not follow Conventional Commits format."
  echo "::error::Expected pattern: $CONVENTIONAL_REGEX"
  echo "::error::Examples: feat(traffic): add road alerts, fix: handle null user profile, chore(ci): harden workflows"
  has_error=1
fi

# -----------------------------------------------------------------------------
# Exit Status
# -----------------------------------------------------------------------------
if [ "$has_error" -ne 0 ]; then
  echo "::error::PR metadata hygiene check failed. Please resolve the errors above."
  exit 1
fi

echo "PR metadata hygiene check passed successfully."
