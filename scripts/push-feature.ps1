#!/usr/bin/env pwsh
# scripts/push-feature.ps1
#
# Securely push a feature branch to GitHub.
#
# Usage:
#   ./scripts/push-feature.ps1 -Branch "feat/my-feature"
#   ./scripts/push-feature.ps1 -Branch "fix/bug-42" -CommitMessage "fix: handle edge case"
#
# Setup (run once, in your terminal — never paste the token in chat):
#   gh auth login   # interactive; stores token in Windows Credential Manager

param(
    [Parameter(Mandatory = $true)]
    [string]$Branch,

    [Parameter(Mandatory = $false)]
    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

# Sanity checks ---------------------------------------------------------------
if (-not (Test-Path ".git")) {
    throw "Not a git repository. Run this from the project root."
}

$status = git status --porcelain
if ($status -and -not $CommitMessage) {
    Write-Host "You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $status
    Write-Host ""
    Write-Host "Either commit them first or pass -CommitMessage '...' to commit + push in one step." -ForegroundColor Yellow
    throw "Aborting."
}

# Commit (if requested) -------------------------------------------------------
if ($CommitMessage) {
    if ($status) {
        git add .
    }
    git commit -m $CommitMessage
}

# Create / switch to branch ---------------------------------------------------
$current = git branch --show-current
if ($current -ne $Branch) {
    if (git show-ref --verify --quiet "refs/heads/$Branch") {
        git checkout $Branch
    } else {
        git checkout -b $Branch
    }
}

# Push -----------------------------------------------------------------------
Write-Host "Pushing $Branch to origin..." -ForegroundColor Cyan
git push -u origin $Branch

Write-Host ""
Write-Host "Done. Open a PR: https://github.com/adeolaalabi2017/TrustVend-Nigeria/pull/new/$Branch" -ForegroundColor Green
