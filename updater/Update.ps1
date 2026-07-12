param(
    [Parameter(Mandatory = $true)][string]$Package,
    [Parameter(Mandatory = $true)][string]$ExpectedSha256,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$LogFile
)

$ErrorActionPreference = 'Stop'

function Write-UpdateLog([string]$Message) {
    $line = "$(Get-Date -Format o) $Message"
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
}

function Test-ArchivePaths([string]$Archive, [string]$Root) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        foreach ($entry in $zip.Entries) {
            $candidate = [IO.Path]::GetFullPath((Join-Path $Root $entry.FullName))
            if (-not $candidate.StartsWith($rootPath, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Unsafe archive entry: $($entry.FullName)"
            }
        }
    } finally { $zip.Dispose() }
}

try {
    Write-UpdateLog "Starting BunBun Media $Version update."
    $packagePath = [IO.Path]::GetFullPath($Package)
    $destinationPath = [IO.Path]::GetFullPath($Destination)
    $expectedRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Adobe\CEP\extensions\BunBunMedia'))
    if ($destinationPath -ne $expectedRoot) { throw 'The update destination is not the BunBun Media CEP installation.' }
    if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) { throw 'The downloaded update package does not exist.' }
    if ($ExpectedSha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'The expected SHA-256 value is invalid.' }

    $actualHash = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $ExpectedSha256.ToLowerInvariant()) { throw 'The update package checksum does not match.' }

    Write-UpdateLog 'Waiting for Premiere Pro to close.'
    while (Get-Process -Name 'Adobe Premiere Pro' -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 2 }

    $workRoot = Join-Path $env:TEMP ("BunBunMediaInstall-" + [Guid]::NewGuid().ToString('N'))
    $staging = Join-Path $workRoot 'staging'
    New-Item -Path $staging -ItemType Directory -Force | Out-Null
    Test-ArchivePaths $packagePath $staging
    Expand-Archive -LiteralPath $packagePath -DestinationPath $staging -Force

    $manifest = Join-Path $staging 'CSXS\manifest.xml'
    $versionFile = Join-Path $staging 'version.json'
    if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) { throw 'The update package has no CEP manifest.' }
    if (-not (Test-Path -LiteralPath (Join-Path $staging 'index.html') -PathType Leaf)) { throw 'The update package has no panel entry point.' }
    if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf)) { throw 'The update package has no version metadata.' }
    $packageVersion = (Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json).version
    if ($packageVersion -ne $Version) { throw "Package version $packageVersion does not match expected version $Version." }

    $installedBin = Join-Path $destinationPath 'bin'
    if (Test-Path -LiteralPath $installedBin -PathType Container) {
        $stagedBin = Join-Path $staging 'bin'
        New-Item -Path $stagedBin -ItemType Directory -Force | Out-Null
        Copy-Item -Path (Join-Path $installedBin '*') -Destination $stagedBin -Recurse -Force
        Write-UpdateLog 'Preserved installed media tools.'
    }

    $backup = "$destinationPath.backup"
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
    if (Test-Path -LiteralPath $destinationPath) { Move-Item -LiteralPath $destinationPath -Destination $backup }
    try {
        Move-Item -LiteralPath $staging -Destination $destinationPath
        if (-not (Test-Path -LiteralPath (Join-Path $destinationPath 'CSXS\manifest.xml'))) { throw 'Installed manifest verification failed.' }
        Write-UpdateLog "BunBun Media $Version installed successfully."
        if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
    } catch {
        Write-UpdateLog "Install failed; restoring backup: $($_.Exception.Message)"
        if (Test-Path -LiteralPath $destinationPath) { Remove-Item -LiteralPath $destinationPath -Recurse -Force }
        if (Test-Path -LiteralPath $backup) { Move-Item -LiteralPath $backup -Destination $destinationPath }
        throw
    } finally {
        if (Test-Path -LiteralPath $workRoot) { Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction SilentlyContinue }
    }
} catch {
    Write-UpdateLog "ERROR: $($_.Exception.Message)"
    exit 1
}

exit 0
