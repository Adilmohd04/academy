import nodemailer from 'nodemailer';

// Check if SMTP is configured
const isEmailConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

// Email transporter configuration
const transporter = isEmailConfigured ? nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

// Email templates
const getEmailTemplate = (type: string, data: any): string => {
  const baseStyle = `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
      .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 40px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 28px; }
      .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 30px; background: #f9fafb; }
      .class-info { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #10b981; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .class-info h2 { margin: 0 0 20px 0; color: #10b981; font-size: 24px; }
      .info-row { display: flex; margin: 12px 0; align-items: center; }
      .info-label { min-width: 120px; font-weight: 600; color: #6b7280; font-size: 14px; }
      .info-value { color: #1f2937; font-size: 16px; }
      .join-button { display: inline-block; background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; margin: 25px 0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: transform 0.2s; }
      .join-button:hover { transform: translateY(-2px); }
      .checklist { background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b; }
      .checklist h3 { margin: 0 0 15px 0; color: #92400e; font-size: 18px; }
      .checklist ul { margin: 0; padding-left: 25px; }
      .checklist li { margin: 8px 0; color: #78350f; }
      .footer { text-align: center; color: #9ca3af; font-size: 14px; padding: 25px; background: #f3f4f6; }
      .footer-logo { font-size: 18px; font-weight: bold; color: #10b981; margin-bottom: 5px; }
      .urgent-banner { background: #ef4444; color: white; padding: 20px; border-radius: 10px; text-align: center; font-size: 22px; font-weight: bold; margin: 20px 0; }
      .week-schedule { background: white; padding: 20px; border-radius: 10px; margin: 15px 0; }
      .schedule-item { padding: 15px; border-bottom: 1px solid #e5e7eb; }
      .schedule-item:last-child { border-bottom: none; }
      .schedule-date { font-weight: bold; color: #10b981; font-size: 16px; margin-bottom: 5px; }
      .schedule-title { color: #1f2937; font-size: 15px; margin-bottom: 8px; }
      .schedule-link { color: #10b981; text-decoration: none; font-size: 14px; }
    </style>
  `;

  if (type === '24hour') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyle}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Class Reminder</h1>
            <p>You have a live class scheduled for tomorrow!</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 10px;">Dear <strong>${data.studentName}</strong>,</p>
            
            <p>This is a friendly reminder about your upcoming live class:</p>
            
            <div class="class-info">
              <h2>${data.className}</h2>
              <div class="info-row">
                <div class="info-label">📚 Course:</div>
                <div class="info-value">${data.courseName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">📅 Date:</div>
                <div class="info-value">${data.classDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">⏰ Time:</div>
                <div class="info-value">${data.classTime}</div>
              </div>
              <div class="info-row">
                <div class="info-label">⏱️ Duration:</div>
                <div class="info-value">${data.duration} minutes</div>
              </div>
              <div class="info-row">
                <div class="info-label">👨‍🏫 Teacher:</div>
                <div class="info-value">${data.teacherName}</div>
              </div>
            </div>
            
            ${data.meetingUrl ? `
              <div style="text-align: center;">
                <a href="${data.meetingUrl}" class="join-button">
                  🎥 Join Meeting
                </a>
              </div>
            ` : ''}
            
            <div class="checklist">
              <h3>📝 What to prepare:</h3>
              <ul>
                <li>Review last week's materials and notes</li>
                <li>Prepare any questions you have for the teacher</li>
                <li>Test your camera and microphone beforehand</li>
                <li>Find a quiet place for the class</li>
                <li>Have your notebook and materials ready</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Need to reschedule? Please contact your teacher or admin as soon as possible.
            </p>
            
            <p style="font-size: 16px; margin-top: 20px;">
              Looking forward to seeing you in class! 📖
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-logo">Little Muslim Academy</div>
            <p>Quality Islamic Education for Everyone</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  if (type === '1hour') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyle}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #f59e0b, #f97316);">
            <h1>⏰ Class Starting Soon!</h1>
            <p>Your class begins in 1 hour</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px;">Hi <strong>${data.studentName}</strong>,</p>
            
            <div class="class-info">
              <h2>${data.className}</h2>
              <div class="info-row">
                <div class="info-label">📅 Today at:</div>
                <div class="info-value" style="font-size: 20px; font-weight: bold; color: #f59e0b;">${data.classTime}</div>
              </div>
              <div class="info-row">
                <div class="info-label">👨‍🏫 Teacher:</div>
                <div class="info-value">${data.teacherName}</div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.meetingUrl}" class="join-button" style="background: linear-gradient(135deg, #f59e0b, #f97316); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                🚀 JOIN NOW
              </a>
            </div>
            
            <div class="checklist">
              <h3>Quick Pre-Class Checklist:</h3>
              <ul>
                <li>✓ Camera working properly</li>
                <li>✓ Microphone working properly</li>
                <li>✓ Quiet environment prepared</li>
                <li>✓ Course materials ready</li>
              </ul>
            </div>
            
            <p style="text-align: center; font-size: 18px; margin-top: 20px;">
              See you in an hour! 🎓
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-logo">Little Muslim Academy</div>
            <p>Quality Islamic Education for Everyone</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  if (type === '30min') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyle}
      </head>
      <body>
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
            <h1>🔔 JOIN NOW!</h1>
            <p>Class starts in 30 minutes</p>
          </div>
          
          <div class="content">
            <div class="urgent-banner">
              ⚠️ CLASS STARTING IN 30 MINUTES!
            </div>
            
            <div class="class-info">
              <h2 style="text-align: center; margin-bottom: 10px;">${data.className}</h2>
              <p style="text-align: center; font-size: 18px; color: #6b7280;">Starting at ${data.classTime}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.meetingUrl}" class="join-button" style="background: linear-gradient(135deg, #ef4444, #dc2626); font-size: 20px; padding: 20px 50px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);">
                🚀 JOIN CLASS NOW
              </a>
            </div>
            
            <p style="text-align: center; font-size: 18px; margin-top: 30px; color: #1f2937;">
              Don't be late, <strong>${data.studentName}</strong>! ⏰
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-logo">Little Muslim Academy</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  if (type === 'weekly') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyle}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Your Weekly Schedule</h1>
            <p>Week ${data.weekNumber} - ${data.courseName}</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px;">Dear <strong>${data.studentName}</strong>,</p>
            
            <p>Here's your class schedule for this week:</p>
            
            <div class="week-schedule">
              ${data.classes.map((cls: any) => `
                <div class="schedule-item">
                  <div class="schedule-date">📅 ${cls.date} at ${cls.time}</div>
                  <div class="schedule-title">${cls.title}</div>
                  ${cls.meetingUrl ? `<a href="${cls.meetingUrl}" class="schedule-link">🔗 Join Link</a>` : ''}
                </div>
              `).join('')}
            </div>
            
            <div style="background: #dbeafe; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e3a8a; font-size: 15px;">
                <strong>Total Classes This Week:</strong> ${data.classes.length}
              </p>
            </div>
            
            <p style="font-size: 16px; margin-top: 20px;">
              Stay on track with your learning! We'll send you reminders before each class. 📚
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-logo">Little Muslim Academy</div>
            <p>Quality Islamic Education for Everyone</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  return '';
};

