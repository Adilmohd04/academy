// Email Notification Service for Live Classes
// This service sends email notifications to enrolled students before classes start

interface ClassNotificationData {
  courseId: string;
  courseName: string;
  classId: string;
  className: string;
  classDate: string;
  classTime: string;
  duration: number;
  meetingUrl?: string;
  teacherName: string;
}

interface StudentNotification {
  studentId: string;
  studentEmail: string;
  studentName: string;
}

/**
 * Send email notification to students before class starts
 * @param classData - Information about the class
 * @param students - List of enrolled students
 * @param hoursBeforeClass - How many hours before class to send notification (default: 24)
 */
export async function sendClassReminderEmails(
  classData: ClassNotificationData,
  students: StudentNotification[],
  hoursBeforeClass: number = 24
): Promise<void> {
  try {
    // Call backend API to send emails
    const response = await fetch('/api/notifications/class-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        classData,
        students,
        hoursBeforeClass,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send class reminder emails');
    }

    console.log(`✅ Class reminder emails sent to ${students.length} students`);
  } catch (error) {
    console.error('❌ Error sending class reminder emails:', error);
    throw error;
  }
}

/**
 * Send immediate notification about class starting soon (30 minutes before)
 */
export async function sendClassStartingSoonEmail(
  classData: ClassNotificationData,
  students: StudentNotification[]
): Promise<void> {
  try {
    const response = await fetch('/api/notifications/class-starting-soon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        classData,
        students,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send class starting soon emails');
    }

    console.log(`✅ "Class starting soon" emails sent to ${students.length} students`);
  } catch (error) {
    console.error('❌ Error sending class starting soon emails:', error);
    throw error;
  }
}

/**
 * Send weekly schedule digest to all enrolled students
 */
export async function sendWeeklyScheduleDigest(
  courseId: string,
  courseName: string,
  weekNumber: number,
  classes: ClassNotificationData[],
  students: StudentNotification[]
): Promise<void> {
  try {
    const response = await fetch('/api/notifications/weekly-digest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseId,
        courseName,
        weekNumber,
        classes,
        students,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send weekly digest');
    }

    console.log(`✅ Weekly digest sent to ${students.length} students`);
  } catch (error) {
    console.error('❌ Error sending weekly digest:', error);
    throw error;
  }
}

/**
 * Helper function to get enrolled students for a course
 */
export async function getEnrolledStudents(courseId: string): Promise<StudentNotification[]> {
  try {
    const response = await fetch(`/api/courses/${courseId}/enrolled-students`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch enrolled students');
    }

    const students = await response.json();
    return students.map((s: any) => ({
      studentId: s.id,
      studentEmail: s.email,
      studentName: s.name,
    }));
  } catch (error) {
    console.error('❌ Error fetching enrolled students:', error);
    return [];
  }
}

/**
 * Schedule notification for a new class
 * This should be called when a teacher creates/schedules a new class
 */
export async function scheduleClassNotifications(
  classData: ClassNotificationData
): Promise<void> {
  try {
    // Get enrolled students
    const students = await getEnrolledStudents(classData.courseId);

    if (students.length === 0) {
      console.log('⚠️ No enrolled students found for this course');
      return;
    }

    // Schedule notification 24 hours before class
    await sendClassReminderEmails(classData, students, 24);

    // Schedule notification 1 hour before class (handled by backend cron job)
    // The backend will check for classes starting in 1 hour and send notifications

    console.log(`✅ Scheduled notifications for class: ${classData.className}`);
  } catch (error) {
    console.error('❌ Error scheduling class notifications:', error);
    throw error;
  }
}

// Export types for use in other files
export type { ClassNotificationData, StudentNotification };
