# Installs runtime artifacts. Plugin settings remain local to the chosen vault.
[CmdletBinding()]
param(
    [string]$VaultPath = '',
    [string]$TaleSpirePath = '',
    [switch]$CopyMode
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-ChildPath([string]$ParentPath, [string]$TargetPath) {
    $parentFull = [IO.Path]::GetFullPath($ParentPath).TrimEnd('\', '/')
    $targetFull = [IO.Path]::GetFullPath($TargetPath)
    if (-not $targetFull.StartsWith($parentFull + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Target escapes installation directory: $targetFull"
    }
    return $targetFull
}

function Install-Artifact([string]$SourcePath, [string]$ParentPath, [string]$Name, [string[]]$RuntimeFiles, [bool]$PreserveSettings) {
    if (-not (Test-Path -LiteralPath $SourcePath -PathType Container)) { throw "Runtime artifact missing: $SourcePath. Run npm run build first." }
    New-Item -ItemType Directory -Path $ParentPath -Force | Out-Null
    $targetPath = Assert-ChildPath $ParentPath (Join-Path $ParentPath $Name)
    # TaleSpire watches Symbiotes recursively. Hidden staging/backups must not become extra installs.
    $maintenanceRoot = Assert-ChildPath $ParentPath (Join-Path $ParentPath '.talebridge-install')
    New-Item -ItemType Directory -Path $maintenanceRoot -Force | Out-Null
    $stagePath = Assert-ChildPath $maintenanceRoot (Join-Path $maintenanceRoot ($Name + '.stage-' + [guid]::NewGuid().ToString('N')))
    $backupPath = Assert-ChildPath $maintenanceRoot (Join-Path $maintenanceRoot ($Name + '.previous-' + [guid]::NewGuid().ToString('N')))
    $sourceFull = [IO.Path]::GetFullPath($SourcePath).TrimEnd('\', '/')
    if ($sourceFull.Equals($targetPath, [StringComparison]::OrdinalIgnoreCase) -or $sourceFull.StartsWith($targetPath + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Source and destination overlap.' }
    # Copy only runtime assets, including when installing directly from a development checkout.
    New-Item -ItemType Directory -Path $stagePath | Out-Null
    foreach ($file in $RuntimeFiles) {
        $runtimePath = Assert-ChildPath $sourceFull (Join-Path $sourceFull $file)
        if (-not (Test-Path -LiteralPath $runtimePath)) { throw "Runtime artifact missing: $runtimePath" }
        Copy-Item -LiteralPath $runtimePath -Destination $stagePath -Recurse
    }
    if ($PreserveSettings) {
        $settingsPath = Join-Path $targetPath 'data.json'
        if (Test-Path -LiteralPath $settingsPath -PathType Leaf) { Copy-Item -LiteralPath $settingsPath -Destination (Join-Path $stagePath 'data.json') -Force }
    }
    $backedUp = $false
    try {
        if (Test-Path -LiteralPath $targetPath) {
            # Renaming the directory entry also safely handles an old junction; no recursive deletion.
            Move-Item -LiteralPath $targetPath -Destination $backupPath
            $backedUp = $true
        }
        Move-Item -LiteralPath $stagePath -Destination $targetPath
    } catch {
        if ($backedUp -and -not (Test-Path -LiteralPath $targetPath)) { Move-Item -LiteralPath $backupPath -Destination $targetPath }
        throw
    }
    Write-Host "Installed: $targetPath"
    if ($backedUp) { Write-Host "Previous version kept at: $backupPath" }
}

try {
    $artifactRoot = if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'release\obsidian-plugin\main.js')) { Join-Path $PSScriptRoot 'release' } else { $PSScriptRoot }
    if (-not (Test-Path -LiteralPath (Join-Path $artifactRoot 'obsidian-plugin\web\index.html'))) { throw 'Web build is missing. Run npm ci and npm run build, or use the complete release archive.' }
    if (-not $VaultPath) { $VaultPath = Read-Host 'Absolute path to the Obsidian vault' }
    $VaultPath = [IO.Path]::GetFullPath($VaultPath.Trim().Trim('"'))
    if (-not (Test-Path -LiteralPath $VaultPath -PathType Container)) { throw "Vault directory does not exist: $VaultPath" }
    if (-not $TaleSpirePath) { $TaleSpirePath = Join-Path $env:USERPROFILE 'AppData\LocalLow\BouncyRock Entertainment\TaleSpire\Symbiotes' }
    $TaleSpirePath = [IO.Path]::GetFullPath($TaleSpirePath)
    # Always copy the plugin: data.json must never be shared through a source junction.
    Install-Artifact (Join-Path $artifactRoot 'obsidian-plugin') (Join-Path $VaultPath '.obsidian\plugins') 'talebridge' @('main.js', 'manifest.json', 'styles.css', 'web') $true
    # CopyMode remains accepted for compatibility; runtime-only copying is now always used.
    Install-Artifact (Join-Path $artifactRoot 'symbiote') $TaleSpirePath 'TaleBridge' @('manifest.json', 'README.md', 'dist') $false
    Write-Host 'TaleBridge installed. Enable the Obsidian plugin and create access codes in its settings.'
} catch {
    Write-Error $_
    exit 1
}
