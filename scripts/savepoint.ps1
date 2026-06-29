#!/usr/bin/env pwsh
# scripts/savepoint.ps1
# (On Windows: invoke with `powershell -File scripts/savepoint.ps1` if pwsh isn't installed)
#
# End-of-session savepoint for TrustVend Nigeria.
# Stages everything untracked/modified (in gitignore boundaries), runs the
# typecheck + lint gates, creates a dated session branch, commits with a
# timestamped message, pushes, and opens a PR against `main`.
#
# Usage:
#   ./scripts/savepoint.ps1                  # auto (manual wrap / cron)
#   ./scripts/savepoint.ps1 -TriggerNote "x" # freeform notes appended to body
#   ./scripts/savepoint.ps1 -SkipGates       # commit even when checks fail
#                                            # (use sparingly; gates protect main)
#
# Gates (in order; first failure aborts unless -SkipGates):
#   1. bun run typecheck
#   2. bun run lint
#
# Idempotent: if nothing is staged, prints "Nothing to savepoint." and exits 0.
#
# Branch name: session/YYYY-MM-DD-HHmm   (UTC+1 / WAT, no colons, sortable)
# Commit title: chore(savepoint): YYYY-MM-DD HH:mm WAT
# PR base: main

param(
    [Parameter(Mandatory = $false)]
    [string]$TriggerNote = "",

    [switch]$SkipGates
)

$ErrorActionPreference = "Stop"

# --- helpers ------------------------------------------------------------------

function Get-WATNow {
    # Force Africa/Lagos (UTC+1) regardless of host TZ
    return (Get-Date).ToUniversalTime().AddHours(1)
}

# Find the official GitHub CLI (cli/cli). On Windows the npm-shimmed "Node GH"
# (an unrelated, abandoned Node.js port) often shadows the real one on PATH.
function Get-GhExe {
    $candidates = @(
        "C:\Program Files\GitHub CLI\gh.exe"
        "C:\Program Files (x86)\GitHub CLI\gh.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }
    # Fall back to whatever `gh.exe` resolves to (PowerShell resolves .exe first)
    $resolved = Get-Command gh.exe -ErrorAction SilentlyContinue
    if ($resolved) { return $resolved.Source }
    return $null
}

# --- sanity checks ------------------------------------------------------------

if (-not (Test-Path ".git")) {
    throw "Not a git repository. Run this from the project root."
}

# Detect changes BEFORE we touch anything (also a quick "anything to do?" probe)
$initialStatus = git status --porcelain
if (-not $initialStatus) {
    Write-Host "Nothing to savepoint -- working tree clean." -ForegroundColor Green
    exit 0
}

Write-Host "Working tree changes detected:" -ForegroundColor Cyan
$initialStatus | ForEach-Object { Write-Host "  $_" }
$fileCount = ($initialStatus | Measure-Object).Count
Write-Host "  ($fileCount file paths)" -ForegroundColor Cyan

# --- gates --------------------------------------------------------------------

if (-not $SkipGates) {
    Write-Host ""
    Write-Host "[gate 1/2] bun run typecheck" -ForegroundColor Cyan
    bun run typecheck
    if ($LASTEXITCODE -ne 0) {
        throw "Typecheck failed. Fix and re-run, or pass -SkipGates to bypass."
    }

    Write-Host ""
    Write-Host "[gate 2/2] bun run lint" -ForegroundColor Cyan
    bun run lint
    if ($LASTEXITCODE -ne 0) {
        throw "Lint failed. Fix and re-run, or pass -SkipGates to bypass."
    }
} else {
    Write-Host ""
    Write-Host "Gates skipped (-SkipGates)." -ForegroundColor Yellow
}

# --- build branch name + commit metadata --------------------------------------

$now      = Get-WATNow
$stamp    = $now.ToString("yyyy-MM-dd HH:mm")
$dateSlug = $now.ToString("yyyy-MM-dd-HHmm")
$branch   = "session/$dateSlug"

if ($TriggerNote) {
    $noteLine = "- note:        $TriggerNote"
} else {
    $noteLine = ""
}

# Reflect actual gate state in the commit body so reviewers see what ran
$gatesStatus = if ($SkipGates) { "bypassed (-SkipGates)" } else { "passing" }

$body = @"
Auto-savepoint from dev session.

- typecheck:   $gatesStatus
- lint:        $gatesStatus
- files:       $fileCount changed
- branch:      $branch
- triggered:   $(if ($TriggerNote) { "manual ($TriggerNote)" } else { "manual/cron" })
$noteLine
"@

# --- create / switch to session branch ----------------------------------------

$previousBranch = git branch --show-current
Write-Host ""
Write-Host "Branching off $previousBranch -> $branch" -ForegroundColor Cyan

if (git show-ref --verify --quiet "refs/heads/$branch") {
    Write-Host "Local branch $branch exists -- reusing." -ForegroundColor Yellow
    git checkout $branch
} else {
    git checkout -b $branch
}

# Stage everything that isn't gitignored
git add .

# Re-check after add -- `.gitignore` can drop changes into a no-op
$stagedCheck = git status --porcelain
if (-not $stagedCheck) {
    Write-Host "After `git add .` nothing remained staged -- nothing to savepoint." -ForegroundColor Green
    git checkout $previousBranch
    exit 0
}

# Commit
$title = "chore(savepoint): $stamp WAT"
Write-Host "Committing: $title" -ForegroundColor Cyan
git commit -m $title -m $body

# Push (set upstream)
Write-Host ""
Write-Host "Pushing $branch to origin..." -ForegroundColor Cyan
git push -u origin $branch

# --- PR ------------------------------------------------------------------------

$prUrl = "https://github.com/adeolaalabi2017/TrustVend-Nigeria/pull/new/$branch"
Write-Host ""
Write-Host "PR URL: $prUrl" -ForegroundColor Green

# gh-cli detection is defensive: gh is OAuth-based (separate from git's PAT helper)
# and may not be authenticated even when git push works fine.
$ghReady = $false
$ghPath = Get-GhExe
if ($ghPath) {
    try {
        & $ghPath auth status 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ghReady = $true
        }
    } catch {
        # gh auth status on some versions throws before exiting cleanly; treat as not-ready
        $ghReady = $false
    }
}

if ($ghReady) {
    Write-Host "Opening PR via $ghPath (base: main)..." -ForegroundColor Cyan
    & $ghPath pr create --base main --head $branch --title $title --body $body --fill
    if ($LASTEXITCODE -ne 0) {
        Write-Host "gh PR create failed -- use the URL above." -ForegroundColor Yellow
    } else {
        Write-Host "PR opened." -ForegroundColor Green
    }
} else {
    if ($ghPath) {
        Write-Host "gh not authenticated (found at $ghPath) -- open the PR URL above manually." -ForegroundColor Yellow
    } else {
        Write-Host "gh CLI not installed -- open the PR URL above manually." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Savepoint complete -> $branch" -ForegroundColor Green

