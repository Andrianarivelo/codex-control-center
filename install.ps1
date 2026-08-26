$ErrorActionPreference = 'Stop'

$repository = 'Andrianarivelo/codex-control-center'
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repository/releases/latest"
$asset = $release.assets | Where-Object { $_.name -like '*.vsix' } | Select-Object -First 1

if (-not $asset) {
    throw 'The latest release does not contain a VSIX package.'
}

$downloadPath = Join-Path ([System.IO.Path]::GetTempPath()) $asset.name
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $downloadPath

try {
    & code --install-extension $downloadPath --force
    if ($LASTEXITCODE -ne 0) {
        throw "VS Code returned exit code $LASTEXITCODE."
    }
    Write-Host 'Codex Control Center installed. Reload VS Code to activate it.' -ForegroundColor Green
}
finally {
    Remove-Item -LiteralPath $downloadPath -Force -ErrorAction SilentlyContinue
}
