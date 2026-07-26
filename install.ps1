<#
.SYNOPSIS
  Install agent-primitives reviewers into Claude Code.

.DESCRIPTION
  Agents alone do nothing. After installing, add the wiring from
  docs/snippets/claude-md.md to your CLAUDE.md so something invokes them.

.EXAMPLE
  .\install.ps1                       # every agent -> $HOME\.claude\agents\
.EXAMPLE
  .\install.ps1 -Project              # every agent -> .\.claude\agents\
.EXAMPLE
  .\install.ps1 verification-critic   # just that one
.EXAMPLE
  .\install.ps1 -List                 # show what's available
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Name,
    [switch]$Project,
    [switch]$List
)

$ErrorActionPreference = 'Stop'

$repo = $PSScriptRoot
$all  = @(Get-ChildItem -Path (Join-Path $repo 'bundles') -Filter '*.md' -Recurse -File |
          Where-Object { $_.Directory.Name -eq 'agents' })

if ($all.Count -eq 0) {
    throw "No agents found under $repo\bundles\*\agents\"
}

if ($List) {
    Write-Host 'Available agents:'
    foreach ($f in $all) {
        $bundle = $f.Directory.Parent.Name
        '  {0,-24} ({1})' -f $f.BaseName, $bundle | Write-Host
    }
    return
}

$dest  = if ($Project) { Join-Path $PWD '.claude\agents' } else { Join-Path $HOME '.claude\agents' }
$scope = if ($Project) { 'project' } else { 'user' }

# Resolve requested names, failing loudly on a typo rather than silently
# installing nothing.
if ($Name) {
    $selected = foreach ($n in $Name) {
        $match = $all | Where-Object { $_.BaseName -eq $n }
        if (-not $match) { throw "No agent named '$n'. Try -List." }
        $match
    }
} else {
    $selected = $all
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($f in $selected) {
    Copy-Item -Path $f.FullName -Destination $dest -Force
    Write-Host "  installed $($f.BaseName)"
}

Write-Host ''
Write-Host "$(@($selected).Count) agent(s) -> $dest  ($scope scope)"
Write-Host ''
Write-Host 'Next: add the self-verification gate to your CLAUDE.md, or the agents will'
Write-Host 'never be invoked -'
Write-Host "  $repo\docs\snippets\claude-md.md"
