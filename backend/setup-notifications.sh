#!/bin/bash

# Email Notification System - Quick Setup Script
# This script helps set up the email notification system

echo "📧 Email Notification System - Quick Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from the backend directory"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install node-cron date-fns @types/node-cron

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""

# Step 2: Check .env file
echo "🔍 Step 2: Checking .env configuration..."

if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo ""
    echo "Creating .env.example with email configuration template..."
    cat > .env.example << 'EOF'
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
EOF
    echo "✅ Created .env.example"
    echo "   Please copy it to .env and add your SMTP credentials"
else
    # Check if SMTP variables exist
    if grep -q "SMTP_HOST" .env && grep -q "SMTP_USER" .env && grep -q "SMTP_PASS" .env; then
        echo "✅ Email configuration found in .env"
    else
        echo "⚠️  .env exists but missing email configuration"
        echo ""
        echo "Add these variables to your .env file:"
        echo ""
        echo "SMTP_HOST=smtp.gmail.com"
        echo "SMTP_PORT=587"
        echo "SMTP_USER=your-email@gmail.com"
        echo "SMTP_PASS=your-app-password"
    fi
fi

echo ""

# Step 3: Database migration
echo "📊 Step 3: Database migration"
echo "   Run this SQL migration:"
echo "   database/migrations/add_class_notification_tracking.sql"
echo ""
echo "   Using psql:"
echo "   psql -U postgres -d your_database -f ../database/migrations/add_class_notification_tracking.sql"
echo ""
echo "   Press Enter when migration is complete..."
read

echo ""

# Step 4: Build TypeScript
echo "🔨 Step 4: Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Make sure SMTP credentials are in .env"
echo "2. Run database migration"
echo "3. Start the server: npm run dev"
echo "4. Test email: curl -X POST http://localhost:3000/api/notifications/test -H \"Content-Type: application/json\" -d '{\"email\":\"test@example.com\"}'"
echo ""
echo "📚 Documentation:"
echo "   - docs/EMAIL_NOTIFICATIONS_COMPLETE.md (Overview)"
echo "   - docs/EMAIL_NOTIFICATION_SETUP.md (Detailed setup)"
echo "   - docs/CLASS_EMAIL_NOTIFICATIONS.md (Feature details)"
echo ""
