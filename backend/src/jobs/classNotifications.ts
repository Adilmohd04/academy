import cron from 'node-cron';
import { query } from '../config/database';
import { 
  send24HourReminder, 
  send1HourReminder, 
  send30MinuteAlert 
} from '../services/emailNotifications';
import { format, addHours, addMinutes } from 'date-fns';

/**
 * Automated job that runs every 10 minutes to check for upcoming classes
 * and send appropriate email notifications to enrolled students
 */

// Helper function to format class data for emails
function formatClassData(classRow: any) {
  return {
    classId: classRow.id,
    courseId: classRow.course_id,
    courseName: classRow.course_name,
    className: classRow.title,
    classDate: format(new Date(classRow.scheduled_at), 'EEEE, MMMM d, yyyy'),
    classTime: format(new Date(classRow.scheduled_at), 'h:mm a'),
    duration: classRow.duration || 60,
    teacherName: classRow.teacher_name,
    meetingUrl: classRow.meeting_url
  };
}

// Helper function to get enrolled students for a course
async function getEnrolledStudents(courseId: string) {
  const queryText = `
    SELECT 
      s.id,
      s.email as "studentEmail",
      s.name as "studentName"
    FROM students s
    INNER JOIN course_enrollments ce ON ce.student_id = s.id
    WHERE ce.course_id = $1
      AND ce.status = 'active'
    ORDER BY s.name ASC
  `;

  const result = await query(queryText, [courseId]);
  return result.rows;
}

