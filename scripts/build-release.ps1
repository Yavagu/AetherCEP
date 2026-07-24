# AetherCEP Release Builder Script
# Creates both full (bundled binaries) and update (lightweight) release ZIP packages.

param (
    [string]$Version = ""
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot

Set-Location $projectRoot

if ([string]::IsNullOrWhiteSpace($Version)) {
    $versionJson = Get-Content -Path (Join-Path $projectRoot "version.json") -Raw | ConvertFrom-Json
    $Version = $versionJson.version
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building AetherCEP Release v$Version" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verify Version Consistency
Write-Host "`n[1/5] Verifying version consistency..." -ForegroundColor Yellow
node scripts/verify-version.js $Version
if ($LASTEXITCODE -ne 0) {
    Write-Error "Version verification failed. Please align all version fields before building."
    exit 1
}

# 2. Run Test Suite
Write-Host "`n[2/5] Running automated tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Unit tests failed. Aborting release build."
    exit 1
}

# 3. Setup Dist Directory
$distDir = Join-Path $projectRoot "dist"
if (Test-Path -LiteralPath $distDir) {
    Remove-Item -LiteralPath $distDir -Recurse -Force
}
New-Item -Path $distDir -ItemType Directory -Force | Out-Null

$updateZip = Join-Path $distDir "AetherCEP-update-$Version.zip"
$fullZip = Join-Path $distDir "AetherCEP-$Version-full.zip"

# 4. Create Update ZIP (Git Archive / Source without heavy binaries)
Write-Host "`n[3/5] Creating lightweight update package: AetherCEP-update-$Version.zip..." -ForegroundColor Yellow
git archive --format=zip --output=$updateZip HEAD
Write-Host "Created AetherCEP-update-$Version.zip successfully." -ForegroundColor Green

# 5. Create Full Release ZIP (Includes bundled bin/ executables)
Write-Host "`n[4/5] Creating full release package (with binaries): AetherCEP-$Version-full.zip..." -ForegroundColor Yellow
$stagingDir = Join-Path $distDir "AetherCEP-$Version-full"
New-Item -Path $stagingDir -ItemType Directory -Force | Out-Null

# Copy release files to staging directory
$includeItems = @(
    "CSXS", "css", "js", "jsx", "docs", "scripts", "bin",
    "index.html", "package.json", "version.json",
    "Setup.bat", "Setup.ps1", "INSTALL.bat", "Diagnose.bat", "FixCache.bat", "UNINSTALL.bat",
    "README.md", "SECURITY.md", "THIRD_PARTY_NOTICES.md", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md"
)

foreach ($item in $includeItems) {
    $itemPath = Join-Path $projectRoot $item
    if (Test-Path -LiteralPath $itemPath) {
        Copy-Item -Path $itemPath -Destination $stagingDir -Recurse -Force
    }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
Get-Process ffprobe, ffmpeg, yt-dlp -ErrorAction SilentlyContinue | Stop-Process -Force

# Compress staging directory into full release ZIP
if (Test-Path -LiteralPath $fullZip) { Remove-Item -LiteralPath $fullZip -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $fullZip)
Remove-Item -LiteralPath $stagingDir -Recurse -Force

Write-Host "Created AetherCEP-$Version-full.zip successfully." -ForegroundColor Green

# 6. Generate SHA-256 Checksums
Write-Host "`n[5/5] Generating SHA-256 Checksums..." -ForegroundColor Yellow

function Write-Checksum([string]$ZipPath) {
    $hash = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $name = Split-Path -Leaf $ZipPath
    $shaPath = "$ZipPath.sha256"
    "$hash  $name" | Set-Content -LiteralPath $shaPath -Encoding ascii
    Write-Host "$name :" -ForegroundColor Cyan
    Write-Host "  SHA-256: $hash" -ForegroundColor White
}

Write-Checksum $updateZip
Write-Checksum $fullZip

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " Release v$Version Build Complete!" -ForegroundColor Green
Write-Host " Packages location: $distDir" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