// Send 24-hour class reminder
export async function send24HourReminder(classData: any, student: any): Promise<void> {
  if (!isEmailConfigured || !transporter) {
    console.log('⚠️  Email not configured - skipping 24-hour reminder');
    return;
  }
  
  try {
    const mailOptions = {
      from: `"Little Muslim Academy" <${process.env.SMTP_USER}>`,
      to: student.studentEmail,
      subject: `📚 Reminder: ${classData.className} Tomorrow at ${classData.classTime}`,
      html: getEmailTemplate('24hour', {
        ...classData,
        studentName: student.studentName,
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ 24-hour reminder sent to ${student.studentEmail}`);
  } catch (error) {
    console.error(`❌ Error sending 24-hour reminder to ${student.studentEmail}:`, error);
    throw error;
  }
}

// Send 1-hour class reminder
export async function send1HourReminder(classData: any, student: any): Promise<void> {
  if (!isEmailConfigured || !transporter) {
    console.log('⚠️  Email not configured - skipping 1-hour reminder');
    return;
  }
  
  try {
    const mailOptions = {
      from: `"Little Muslim Academy" <${process.env.SMTP_USER}>`,
      to: student.studentEmail,
      subject: `⏰ Starting Soon: ${classData.className} in 1 Hour`,
      html: getEmailTemplate('1hour', {
        ...classData,
        studentName: student.studentName,
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ 1-hour reminder sent to ${student.studentEmail}`);
  } catch (error) {
    console.error(`❌ Error sending 1-hour reminder to ${student.studentEmail}:`, error);
    throw error;
  }
}

// Send 30-minute class alert
export async function send30MinuteAlert(classData: any, student: any): Promise<void> {
  if (!isEmailConfigured || !transporter) {
    console.log('⚠️  Email not configured - skipping 30-minute alert');
    return;
  }
  
  try {
    const mailOptions = {
      from: `"Little Muslim Academy" <${process.env.SMTP_USER}>`,
      to: student.studentEmail,
      subject: `🔔 JOIN NOW: ${classData.className} Starting in 30 Minutes!`,
      html: getEmailTemplate('30min', {
        ...classData,
        studentName: student.studentName,
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ 30-minute alert sent to ${student.studentEmail}`);
  } catch (error) {
    console.error(`❌ Error sending 30-minute alert to ${student.studentEmail}:`, error);
    throw error;
  }
}

// Send weekly schedule digest
export async function sendWeeklyDigest(data: any, student: any): Promise<void> {
  if (!isEmailConfigured || !transporter) {
    console.log('⚠️  Email not configured - skipping weekly digest');
    return;
  }
  
  try {
    const mailOptions = {
      from: `"Little Muslim Academy" <${process.env.SMTP_USER}>`,
      to: student.studentEmail,
      subject: `📅 Your Class Schedule for Week ${data.weekNumber}`,
      html: getEmailTemplate('weekly', {
        ...data,
        studentName: student.studentName,
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Weekly digest sent to ${student.studentEmail}`);
  } catch (error) {
    console.error(`❌ Error sending weekly digest to ${student.studentEmail}:`, error);
    throw error;
  }
}

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!isEmailConfigured || !transporter) {
      console.log('⚠️  Email service not configured - notifications disabled');
      console.log('   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to enable');
      return false;
    }
    
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server verification failed:', error);
    console.log('⚠️  Email service not configured properly - notifications disabled');
    console.log('   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to enable');
    return false;
  }
}
