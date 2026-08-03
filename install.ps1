<#
.SYNOPSIS
  Install agent-primitives into Claude Code.

.DESCRIPTION
  Three kinds of thing get installed, to three destinations:

    bundles\*\agents\<name>.md   -> <dest>\agents\<name>.md
    bundles\*\skills\<name>\     -> <dest>\skills\<name>\   (whole directory)
    bundles\*\commands\<name>.md -> <dest>\commands\<name>.md

  A command copied loose is invoked as /<name>; under a plugin install it is
  namespaced /<plugin>:<name>. Commands here delegate to their skill rather than
  invoking bundled scripts through ${CLAUDE_PLUGIN_ROOT}, which is what lets them
  survive a loose install - that variable only resolves under a plugin. Skills
  carry their own tooling by relative path, so they work either way.

  Installed is not the same as wired: some primitives are dispatcher-triggered
  and work as soon as they land, others need a rule in your CLAUDE.md before
  anything invokes them. See docs\wiring.md.

.EXAMPLE
  .\install.ps1                       # everything -> $HOME\.claude\
.EXAMPLE
  .\install.ps1 -Project              # everything -> .\.claude\
.EXAMPLE
  .\install.ps1 verification-critic   # just that one
.EXAMPLE
  .\install.ps1 <skill-name>          # a skill, with its bundled tools
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

$repo       = $PSScriptRoot
$bundlesDir = Join-Path $repo 'bundles'

$allAgents = @(Get-ChildItem -Path $bundlesDir -Filter '*.md' -Recurse -File |
               Where-Object { $_.Directory.Name -eq 'agents' })
$allSkills = @(Get-ChildItem -Path $bundlesDir -Directory -Recurse |
               Where-Object { $_.Parent.Name -eq 'skills' })
$allCommands = @(Get-ChildItem -Path $bundlesDir -Filter '*.md' -Recurse -File |
                 Where-Object { $_.Directory.Name -eq 'commands' })

if ($allAgents.Count -eq 0 -and $allSkills.Count -eq 0) {
    throw "Nothing found under $bundlesDir\*\{agents,skills}\"
}

if ($List) {
    Write-Host 'Agents:'
    foreach ($f in $allAgents) {
        '  {0,-26} ({1})' -f $f.BaseName, $f.Directory.Parent.Name | Write-Host
    }
    Write-Host ''
    Write-Host 'Skills:'
    foreach ($d in $allSkills) {
        '  {0,-26} ({1})' -f $d.Name, $d.Parent.Parent.Name | Write-Host
    }
    if ($allCommands.Count -gt 0) {
        Write-Host ''
        Write-Host 'Commands:'
        foreach ($f in $allCommands) {
            '  /{0,-25} ({1})' -f $f.BaseName, $f.Directory.Parent.Name | Write-Host
        }
    }
    return
}

$root  = if ($Project) { Join-Path $PWD '.claude' } else { Join-Path $HOME '.claude' }
$scope = if ($Project) { 'project' } else { 'user' }

# Resolve requested names against agents then skills, failing loudly on a typo
# rather than silently installing nothing.
$selAgents   = @()
$selSkills   = @()
$selCommands = @()

if ($Name) {
    foreach ($n in $Name) {
        $agent = $allAgents | Where-Object { $_.BaseName -eq $n } | Select-Object -First 1
        if ($agent) { $selAgents += $agent; continue }
        $skill = $allSkills | Where-Object { $_.Name -eq $n } | Select-Object -First 1
        if ($skill) {
            $selSkills += $skill
            # A named skill brings its bundle's commands with it - a skill whose
            # documented entry point is missing is worse than an extra file.
            $bundleName = $skill.Parent.Parent.Name
            $selCommands += $allCommands | Where-Object { $_.Directory.Parent.Name -eq $bundleName }
            continue
        }
        throw "Nothing named '$n'. Try -List."
    }
} else {
    $selAgents   = $allAgents
    $selSkills   = $allSkills
    $selCommands = $allCommands
}

$count = 0

if ($selAgents.Count -gt 0) {
    $agentDest = Join-Path $root 'agents'
    New-Item -ItemType Directory -Force -Path $agentDest | Out-Null
    foreach ($f in $selAgents) {
        Copy-Item -Path $f.FullName -Destination $agentDest -Force
        Write-Host "  agent  $($f.BaseName)"
        $count++
    }
}

foreach ($d in $selSkills) {
    $skillDest = Join-Path $root 'skills'
    New-Item -ItemType Directory -Force -Path $skillDest | Out-Null
    $target = Join-Path $skillDest $d.Name
    # Replace wholesale rather than merging: a stale tool left over from an
    # older version is worse than a clean reinstall, because it still runs.
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Copy-Item -Path $d.FullName -Destination $target -Recurse -Force
    $files = @(Get-ChildItem -Path $target -Recurse -File).Count
    Write-Host "  skill  $($d.Name)  ($files files, tooling included)"
    $count++
}

foreach ($f in $selCommands) {
    $cmdDest = Join-Path $root 'commands'
    New-Item -ItemType Directory -Force -Path $cmdDest | Out-Null
    Copy-Item -Path $f.FullName -Destination $cmdDest -Force
    Write-Host "  cmd    /$($f.BaseName)"
    $count++
}

Write-Host ''
Write-Host "$count item(s) -> $root  ($scope scope)"
Write-Host ''
Write-Host 'Installed is not the same as wired. Some primitives are picked up'
Write-Host 'automatically from their description; others need a rule in your CLAUDE.md -'
Write-Host "  $repo\docs\wiring.md"
Write-Host "Per-bundle snippets live in $repo\bundles\<bundle>\wiring\"

if ($selCommands.Count -gt 0) {
    Write-Host ''
    Write-Host 'Slash commands installed unnamespaced (/<name>). Under a plugin'
    Write-Host 'install they would be /<plugin>:<name>, which avoids collisions.'
}
