# Clean Restart Script for Next.js
# Run this when you get chunk loading errors

Write-Host "🧹 Cleaning Next.js caches..." -ForegroundColor Cyan

# Kill all node processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null
Start-Sleep -Seconds 2

# Clear Next.js build cache
Write-Host "Clearing .next directory..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
}

# Clear node_modules cache
Write-Host "Clearing node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force node_modules/.cache
}

# Clear temporary files
Write-Host "Clearing temp files..." -ForegroundColor Yellow
$env:TEMP_FILES = "$env:TEMP\next-*"
Remove-Item $env:TEMP_FILES -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Cyan
npm run dev