// Send 24-hour reminders
async function process24HourReminders() {
  try {
    const now = new Date();
    const twentyFourHoursLater = addHours(now, 24);
    const twentyFourHoursThirtyMinLater = addMinutes(twentyFourHoursLater, 30);

    console.log(`🔍 Checking for classes in 24 hours (${format(twentyFourHoursLater, 'PPpp')})`);

    // Find classes starting in approximately 24 hours (within a 30-minute window)
    const queryText = `
      SELECT 
        c.id,
        c.course_id,
        c.title,
        c.scheduled_at,
        c.duration,
        c.meeting_url,
        c.status,
        co.title as course_name,
        co.teacher_name
      FROM classes c
      INNER JOIN courses co ON co.id = c.course_id
      WHERE c.scheduled_at BETWEEN $1 AND $2
        AND c.status = 'scheduled'
        AND (c.notification_24hr_sent IS NULL OR c.notification_24hr_sent = false)
        AND c.cancelled = false
      ORDER BY c.scheduled_at ASC
    `;

    const result = await query(queryText, [twentyFourHoursLater, twentyFourHoursThirtyMinLater]);
    
    console.log(`📧 Found ${result.rows.length} classes needing 24-hour reminders`);

    for (const classRow of result.rows) {
      try {
        const classData = formatClassData(classRow);
        const students = await getEnrolledStudents(classRow.course_id);

        console.log(`  ➡️ Sending reminders for: ${classData.className} (${students.length} students)`);

        let sentCount = 0;
        let failedCount = 0;

        for (const student of students) {
          try {
            await send24HourReminder(classData, student);
            sentCount++;
          } catch (error: any) {
            console.error(`    ❌ Failed to send to ${student.studentEmail}:`, error.message);
            failedCount++;
          }
        }

        // Mark as sent in database
        await query(
          'UPDATE classes SET notification_24hr_sent = true, notification_24hr_sent_at = NOW() WHERE id = $1',
          [classRow.id]
        );

        console.log(`  ✅ 24-hour reminders: ${sentCount} sent, ${failedCount} failed`);
      } catch (error: any) {
        console.error(`  ❌ Error processing class ${classRow.id}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('❌ Error in 24-hour reminder job:', error);
  }
}

// Send 1-hour reminders
async function process1HourReminders() {
  try {
    const now = new Date();
    const oneHourLater = addHours(now, 1);
    const oneHourTenMinLater = addMinutes(oneHourLater, 10);

    console.log(`🔍 Checking for classes in 1 hour (${format(oneHourLater, 'PPpp')})`);

    const queryText1Hr = `
      SELECT 
        c.id,
        c.course_id,
        c.title,
        c.scheduled_at,
        c.duration,
        c.meeting_url,
        c.status,
        co.title as course_name,
        co.teacher_name
      FROM classes c
      INNER JOIN courses co ON co.id = c.course_id
      WHERE c.scheduled_at BETWEEN $1 AND $2
        AND c.status = 'scheduled'
        AND (c.notification_1hr_sent IS NULL OR c.notification_1hr_sent = false)
        AND c.cancelled = false
      ORDER BY c.scheduled_at ASC
    `;

    const result = await query(queryText1Hr, [oneHourLater, oneHourTenMinLater]);
    
    console.log(`📧 Found ${result.rows.length} classes needing 1-hour reminders`);

    for (const classRow of result.rows) {
      try {
        const classData = formatClassData(classRow);
        const students = await getEnrolledStudents(classRow.course_id);

        console.log(`  ➡️ Sending reminders for: ${classData.className} (${students.length} students)`);

        let sentCount = 0;
        let failedCount = 0;

        for (const student of students) {
          try {
            await send1HourReminder(classData, student);
            sentCount++;
          } catch (error: any) {
            console.error(`    ❌ Failed to send to ${student.studentEmail}:`, error.message);
            failedCount++;
          }
        }

        await query(
          'UPDATE classes SET notification_1hr_sent = true, notification_1hr_sent_at = NOW() WHERE id = $1',
          [classRow.id]
        );

        console.log(`  ✅ 1-hour reminders: ${sentCount} sent, ${failedCount} failed`);
      } catch (error: any) {
        console.error(`  ❌ Error processing class ${classRow.id}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('❌ Error in 1-hour reminder job:', error);
  }
}

// Send 30-minute alerts
async function process30MinuteAlerts() {
  try {
    const now = new Date();
    const thirtyMinLater = addMinutes(now, 30);
    const thirtyFiveMinLater = addMinutes(now, 35);

    console.log(`🔍 Checking for classes in 30 minutes (${format(thirtyMinLater, 'PPpp')})`);

    const queryText30Min = `
      SELECT 
        c.id,
        c.course_id,
        c.title,
        c.scheduled_at,
        c.duration,
        c.meeting_url,
        c.status,
        co.title as course_name,
        co.teacher_name
      FROM classes c
      INNER JOIN courses co ON co.id = c.course_id
      WHERE c.scheduled_at BETWEEN $1 AND $2
        AND c.status = 'scheduled'
        AND (c.notification_30min_sent IS NULL OR c.notification_30min_sent = false)
        AND c.cancelled = false
      ORDER BY c.scheduled_at ASC
    `;

    const result = await query(queryText30Min, [thirtyMinLater, thirtyFiveMinLater]);
    
    console.log(`📧 Found ${result.rows.length} classes needing 30-minute alerts`);

    for (const classRow of result.rows) {
      try {
        const classData = formatClassData(classRow);
        const students = await getEnrolledStudents(classRow.course_id);

        console.log(`  ➡️ Sending alerts for: ${classData.className} (${students.length} students)`);

        let sentCount = 0;
        let failedCount = 0;

        for (const student of students) {
          try {
            await send30MinuteAlert(classData, student);
            sentCount++;
          } catch (error: any) {
            console.error(`    ❌ Failed to send to ${student.studentEmail}:`, error.message);
            failedCount++;
          }
        }

        await query(
          'UPDATE classes SET notification_30min_sent = true, notification_30min_sent_at = NOW() WHERE id = $1',
          [classRow.id]
        );

        console.log(`  ✅ 30-minute alerts: ${sentCount} sent, ${failedCount} failed`);
      } catch (error: any) {
        console.error(`  ❌ Error processing class ${classRow.id}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('❌ Error in 30-minute alert job:', error);
  }
}

// Main cron job - runs every 10 minutes
export function startClassNotificationJob() {
  console.log('🚀 Starting class notification cron job (runs every 10 minutes)');

  // Run every 10 minutes: */10 * * * *
  cron.schedule('*/10 * * * *', async () => {
    console.log('\n⏰ Running class notification check:', format(new Date(), 'PPpp'));
    
    await process24HourReminders();
    await process1HourReminders();
    await process30MinuteAlerts();
    
    console.log('✅ Notification check complete\n');
  });

  // Also run immediately on startup for testing
  console.log('🔄 Running initial notification check...');
  setTimeout(async () => {
    await process24HourReminders();
    await process1HourReminders();
    await process30MinuteAlerts();
  }, 5000); // Wait 5 seconds after startup
}

// Export individual functions for manual triggering
export {
  process24HourReminders,
  process1HourReminders,
  process30MinuteAlerts
};
