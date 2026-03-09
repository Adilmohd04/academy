# Recovery script for deleted frontend files from VSCode local history
# This script will restore your most recent versions from VSCode's cache

$historyPath = "$env:APPDATA\Code\User\History"
$frontendBase = "C:\Users\amohamed53\Downloads\academy-dev-fixes\academy-dev-fixes\frontend"

Write-Host "Starting recovery of frontend files..." -ForegroundColor Green
Write-Host ""

# Get all history folders sorted by last modified
$historyFolders = Get-ChildItem -Path $historyPath -Directory | Sort-Object LastWriteTime -Descending

$recoveredFiles = @()
$processedPaths = @{}

foreach ($folder in $historyFolders) {
    $entriesFile = Join-Path $folder.FullName "entries.json"
    
    if (Test-Path $entriesFile) {
        try {
            $entries = Get-Content $entriesFile -Raw | ConvertFrom-Json
            $resourceUri = $entries.resource
            
            # Decode URI and check if it's a frontend file
            $decodedPath = [System.Uri]::UnescapeDataString($resourceUri)
            
            if ($decodedPath -match "frontend/(app|components|hooks|lib|public|types)/") {
                # Extract the relative path
                if ($decodedPath -match "frontend/(.+)$") {
                    $relativePath = $matches[1]
                    $targetPath = Join-Path $frontendBase $relativePath
                    
                    # Skip if we already processed this path (we keep the most recent version)
                    if ($processedPaths.ContainsKey($targetPath)) {
                        continue
                    }
                    
                    # Find the most recent version file in this history folder
                    $versionFiles = Get-ChildItem -Path $folder.FullName -File | 
                        Where-Object { $_.Extension -in @('.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md', '.svg', '.png', '.jpg') } |
                        Sort-Object LastWriteTime -Descending |
                        Select-Object -First 1
                    
                    if ($versionFiles) {
                        $sourceFile = $versionFiles.FullName
                        
                        # Create directory if it doesn't exist
                        $targetDir = Split-Path $targetPath -Parent
                        if (!(Test-Path $targetDir)) {
                            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                        }
                        
                        # Copy the file
                        Copy-Item -Path $sourceFile -Destination $targetPath -Force
                        
                        Write-Host "[RECOVERED] $relativePath" -ForegroundColor Cyan
                        Write-Host "  From: $($folder.Name) (Modified: $($folder.LastWriteTime))" -ForegroundColor Gray
                        
                        $recoveredFiles += $relativePath
                        $processedPaths[$targetPath] = $true
                    }
                }
            }
        }
        catch {
            # Skip any errors and continue
            continue
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Recovery Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Total files recovered: $($recoveredFiles.Count)" -ForegroundColor Yellow
Write-Host ""

if ($recoveredFiles.Count -gt 0) {
    Write-Host "Recovered files:" -ForegroundColor Cyan
    $recoveredFiles | Sort-Object | ForEach-Object { Write-Host "  - $_" }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check the recovered files in your frontend directory"
Write-Host "2. Test your application to verify everything works"
Write-Host "3. Commit your changes to git to prevent future data loss!"
Write-Host ""
