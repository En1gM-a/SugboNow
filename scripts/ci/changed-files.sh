#!/usr/bin/env bash
# Print the files a pull request adds or changes inside the current directory,
# NUL-separated and relative to it, so they can be piped to `xargs -0`.
#
# CI runs on GitHub's PR merge commit, so HEAD^1 is the tip of the base branch
# and `HEAD^1 HEAD` is exactly what this PR would change. Deleted files are left
# out because there is nothing left to check.
set -euo pipefail

git diff -z --name-only --diff-filter=ACMR --relative HEAD^1 HEAD
