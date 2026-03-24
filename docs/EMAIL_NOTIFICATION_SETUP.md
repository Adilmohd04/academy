# Email Notification System - Setup Guide

## 📦 Installation

### 1. Install Required Packages

```bash
cd backend
npm install nodemailer node-cron date-fns
npm install --save-dev @types/nodemailer @types/node-cron
```

### 2. Run Database Migration

```bash
# Using psql
psql -U your_username -d your_database -f database/migrations/add_class_notification_tracking.sql

# Or using your migration tool
npm run migrate
```

### 3. Configure Environment Variables

Add these variables to your `backend/.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@littlemuslimacademy.com
SMTP_PASS=your-app-specific-password

# For Gmail, you need to:
# 1. Enable 2-factor authentication on your Google account
# 2. Generate an "App Password" at https://myaccount.google.com/apppasswords
# 3. Use that app password here (not your regular Gmail password)

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
```

## 🔧 Integration

### 4. Register Routes in Your Express App

Edit `backend/src/app.ts` or `backend/src/server.ts`:

```typescript
import express from 'express';
import notificationRoutes from './routes/notifications';

const app = express();

// ... other middleware ...

// Register notification routes
app.use('/api/notifications', notificationRoutes);

// ... rest of your app ...
```

### 5. Start the Cron Job

Edit `backend/src/server.ts` or `backend/src/app.ts`:

```typescript
import { startClassNotificationJob } from './jobs/classNotifications';
import { verifyEmailConfig } from './services/emailNotifications';

// After database connection is established
async function startServer() {
  // ... database connection code ...
  
  // Verify email configuration
  const emailReady = await verifyEmailConfig();
  if (emailReady) {
    console.log('✅ Email service is ready');
    
    // Start the notification cron job
    startClassNotificationJob();
  } else {
    console.warn('⚠️ Email service not configured properly');
  }
  
  // ... start express server ...
}

startServer();
```

## ✅ Testing

### Test Email Configuration

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@example.com"}'
```

You should receive a test email within seconds.

### Test 24-Hour Reminder

```bash
curl -X POST http://localhost:3000/api/notifications/class-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "classData": {
      "className": "Introduction to Quran",
      "courseName": "Islamic Studies 101",
      "classDate": "Monday, January 15, 2024",
      "classTime": "10:00 AM",
      "duration": 60,
      "teacherName": "Sheikh Ahmad",
      "meetingUrl": "https://meet.google.com/test-link"
    },
    "students": [
      {
        "studentName": "Test Student",
        "studentEmail": "student@example.com"
      }
    ]
  }'
```

### Test the Cron Job

Create a test class in your database scheduled for:
- 24 hours from now (for 24-hour reminder)
- 1 hour from now (for 1-hour reminder)  
- 30 minutes from now (for 30-minute alert)

The cron job runs every 10 minutes and will automatically send emails when it detects upcoming classes.

## 📊 Monitoring

### Check Notification Status

Query to see which notifications have been sent:

```sql
SELECT 
  id,
  title,
  scheduled_at,
  notification_24hr_sent,
  notification_24hr_sent_at,
  notification_1hr_sent,
  notification_1hr_sent_at,
  notification_30min_sent,
  notification_30min_sent_at
FROM classes
WHERE scheduled_at > NOW()
ORDER BY scheduled_at ASC;
```

### Check Logs

The cron job outputs detailed logs:

```
⏰ Running class notification check: December 29, 2025, 2:30 PM
🔍 Checking for classes in 24 hours (December 30, 2025, 2:30 PM)
📧 Found 2 classes needing 24-hour reminders
  ➡️ Sending reminders for: Introduction to Quran (15 students)
  ✅ 24-hour reminders: 15 sent, 0 failed
✅ Notification check complete
```

## 🔍 Troubleshooting

### "Authentication failed" Error

**Problem:** SMTP credentials are incorrect

**Solution:**
- For Gmail: Make sure you're using an App Password, not your regular password
- Enable 2-factor authentication first
- Generate App Password at: https://myaccount.google.com/apppasswords

### Emails Going to Spam

**Problem:** Emails are being marked as spam

**Solutions:**
1. Use a professional email service (SendGrid, AWS SES) instead of Gmail
2. Set up SPF and DKIM records for your domain
3. Use a custom domain email (not @gmail.com)
4. Keep "from" address consistent

### Cron Job Not Running

**Problem:** No emails being sent automatically

**Solution:**
- Check server logs for errors
- Verify `startClassNotificationJob()` is being called
- Check that classes exist in database with `status = 'scheduled'`
- Ensure `scheduled_at` times are in the future

### Duplicate Emails

**Problem:** Students receiving multiple copies of the same email

**Solution:**
- The notification flags (`notification_24hr_sent`, etc.) prevent duplicates
- If you're getting duplicates, check that the UPDATE queries are working
- Verify database transactions are completing successfully

## 🚀 Production Recommendations

### 1. Use Professional Email Service

Instead of Gmail SMTP, use:
- **SendGrid** (99.9% uptime, 100 free emails/day)
- **AWS SES** (Pay as you go, very reliable)
- **Mailgun** (Good for transactional emails)

### 2. Add Email Queue

For better reliability, use a queue system:

```bash
npm install bull redis
```

```typescript
import Queue from 'bull';

const emailQueue = new Queue('email-notifications', {
  redis: { host: 'localhost', port: 6379 }
});

emailQueue.process(async (job) => {
  const { type, classData, student } = job.data;
  
  if (type === '24hour') {
    await send24HourReminder(classData, student);
  }
  // ... handle other types
});

// In your cron job, add to queue instead of sending directly:
await emailQueue.add({ type: '24hour', classData, student });
```

### 3. Add Retry Logic

```typescript
async function sendEmailWithRetry(sendFunction: Function, data: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendFunction(data);
      return true;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}
```

### 4. Monitor Email Delivery

- Track bounce rates
- Monitor open rates (add tracking pixel)
- Log all email attempts to database
- Set up alerts for high failure rates

### 5. Respect User Preferences

Add student notification preferences:

```sql
CREATE TABLE student_notification_preferences (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  email_24hr_enabled BOOLEAN DEFAULT true,
  email_1hr_enabled BOOLEAN DEFAULT true,
  email_30min_enabled BOOLEAN DEFAULT true,
  weekly_digest_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 📈 Success Metrics

After deploying, monitor:
- **Email Delivery Rate**: Should be > 99%
- **Open Rate**: Typically 40-60% for educational emails
- **Click Rate**: 10-20% (students clicking "Join Meeting")
- **Class Attendance**: Should increase by 15-30% with reminders

## 🎉 You're All Set!

The email notification system is now:
- ✅ Sending 24-hour reminders automatically
- ✅ Sending 1-hour reminders automatically  
- ✅ Sending 30-minute urgent alerts automatically
- ✅ Supporting weekly schedule digests
- ✅ Tracking all sent notifications
- ✅ Preventing duplicate emails

Your students will never miss a class again! 📚✨
