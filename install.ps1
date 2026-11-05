# --- TaleBridge Automatic Installer for Windows ---
# Connects TaleBridge to TaleSpire and Obsidian

[CmdletBinding()]
param(
    [string]$VaultPath = "",
    [switch]$CopyMode
)

$Host.UI.RawUI.WindowTitle = "TaleBridge Installer"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "            TaleBridge Installer for Windows             " -ForegroundColor Cyan
Write-Host "   Интеграционный мост между TaleSpire и Obsidian 5e     " -ForegroundColor DarkCyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$repoRoot = $PSScriptRoot
$symbioteSrc = Join-Path $repoRoot "symbiote"
$pluginSrc = Join-Path $repoRoot "obsidian-plugin"

# 1. Verify repository source files
if (-not (Test-Path $symbioteSrc) -or -not (Test-Path $pluginSrc)) {
    Write-Host "[!] Ошибка: Не найдены папки symbiote или obsidian-plugin в $repoRoot" -ForegroundColor Red
    exit 1
}

# 2. Locate TaleSpire Symbiotes directory
$tsBase = Join-Path $env:USERPROFILE "AppData\LocalLow\BouncyRock Entertainment\TaleSpire\Symbiotes"
if (-not (Test-Path $tsBase)) {
    Write-Host "[*] Каталог Symbiotes не найден, создаём: $tsBase" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $tsBase -Force | Out-Null
}

$tsTarget = Join-Path $tsBase "TaleBridge"

Write-Host "[1/2] Установка симбиота в TaleSpire..." -ForegroundColor Green
if (Test-Path $tsTarget) {
    Write-Host "      Целевой симбиот уже существует: $tsTarget" -ForegroundColor Gray
    Write-Host "      Обновление ссылки/содержимого..." -ForegroundColor Gray
    cmd /c "rmdir `"$tsTarget`"" 2>$null
    if (Test-Path $tsTarget) {
        Remove-Item -Path $tsTarget -Recurse -Force -ErrorAction SilentlyContinue
    }
}

try {
    # Attempt junction link (does not require administrator rights on NTFS)
    cmd /c "mklink /J `"$tsTarget`" `"$symbioteSrc`"" | Out-Null
    if (Test-Path $tsTarget) {
        Write-Host "      Успешно создана связь: $tsTarget -> $symbioteSrc" -ForegroundColor Green
    } else {
        throw "Junction creation failed"
    }
} catch {
    Write-Host "      Создание ссылки не удалось, выполняется прямое копирование..." -ForegroundColor Yellow
    Copy-Item -Path $symbioteSrc -Destination $tsTarget -Recurse -Force
    Write-Host "      Файлы скопированы в $tsTarget" -ForegroundColor Green
}

# 3. Locate Obsidian Vault
Write-Host ""
Write-Host "[2/2] Подключение плагина к вольту Obsidian..." -ForegroundColor Green

if (-not $VaultPath) {
    Write-Host "Укажите абсолютный путь к папке вашего вольта Obsidian" -ForegroundColor Yellow
    Write-Host "(например: F:\DND\MyCampaign или C:\Users\User\Documents\Vault):" -ForegroundColor Gray
    $VaultPath = Read-Host "Путь к вольту"
}

$VaultPath = $VaultPath.Trim().Trim('"').Trim("'")

if (-not $VaultPath -or -not (Test-Path $VaultPath)) {
    Write-Host "[!] Путь к вольту не указан или каталог не существует: $VaultPath" -ForegroundColor Red
    Write-Host "    Вы можете установить плагин в Obsidian вручную, скопировав папку obsidian-plugin" -ForegroundColor Gray
} else {
    $obsidianPluginsDir = Join-Path $VaultPath ".obsidian\plugins"
    if (-not (Test-Path $obsidianPluginsDir)) {
        New-Item -ItemType Directory -Path $obsidianPluginsDir -Force | Out-Null
    }

    $obsidianTarget = Join-Path $obsidianPluginsDir "talebridge"
    if (Test-Path $obsidianTarget) {
        Write-Host "      Существующий плагин найден в вольте, обновление..." -ForegroundColor Gray
        cmd /c "rmdir `"$obsidianTarget`"" 2>$null
        if (Test-Path $obsidianTarget) {
            Remove-Item -Path $obsidianTarget -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    try {
        cmd /c "mklink /J `"$obsidianTarget`" `"$pluginSrc`"" | Out-Null
        if (Test-Path $obsidianTarget) {
            Write-Host "      Успешно создана связь: $obsidianTarget -> $pluginSrc" -ForegroundColor Green
        } else {
            throw "Junction failed"
        }
    } catch {
        Copy-Item -Path $pluginSrc -Destination $obsidianTarget -Recurse -Force
        Write-Host "      Файлы плагина скопированы в $obsidianTarget" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "             Установка TaleBridge завершена!              " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Дальнейшие шаги:" -ForegroundColor Yellow
Write-Host "1. Откройте Obsidian -> Настройки -> Сторонние плагины." -ForegroundColor White
Write-Host "2. Включите плагин 'TaleBridge'." -ForegroundColor White
Write-Host "3. В TaleSpire откройте меню Symbiotes и выберите 'TaleBridge'." -ForegroundColor White
Write-Host ""
$examplesPath = Join-Path $repoRoot "examples\starter-vault"
Write-Host "Демонстрационные файлы заметок находятся в папке:" -ForegroundColor Gray
Write-Host "  $examplesPath" -ForegroundColor Gray
Write-Host ""

if ($Host.Name -notlike "*NonInteractive*" -and -not [Console]::IsInputRedirected) {
    Write-Host "Нажмите любую клавишу для завершения..." -ForegroundColor Gray
    [Console]::ReadKey($true) | Out-Null
}
