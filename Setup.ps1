Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$form = New-Object System.Windows.Forms.Form
$form.Text = 'BunBun Media - Setup'
$form.ClientSize = New-Object System.Drawing.Size(520, 470)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.BackColor = [Drawing.Color]::FromArgb(28, 29, 33)
$form.ForeColor = [Drawing.Color]::Gainsboro
$form.Font = New-Object Drawing.Font('Segoe UI', 10)

$title = New-Object Windows.Forms.Label
$title.Text = 'BunBun Media'; $title.Font = New-Object Drawing.Font('Segoe UI', 17, [Drawing.FontStyle]::Bold)
$title.Location = New-Object Drawing.Point(20, 18); $title.Size = New-Object Drawing.Size(460, 34)
$form.Controls.Add($title)
$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = 'Premiere Pro extension installer'; $subtitle.ForeColor = [Drawing.Color]::DarkGray
$subtitle.Location = New-Object Drawing.Point(22, 54); $subtitle.Size = New-Object Drawing.Size(450, 24)
$form.Controls.Add($subtitle)

$log = New-Object Windows.Forms.RichTextBox
$log.Location = New-Object Drawing.Point(20, 95); $log.Size = New-Object Drawing.Size(480, 285)
$log.ReadOnly = $true; $log.BackColor = [Drawing.Color]::FromArgb(18, 19, 22); $log.ForeColor = [Drawing.Color]::Silver
$log.BorderStyle = 'None'; $log.Font = New-Object Drawing.Font('Consolas', 9)
$form.Controls.Add($log)

$progress = New-Object Windows.Forms.ProgressBar
$progress.Location = New-Object Drawing.Point(20, 392); $progress.Size = New-Object Drawing.Size(480, 8)
$form.Controls.Add($progress)
$button = New-Object Windows.Forms.Button
$button.Text = 'Install'; $button.Location = New-Object Drawing.Point(20, 414); $button.Size = New-Object Drawing.Size(480, 38)
$button.FlatStyle = 'Flat'; $button.FlatAppearance.BorderSize = 0; $button.BackColor = [Drawing.Color]::FromArgb(85, 125, 235); $button.ForeColor = [Drawing.Color]::White
$form.Controls.Add($button)

function Write-SetupLog([string]$Message) { $log.AppendText("$Message`n"); $log.ScrollToCaret(); [Windows.Forms.Application]::DoEvents() }
function Download-Tool([string]$Name, [string]$Url, [string]$Destination) {
    if (Test-Path -LiteralPath $Destination) { Write-SetupLog "$Name is bundled."; return $true }
    Write-SetupLog "Downloading $Name..."
    try { Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing; Write-SetupLog "$Name downloaded."; return $true }
    catch { Write-SetupLog "WARNING: $Name download failed: $($_.Exception.Message)"; return $false }
}

$button.Add_Click({
    if ($button.Text -eq 'Close') { $form.Close(); return }
    $button.Enabled = $false; $button.Text = 'Installing...'
    $source = $scriptRoot
    $destination = Join-Path $env:APPDATA 'Adobe\CEP\extensions\BunBunMedia'
    Write-SetupLog 'Enabling unsigned CEP extensions...'
    foreach ($version in 8..15) {
        $key = "HKCU:\Software\Adobe\CSXS.$version"
        New-Item -Path $key -Force -ErrorAction SilentlyContinue | Out-Null
        Set-ItemProperty -Path $key -Name PlayerDebugMode -Value '1' -Type String -Force
    }
    $progress.Value = 20
    Write-SetupLog "Installing to $destination"
    try {
        if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
        New-Item -Path $destination -ItemType Directory -Force | Out-Null
        Copy-Item -Path (Join-Path $source '*') -Destination $destination -Recurse -Force
    } catch { Write-SetupLog "ERROR: Could not copy the extension: $($_.Exception.Message)"; $button.Enabled = $true; $button.Text = 'Close'; return }
    $progress.Value = 45
    $bin = Join-Path $destination 'bin'; New-Item -Path $bin -ItemType Directory -Force | Out-Null
    Download-Tool 'yt-dlp' 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' (Join-Path $bin 'yt-dlp.exe') | Out-Null
    $progress.Value = 62
    if (-not (Test-Path -LiteralPath (Join-Path $bin 'deno.exe'))) {
        Write-SetupLog 'Downloading Deno for YouTube format extraction...'
        try {
            $zip = Join-Path $env:TEMP 'bunbun-media-deno.zip'
            Invoke-WebRequest -Uri 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip' -OutFile $zip -UseBasicParsing
            Expand-Archive -LiteralPath $zip -DestinationPath $bin -Force; Remove-Item -LiteralPath $zip -Force
            Write-SetupLog 'Deno installed.'
        } catch { Write-SetupLog "WARNING: Deno download failed: $($_.Exception.Message)" }
    } else { Write-SetupLog 'Deno is bundled.' }
    $progress.Value = 78
    if ((Test-Path -LiteralPath (Join-Path $bin 'ffmpeg.exe')) -and (Test-Path -LiteralPath (Join-Path $bin 'ffprobe.exe'))) {
        Write-SetupLog 'Using the packaged ffmpeg and ffprobe.'
    } else { Write-SetupLog 'WARNING: Packaged ffmpeg or ffprobe is missing. Re-download the extension package.' }
    $progress.Value = 100
    Write-SetupLog ''; Write-SetupLog 'Installation complete. Restart Premiere Pro, then open Window > Extensions > BunBun Media.'
    $button.Enabled = $true; $button.Text = 'Close'; $button.BackColor = [Drawing.Color]::FromArgb(45, 140, 75)
})

$form.ShowDialog() | Out-Null
