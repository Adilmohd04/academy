import express, { NextFunction, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import * as studentTrackingController from '../modules/shared/controllers/studentTrackingController';

const router = express.Router();

const studentAuth = [requireAuth, requireRole(['student'])];
const teacherAuth = [requireAuth, requireRole(['teacher', 'admin'])];
const adminAuth = [requireAuth, requireRole(['admin'])];

/**
 * Tracking data includes student names, email addresses, grades and activity.
 * Role middleware alone is not enough: teachers must also be tied to the
 * requested course. Courses in this project may use either a Clerk id or the
 * legacy profile UUID as their teacher_id, so support both representations.
 */
const canAccessCourseAsStaff = async (req: Request, courseId: string): Promise<boolean> => {
  const userId = req.auth?.userId;
  if (!userId) {
    return false;
  }

  if (req.auth?.role === 'admin') {
    return true;
  }

  const [{ data: course, error: courseError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, teacher_id')
      .eq('id', courseId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle(),
  ]);

  if (courseError || !course) {
    return false;
  }

  if (course.teacher_id === userId || (profile?.id && course.teacher_id === profile.id)) {
    return true;
  }

  // The codebase contains both historical co-teacher table names. Check both
  // and fail closed if neither grants access.
  const teacherIdentifiers = [userId, profile?.id].filter((value): value is string => Boolean(value));
  if (teacherIdentifiers.length === 0 || profileError) {
    return false;
  }

  const checks = await Promise.all([
    ...teacherIdentifiers.map((teacherId) =>
      supabase
        .from('course_teachers')
        .select('id')
        .eq('course_id', courseId)
        .eq('teacher_id', teacherId)
        .maybeSingle()
    ),
    ...teacherIdentifiers.map((teacherId) =>
      supabase
        .from('course_co_teachers')
        .select('id')
        .eq('course_id', courseId)
        .eq('teacher_id', teacherId)
        .maybeSingle()
    ),
  ]);

  return checks.some(({ data }) => Boolean(data));
};

const requireTeacherCourseAccess = async (req: Request, res: Response, next: NextFunction) => {
  const courseId = req.params.courseId;
  if (!courseId) {
    res.status(400).json({ success: false, message: 'Course ID is required' });
    return;
  }

  try {
    const allowed = await canAccessCourseAsStaff(req, courseId);
    if (!allowed) {
      res.status(403).json({ success: false, message: 'You do not have access to this course' });
      return;
    }

    next();
  } catch (error) {
    console.error('[studentTracking] Course access check failed:', error);
    res.status(500).json({ success: false, message: 'Unable to verify course access' });
  }
};

const requireExistingCourse = async (req: Request, res: Response, next: NextFunction) => {
  const courseId = req.params.courseId;
  if (!courseId) {
    res.status(400).json({ success: false, message: 'Course ID is required' });
    return;
  }

  try {
    const { data: course, error } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    next();
  } catch (error) {
    console.error('[studentTracking] Course lookup failed:', error);
    res.status(500).json({ success: false, message: 'Unable to verify course' });
  }
};

const hasActiveEnrollment = async (studentId: string, courseId: string): Promise<boolean> => {
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Completed learners retain access to their historical course progress;
  // pending, cancelled and removed learners do not.
  return Boolean(enrollment && ['active', 'completed'].includes(String(enrollment.status).toLowerCase()));
};

const requireStudentCourseEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.auth?.userId;
  const courseId = req.params.courseId;
  if (!userId || !courseId) {
    res.status(401).json({ success: false, message: 'Authentication and course ID are required' });
    return;
  }

  try {
    if (!(await hasActiveEnrollment(userId, courseId))) {
      res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
      return;
    }

    next();
  } catch (error) {
    console.error('[studentTracking] Enrollment check failed:', error);
    res.status(500).json({ success: false, message: 'Unable to verify enrollment' });
  }
};

const requireTrackedStudentEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  const { courseId, studentId } = req.params;
  if (!courseId || !studentId) {
    res.status(400).json({ success: false, message: 'Course ID and student ID are required' });
    return;
  }

  try {
    if (!(await hasActiveEnrollment(studentId, courseId))) {
      // Do not expose a tracking record for a student who is not in this
      // course, even to staff who own a different course.
      res.status(404).json({ success: false, message: 'Student enrollment not found' });
      return;
    }

    next();
  } catch (error) {
    console.error('[studentTracking] Student enrollment lookup failed:', error);
    res.status(500).json({ success: false, message: 'Unable to verify student enrollment' });
  }
};

const requireCourseResource = (table: 'quizzes' | 'assignments', idParam: 'quizId' | 'assignmentId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const courseId = req.params.courseId;
    const resourceId = req.params[idParam];
    if (!courseId || !resourceId) {
      res.status(400).json({ success: false, message: 'Course and resource IDs are required' });
      return;
    }

    try {
      const { data: resource, error } = await supabase
        .from(table)
        .select('id, course_id')
        .eq('id', resourceId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!resource || resource.course_id !== courseId) {
        // A resource from another course must not be submitted against this
        // course (and revealing its existence is unnecessary).
        res.status(404).json({ success: false, message: 'Course resource not found' });
        return;
      }

      next();
    } catch (error) {
      console.error('[studentTracking] Course resource lookup failed:', error);
      res.status(500).json({ success: false, message: 'Unable to verify course resource' });
    }
  };
};

