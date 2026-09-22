<#
.SYNOPSIS
  Applies Sugbo Now's GitHub security settings using the GitHub CLI (gh).
  Safe to re-run: it updates the ruleset if it already exists.

.EXAMPLE
  .\scripts\apply-github-security.ps1 -Repo your-username/sugbo-now

.NOTES
  Requires: GitHub CLI (https://cli.github.com), `gh auth login` done by a repo ADMIN.
  Rulesets need a public repo, or a paid plan (Pro/Team) for private repos.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Repo   # format: owner/name
)

$ErrorActionPreference = 'Stop'

function Invoke-Gh {
  param([string[]]$GhArgs)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & gh @GhArgs 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  [pscustomobject]@{ Ok = ($code -eq 0); Output = ($out | Out-String).Trim() }
}

function Step {
  param([string]$Label, [string[]]$GhArgs, [switch]$Optional)
  $r = Invoke-Gh $GhArgs
  if ($r.Ok) {
    Write-Host "[ok]   $Label" -ForegroundColor Green
  }
  elseif ($Optional) {
    Write-Host "[skip] $Label -> $($r.Output)" -ForegroundColor Yellow
  }
  else {
    Write-Host "[FAIL] $Label -> $($r.Output)" -ForegroundColor Red
    exit 1
  }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI not found. Install it from https://cli.github.com, then run: gh auth login" -ForegroundColor Red
  exit 1
}

Step 'Logged in to GitHub CLI' @('auth', 'status')

# 1. Merge settings: squash only, auto-delete merged branches
Step 'Repo settings (squash-merge only, delete merged branches)' @(
  'api', '-X', 'PATCH', "repos/$Repo",
  '-F', 'allow_squash_merge=true',
  '-F', 'allow_merge_commit=false',
  '-F', 'allow_rebase_merge=false',
  '-F', 'delete_branch_on_merge=true',
  '-F', 'allow_update_branch=true'
)

# 2. Dependency security (free)
Step 'Dependabot alerts' @('api', '-X', 'PUT', "repos/$Repo/vulnerability-alerts") -Optional
Step 'Dependabot security updates' @('api', '-X', 'PUT', "repos/$Repo/automated-security-fixes") -Optional

# 3. Secret scanning + push protection (public repos; private repos need a paid add-on)
Step 'Secret scanning + push protection' @(
  'api', '-X', 'PATCH', "repos/$Repo",
  '-F', 'security_and_analysis[secret_scanning][status]=enabled',
  '-F', 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
) -Optional

Step 'Private vulnerability reporting' @('api', '-X', 'PUT', "repos/$Repo/private-vulnerability-reporting") -Optional

# 4. GitHub Actions: workflow token is read-only, Actions cannot approve PRs
Step 'Actions default token = read-only' @(
  'api', '-X', 'PUT', "repos/$Repo/actions/permissions/workflow",
  '-f', 'default_workflow_permissions=read',
  '-F', 'can_approve_pull_request_reviews=false'
) -Optional

# 5. Branch ruleset (create, or update if it already exists)
$rulesetFile = Join-Path $PSScriptRoot '..\.github\rulesets\protect-main.json'
if (-not (Test-Path $rulesetFile)) {
  Write-Host "[FAIL] Ruleset file not found: $rulesetFile" -ForegroundColor Red
  exit 1
}

$rulesetName = 'protect-main'
$existing = Invoke-Gh @('api', "repos/$Repo/rulesets")
$id = ''
if ($existing.Ok) {
  $matchingRuleset = @($existing.Output | ConvertFrom-Json | Where-Object { $_.name -eq $rulesetName }) | Select-Object -First 1
  if ($matchingRuleset) {
    $id = [string]$matchingRuleset.id
  }
}

if ($id) {
  $r = Invoke-Gh @('api', '-X', 'PUT', "repos/$Repo/rulesets/$id", '--input', $rulesetFile)
  $label = "Ruleset '$rulesetName' updated"
}
else {
  $r = Invoke-Gh @('api', '-X', 'POST', "repos/$Repo/rulesets", '--input', $rulesetFile)
  $label = "Ruleset '$rulesetName' created"
}

if ($r.Ok) {
  Write-Host "[ok]   $label" -ForegroundColor Green
}
else {
  Write-Host "[FAIL] Ruleset -> $($r.Output)" -ForegroundColor Red
  if ($r.Output -match '403|Upgrade') {
    Write-Host "       Private repos on the free plan can't use rulesets. Make the repo public, or use GitHub Pro (students: GitHub Student Developer Pack) / Team." -ForegroundColor Yellow
  }
  exit 1
}

Write-Host ""
Write-Host "Done. Test it: try 'git push origin main' directly. It should be rejected." -ForegroundColor Cyan
