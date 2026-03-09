import { Router, Request, Response } from 'express';
import { 
  send24HourReminder, 
  send1HourReminder, 
  send30MinuteAlert,
  sendWeeklyDigest 
} from '../services/emailNotifications';
import { query } from '../config/database';

const router = Router();

/**
 * POST /api/notifications/class-reminder
 * Send class reminder emails to enrolled students
 */
router.post('/class-reminder', async (req: Request, res: Response) => {
  try {
    const { classData, students, hoursBeforeClass = 24 } = req.body;

    if (!classData || !students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: classData and students array'
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Send emails to all students
    for (const student of students) {
      try {
        await send24HourReminder(classData, student);
        results.sent++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed for ${student.studentEmail}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${results.sent} reminders, ${results.failed} failed`,
      results
    });
  } catch (error: any) {
    console.error('Error sending class reminders:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/class-starting-soon
 * Send urgent "class starting soon" alerts
 */
router.post('/class-starting-soon', async (req: Request, res: Response) => {
  try {
    const { classData, students, minutesBeforeClass = 30 } = req.body;

    if (!classData || !students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: classData and students array'
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Determine which function to use based on time
    const sendFunction = minutesBeforeClass === 30 ? send30MinuteAlert : send1HourReminder;

    for (const student of students) {
      try {
        await sendFunction(classData, student);
        results.sent++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed for ${student.studentEmail}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${results.sent} alerts, ${results.failed} failed`,
      results
    });
  } catch (error: any) {
    console.error('Error sending class starting alerts:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/weekly-digest
 * Send weekly schedule digest to students
 */
router.post('/weekly-digest', async (req: Request, res: Response) => {
  try {
    const { courseId, courseName, weekNumber, classes, students } = req.body;

    if (!courseId || !courseName || !weekNumber || !classes || !students) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: courseId, courseName, weekNumber, classes, students'
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    const digestData = {
      courseId,
      courseName,
      weekNumber,
      classes
    };

    for (const student of students) {
      try {
        await sendWeeklyDigest(digestData, student);
        results.sent++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed for ${student.studentEmail}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${results.sent} weekly digests, ${results.failed} failed`,
      results
    });
  } catch (error: any) {
    console.error('Error sending weekly digests:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/courses/:courseId/enrolled-students
 * Get list of enrolled students with email addresses
 */
router.get('/courses/:courseId/enrolled-students', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    // Query to get enrolled students
    const queryText = `
      SELECT 
        s.id,
        s.email as "studentEmail",
        s.name as "studentName",
        ce.enrolled_at,
        ce.status
      FROM students s
      INNER JOIN course_enrollments ce ON ce.student_id = s.id
      WHERE ce.course_id = $1
        AND ce.status = 'active'
      ORDER BY s.name ASC
    `;

    const result = await query(queryText, [courseId]);

    return res.status(200).json({
      success: true,
      students: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching enrolled students:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/test
 * Test email configuration by sending a test email
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const testClassData = {
      className: 'Test Class - Introduction to Quran',
      courseName: 'Islamic Studies 101',
      classDate: 'Tomorrow, January 15, 2024',
      classTime: '10:00 AM',
      duration: 60,
      teacherName: 'Sheikh Ahmad',
      meetingUrl: 'https://meet.google.com/test-link'
    };

    const testStudent = {
      studentName: 'Test Student',
      studentEmail: email
    };

    await send24HourReminder(testClassData, testStudent);

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${email}`
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