const resolveSubmissionCourseId = async (submissionId: string): Promise<string | null> => {
  const { data: submission, error: submissionError } = await supabase
    .from('assignment_submissions')
    .select('course_id, assignment_id, lesson_id')
    .eq('id', submissionId)
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }
  if (!submission) {
    return null;
  }

  if (submission.course_id) {
    return submission.course_id;
  }

  if (submission.assignment_id) {
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('course_id')
      .eq('id', submission.assignment_id)
      .maybeSingle();
    if (assignmentError) {
      throw assignmentError;
    }
    if (assignment?.course_id) {
      return assignment.course_id;
    }
  }

  if (submission.lesson_id) {
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('course_weeks(course_id)')
      .eq('id', submission.lesson_id)
      .maybeSingle();
    if (lessonError) {
      throw lessonError;
    }

    const week = Array.isArray((lesson as any)?.course_weeks)
      ? (lesson as any).course_weeks[0]
      : (lesson as any)?.course_weeks;
    if (week?.course_id) {
      return week.course_id;
    }
  }

  return null;
};

const requireSubmissionCourseAccess = async (req: Request, res: Response, next: NextFunction) => {
  const submissionId = req.params.submissionId;
  if (!submissionId) {
    res.status(400).json({ success: false, message: 'Submission ID is required' });
    return;
  }

  try {
    const courseId = await resolveSubmissionCourseId(submissionId);
    if (!courseId) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    if (!(await canAccessCourseAsStaff(req, courseId))) {
      res.status(403).json({ success: false, message: 'You do not have access to this submission' });
      return;
    }

    next();
  } catch (error) {
    console.error('[studentTracking] Submission access check failed:', error);
    res.status(500).json({ success: false, message: 'Unable to verify submission access' });
  }
};

// ============================================
// STUDENT ROUTES - own tracking data only
// ============================================

router.get(
  '/student/courses/:courseId/tracking',
  ...studentAuth,
  requireStudentCourseEnrollment,
  studentTrackingController.getMyTrackingData
);

router.post(
  '/student/courses/:courseId/quizzes/:quizId/submit',
  ...studentAuth,
  requireStudentCourseEnrollment,
  requireCourseResource('quizzes', 'quizId'),
  studentTrackingController.submitQuiz
);

router.post(
  '/student/courses/:courseId/assignments/:assignmentId/submit',
  ...studentAuth,
  requireStudentCourseEnrollment,
  requireCourseResource('assignments', 'assignmentId'),
  studentTrackingController.submitAssignment
);

router.post(
  '/student/courses/:courseId/activity',
  ...studentAuth,
  requireStudentCourseEnrollment,
  studentTrackingController.logStudentActivity
);

// ============================================
// TEACHER ROUTES - only their courses (admins are allowed globally)
// ============================================

router.get(
  '/teacher/courses/:courseId/students/tracking',
  ...teacherAuth,
  requireTeacherCourseAccess,
  studentTrackingController.getCourseStudentsTracking
);

router.get(
  '/teacher/courses/:courseId/students/:studentId/tracking',
  ...teacherAuth,
  requireTeacherCourseAccess,
  requireTrackedStudentEnrollment,
  studentTrackingController.getStudentTrackingData
);

router.get(
  '/teacher/courses/:courseId/performance',
  ...teacherAuth,
  requireTeacherCourseAccess,
  studentTrackingController.getStudentPerformance
);

router.put(
  '/teacher/assignments/submissions/:submissionId/grade',
  ...teacherAuth,
  requireSubmissionCourseAccess,
  studentTrackingController.gradeAssignment
);

// Compatibility route used by the existing frontend. It has the same guard.
router.post(
  '/submissions/:submissionId/grade',
  ...teacherAuth,
  requireSubmissionCourseAccess,
  studentTrackingController.gradeAssignment
);

router.post(
  '/teacher/courses/:courseId/students/:studentId/update-progress',
  ...teacherAuth,
  requireTeacherCourseAccess,
  requireTrackedStudentEnrollment,
  studentTrackingController.updateStudentProgress
);

router.post(
  '/teacher/courses/:courseId/recalculate-quiz-scores',
  ...teacherAuth,
  requireTeacherCourseAccess,
  studentTrackingController.recalculateQuizScores
);

// ============================================
// ADMIN ROUTES - platform-wide oversight only
// ============================================

router.get(
  '/admin/courses/:courseId/performance',
  ...adminAuth,
  requireExistingCourse,
  studentTrackingController.getStudentPerformance
);

router.get(
  '/admin/courses/:courseId/students/tracking',
  ...adminAuth,
  requireExistingCourse,
  studentTrackingController.getCourseStudentsTracking
);

export default router;
