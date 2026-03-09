# Email Notification System - Quick Setup Script (Windows)
# This script helps set up the email notification system on Windows

Write-Host "`n📧 Email Notification System - Quick Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "   Please run this script from the backend directory" -ForegroundColor Yellow
    exit 1
}

# Step 1: Install dependencies
Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Green
npm install node-cron date-fns @types/node-cron

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully`n" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 2: Check .env file
Write-Host "🔍 Step 2: Checking .env configuration..." -ForegroundColor Green

if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating .env.example with email configuration template..." -ForegroundColor Cyan
    
    $envExample = @"
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# For Gmail:
# 1. Enable 2-factor authentication
# 2. Generate App Password: https://myaccount.google.com/apppasswords
# 3. Use that password here (not your Gmail password)

# Alternative SMTP Services:
# SendGrid:
#   SMTP_HOST=smtp.sendgrid.net
#   SMTP_PORT=587
#   SMTP_USER=apikey
#   SMTP_PASS=your-sendgrid-api-key

# AWS SES:
#   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
#   SMTP_PORT=587
#   SMTP_USER=your-ses-username
#   SMTP_PASS=your-ses-password
"@
    
    Set-Content -Path ".env.example" -Value $envExample
    Write-Host "✅ Created .env.example" -ForegroundColor Green
    Write-Host "   Please copy it to .env and add your SMTP credentials" -ForegroundColor Yellow
} else {
    # Check if SMTP variables exist
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "SMTP_HOST" -and $envContent -match "SMTP_USER" -and $envContent -match "SMTP_PASS") {
        Write-Host "✅ Email configuration found in .env" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env exists but missing email configuration" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Add these variables to your .env file:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "SMTP_HOST=smtp.gmail.com"
        Write-Host "SMTP_PORT=587"
        Write-Host "SMTP_USER=your-email@gmail.com"
        Write-Host "SMTP_PASS=your-app-password"
    }
}

Write-Host ""

# Step 3: Database migration
Write-Host "📊 Step 3: Database migration" -ForegroundColor Green
Write-Host "   Run this SQL migration:" -ForegroundColor Yellow
Write-Host "   database/migrations/add_class_notification_tracking.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Using psql:" -ForegroundColor Yellow
Write-Host "   psql -U postgres -d your_database -f ..\database\migrations\add_class_notification_tracking.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Press Enter when migration is complete..." -ForegroundColor Yellow
Read-Host

Write-Host ""

# Step 4: Build TypeScript
Write-Host "🔨 Step 4: Building TypeScript..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful`n" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure SMTP credentials are in .env" -ForegroundColor White
Write-Host "2. Run database migration" -ForegroundColor White
Write-Host "3. Start the server: npm run dev" -ForegroundColor White
Write-Host "4. Test email:" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:3000/api/notifications/test ``" -ForegroundColor Gray
Write-Host "     -H `"Content-Type: application/json`" ``" -ForegroundColor Gray
Write-Host "     -d '{`"email`":`"test@example.com`"}'" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - docs\EMAIL_NOTIFICATIONS_COMPLETE.md (Overview)" -ForegroundColor White
Write-Host "   - docs\EMAIL_NOTIFICATION_SETUP.md (Detailed setup)" -ForegroundColor White
Write-Host "   - docs\CLASS_EMAIL_NOTIFICATIONS.md (Feature details)" -ForegroundColor White
Write-Host ""
