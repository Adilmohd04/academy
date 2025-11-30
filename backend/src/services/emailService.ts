/**
 * Email Service
 * 
 * Handles email notifications for meetings, payments, and system events
 * Using Nodemailer with Gmail SMTP
 */

import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Use App Password, not regular password
  },
});

// Email templates
const emailTemplates = {
  meetingAssigned: (studentName: string, teacherName: string, meetingDate: string, meetingTime: string, meetingLink: string) => ({
    subject: '🎓 Your Meeting Has Been Scheduled!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .meeting-detail { display: flex; margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 5px; }
          .meeting-detail-label { font-weight: bold; color: #4f46e5; width: 150px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Meeting Confirmed!</h1>
            <p>Your meeting has been scheduled successfully</p>
          </div>
          <div class="content">
            <p>Dear <strong>${studentName}</strong>,</p>
            <p>Great news! Your meeting request has been approved and a teacher has been assigned.</p>
            
            <div class="meeting-card">
              <h2 style="color: #4f46e5; margin-top: 0;">📅 Meeting Details</h2>
              
              <div class="meeting-detail">
                <span class="meeting-detail-label">👨‍🏫 Teacher:</span>
                <span>${teacherName}</span>
              </div>
              
              <div class="meeting-detail">
                <span class="meeting-detail-label">📆 Date:</span>
                <span>${meetingDate}</span>
              </div>
              
              <div class="meeting-detail">
                <span class="meeting-detail-label">⏰ Time:</span>
                <span>${meetingTime}</span>
              </div>
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${meetingLink}" class="button" style="color: white;">
                  🎥 Join Meeting
                </a>
              </div>
              
              <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 5px;">
                <strong>⏰ Reminder:</strong> You will receive a reminder email 1 hour before the meeting.
              </p>
            </div>
            
            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>⚠️ Important Policies:</strong></p>
              <ul style="margin: 10px 0; color: #991b1b;">
                <li>No refunds will be processed</li>
                <li>Meetings cannot be rescheduled</li>
                <li>Please join on time</li>
              </ul>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br><strong>Education Platform Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 Education Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  teacherAssigned: (teacherName: string, studentName: string, studentEmail: string, studentPhone: string, meetingDate: string, meetingTime: string, meetingLink: string) => ({
    subject: '👨‍🏫 New Meeting Assignment',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .student-info { display: flex; margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 5px; }
          .student-info-label { font-weight: bold; color: #059669; width: 150px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 New Meeting Assignment</h1>
            <p>You have been assigned to a new meeting</p>
          </div>
          <div class="content">
            <p>Dear <strong>${teacherName}</strong>,</p>
            <p>You have been assigned to conduct a meeting with a student. Please review the details below:</p>
            
            <div class="meeting-card">
              <h2 style="color: #059669; margin-top: 0;">👨‍🎓 Student Information</h2>
              
              <div class="student-info">
                <span class="student-info-label">Name:</span>
                <span>${studentName}</span>
              </div>
              
              <div class="student-info">
                <span class="student-info-label">Email:</span>
                <span>${studentEmail}</span>
              </div>
              
              <div class="student-info">
                <span class="student-info-label">Phone:</span>
                <span>${studentPhone}</span>
              </div>
              
              <h3 style="color: #059669; margin-top: 30px;">📅 Meeting Schedule</h3>
              
              <div class="student-info">
                <span class="student-info-label">📆 Date:</span>
                <span>${meetingDate}</span>
              </div>
              
              <div class="student-info">
                <span class="student-info-label">⏰ Time:</span>
                <span>${meetingTime}</span>
              </div>
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${meetingLink}" class="button" style="color: white;">
                  🎥 Join Meeting Room
                </a>
              </div>
            </div>
            
            <p style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <strong>💡 Tip:</strong> You will receive a reminder 1 hour before the meeting starts.
            </p>
            
            <p>Thank you for your dedication to teaching!</p>
            <p>Best regards,<br><strong>Education Platform Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 Education Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  meetingReminder: (recipientName: string, role: string, otherPersonName: string, meetingDate: string, meetingTime: string, meetingLink: string) => ({
    subject: '⏰ Meeting Reminder - Starting in 1 Hour!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .reminder-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 18px; font-weight: bold; }
          .urgent { background: #fef3c7; padding: 20px; border-radius: 8px; border: 2px solid #f59e0b; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Meeting Reminder</h1>
            <p>Your meeting starts in 1 hour!</p>
          </div>
          <div class="content">
            <p>Dear <strong>${recipientName}</strong>,</p>
            
            <div class="urgent">
              <h2 style="color: #d97706; margin-top: 0;">🔔 Your meeting is starting soon!</h2>
              <p style="font-size: 18px; margin: 10px 0;">
                <strong>${role === 'student' ? 'Teacher' : 'Student'}:</strong> ${otherPersonName}
              </p>
              <p style="font-size: 18px; margin: 10px 0;">
                <strong>⏰ Time:</strong> ${meetingTime}
              </p>
            </div>
            
            <div class="reminder-box">
              <p style="font-size: 16px; color: #6b7280;">Join the meeting room now:</p>
              <a href="${meetingLink}" class="button" style="color: white;">
                🎥 Join Meeting Now
              </a>
            </div>
            
            <p style="text-align: center; color: #6b7280; margin-top: 30px;">
              Please join on time. Looking forward to a productive session!
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

/**
 * Send meeting assignment notification to student
 */
export const sendStudentMeetingNotification = async (
  studentEmail: string,
  studentName: string,
  teacherName: string,
  meetingDate: string,
  meetingTime: string,
  meetingLink: string
): Promise<void> => {
  try {
    const { subject, html } = emailTemplates.meetingAssigned(
      studentName,
      teacherName,
      meetingDate,
      meetingTime,
      meetingLink
    );

    await transporter.sendMail({
      from: `"Education Platform" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject,
      html,
    });

    console.log(`✅ Meeting notification sent to student: ${studentEmail}`);
  } catch (error) {
    console.error('❌ Error sending student notification:', error);
    throw error;
  }
};

/**
 * Send meeting assignment notification to teacher
 */
export const sendTeacherMeetingNotification = async (
  teacherEmail: string,
  teacherName: string,
  studentName: string,
  studentEmail: string,
  studentPhone: string,
  meetingDate: string,
  meetingTime: string,
  meetingLink: string
): Promise<void> => {
  try {
    const { subject, html } = emailTemplates.teacherAssigned(
      teacherName,
      studentName,
      studentEmail,
      studentPhone,
      meetingDate,
      meetingTime,
      meetingLink
    );

    await transporter.sendMail({
      from: `"Education Platform" <${process.env.EMAIL_USER}>`,
      to: teacherEmail,
      subject,
      html,
    });

    console.log(`✅ Meeting notification sent to teacher: ${teacherEmail}`);
  } catch (error) {
    console.error('❌ Error sending teacher notification:', error);
    throw error;
  }
};

/**
 * Send meeting reminder (1 hour before)
 */
export const sendMeetingReminder = async (
  recipientEmail: string,
  recipientName: string,
  role: 'student' | 'teacher',
  otherPersonName: string,
  meetingDate: string,
  meetingTime: string,
  meetingLink: string
): Promise<void> => {
  try {
    const { subject, html } = emailTemplates.meetingReminder(
      recipientName,
      role,
      otherPersonName,
      meetingDate,
      meetingTime,
      meetingLink
    );

    await transporter.sendMail({
      from: `"Education Platform" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html,
    });

    console.log(`✅ Meeting reminder sent to ${role}: ${recipientEmail}`);
  } catch (error) {
    console.error('❌ Error sending meeting reminder:', error);
    throw error;
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
};
