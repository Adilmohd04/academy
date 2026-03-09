# Recovery script for configuration files from VSCode local history

$historyPath = "$env:APPDATA\Code\User\History"
$frontendBase = "C:\Users\amohamed53\Downloads\academy-dev-fixes\academy-dev-fixes\frontend"

Write-Host "Recovering configuration files..." -ForegroundColor Green
Write-Host ""

$recoveredConfigs = @()
$processedPaths = @{}

Get-ChildItem -Path $historyPath -Directory | Sort-Object LastWriteTime -Descending | ForEach-Object {
    $entriesFile = Join-Path $_.FullName "entries.json"
    
    if (Test-Path $entriesFile) {
        try {
            $entries = Get-Content $entriesFile -Raw | ConvertFrom-Json
            $resourceUri = $entries.resource
            $decodedPath = [System.Uri]::UnescapeDataString($resourceUri)
            
            # Check if it's a frontend root-level config file
            if ($decodedPath -match "frontend/([^/]+\.(json|js|ts|mjs))$") {
                $fileName = $matches[1]
                $targetPath = Join-Path $frontendBase $fileName
                
                # Skip if already processed
                if ($processedPaths.ContainsKey($targetPath)) {
                    continue
                }
                
                # Find the most recent version
                $versionFile = Get-ChildItem -Path $_.FullName -File |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 1
                
                if ($versionFile) {
                    Copy-Item -Path $versionFile.FullName -Destination $targetPath -Force
                    Write-Host "[RECOVERED] $fileName" -ForegroundColor Cyan
                    Write-Host "  From: $($_.Name) (Modified: $($_.LastWriteTime))" -ForegroundColor Gray
                    $recoveredConfigs += $fileName
                    $processedPaths[$targetPath] = $true
                }
            }
        }
        catch {
            continue
        }
    }
}

Write-Host ""
Write-Host "Total config files recovered: $($recoveredConfigs.Count)" -ForegroundColor Yellow
if ($recoveredConfigs.Count -gt 0) {
    $recoveredConfigs | ForEach-Object { Write-Host "  - $_" }
}
