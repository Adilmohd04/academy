# 🚀 Automated Setup Script for Education Platform
# Run this script to set up both frontend and backend automatically

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🎓 Education Platform Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "✓ Checking Node.js installation..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found! Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
Write-Host "✓ Checking PostgreSQL installation..." -ForegroundColor Yellow
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "  ✓ PostgreSQL found" -ForegroundColor Green
} else {
    Write-Host "  ⚠ PostgreSQL not found. Please install from https://www.postgresql.org/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📦 Installing Dependencies" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Backend setup
Write-Host ""
Write-Host "🔧 Setting up Backend..." -ForegroundColor Yellow
Set-Location backend

if (Test-Path "package.json") {
    Write-Host "  → Installing backend dependencies..." -ForegroundColor Gray
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to install backend dependencies" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ package.json not found in backend/" -ForegroundColor Red
}

Set-Location ..

# Frontend setup
Write-Host ""
Write-Host "🎨 Setting up Frontend..." -ForegroundColor Yellow
Set-Location frontend

if (Test-Path "package.json") {
    Write-Host "  → Installing frontend dependencies..." -ForegroundColor Gray
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to install frontend dependencies" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ package.json not found in frontend/" -ForegroundColor Red
}

Set-Location ..

# Environment setup
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🔐 Setting up Environment File" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "  ✓ .env file already exists" -ForegroundColor Green
    Write-Host "  ℹ If you need to reset it, delete .env and copy from .env.example" -ForegroundColor Gray
} elseif (Test-Path ".env.example") {
    Write-Host "  → Creating .env from .env.example..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
    Write-Host "  ✓ .env file created" -ForegroundColor Green
    Write-Host "  ⚠ IMPORTANT: Edit .env and add your Clerk API keys!" -ForegroundColor Yellow
} else {
    Write-Host "  ✗ .env.example not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Get Clerk API Keys:" -ForegroundColor White
Write-Host "   → Visit: https://dashboard.clerk.com/" -ForegroundColor Gray
Write-Host "   → Create an application" -ForegroundColor Gray
Write-Host "   → Copy your API keys" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Edit the main .env file:" -ForegroundColor White
Write-Host "   → Edit .env - Add Clerk keys and DB password" -ForegroundColor Gray
Write-Host "   → Both backend and frontend read from this ONE file!" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Setup PostgreSQL database:" -ForegroundColor White
Write-Host "   → psql -U postgres -c `"CREATE DATABASE education_platform;`"" -ForegroundColor Gray
Write-Host "   → psql -U postgres -d education_platform -f backend/database/schema.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start the servers:" -ForegroundColor White
Write-Host "   → Backend: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "   → Frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Open in browser:" -ForegroundColor White
Write-Host "   → http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 For detailed instructions, see SETUP.md" -ForegroundColor Cyan
Write-Host ""
