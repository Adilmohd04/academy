# Migration Script - Add course_type column
# Run this script to add the course_type column to your database

Write-Host "Starting database migration: Add course_type column" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if .env file exists
if (-Not (Test-Path "../.env")) {
    Write-Host "Error: .env file not found. Please create it first." -ForegroundColor Red
    exit 1
}

# Load environment variables
Get-Content ../.env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value)
    }
}

$dbUrl = $env:DATABASE_URL

if (-Not $dbUrl) {
    Write-Host "Error: DATABASE_URL not found in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Database URL found" -ForegroundColor Green

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-Not $psqlPath) {
    Write-Host "Error: PostgreSQL client (psql) not found. Please install PostgreSQL." -ForegroundColor Red
    exit 1
}

Write-Host "PostgreSQL client found" -ForegroundColor Green

# Run the migration
Write-Host "`nRunning migration..." -ForegroundColor Yellow

$migrationFile = Join-Path $PSScriptRoot "migrations\add_course_type_column.sql"

if (-Not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

try {
    psql $dbUrl -f $migrationFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Migration completed successfully!" -ForegroundColor Green
        Write-Host "The course_type column has been added to the courses table." -ForegroundColor Green
    } else {
        Write-Host "`n✗ Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n✗ Migration failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nMigration process complete." -ForegroundColor Cyan
