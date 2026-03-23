import express from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as courseEnrollmentController from '../modules/teacher/controllers/courseEnrollmentController';
import * as quizManagementController from '../modules/teacher/controllers/quizManagementController';
import * as assignmentManagementController from '../modules/teacher/controllers/assignmentManagementController';
import { supabase } from '../config/database';
import * as emailService from '../modules/shared/services/emailService';
import * as courseNotifications from '../services/courseNotificationService';

const router = express.Router();

// ============================================
// STUDENT ENROLLMENT ROUTES
// ============================================

// Get student's enrolled courses
router.get('/enrollments/my-courses', requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;

    // Get enrollments with course details using clerk_user_id directly
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        last_accessed,
        progress_percentage,
        completed,
        status,
        courses!inner (
          id,
          title,
          description,
          course_image_url,
          teacher_id
        )
      `)
      .eq('student_id', userId)
      .order('enrolled_at', { ascending: false });

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return res.status(500).json({ error: 'Failed to fetch enrolled courses' });
    }

    // Get teacher names for all courses
    const teacherIds = [...new Set((enrollments || []).map((e: any) => e.courses.teacher_id).filter(Boolean))];
    const { data: teachers } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', teacherIds);

    const teacherMap = new Map((teachers || []).map((t: any) => [t.id, t.full_name || t.email || 'Instructor']));

    const courses = (enrollments || []).map((e: any) => ({
      id: e.courses.id,
      title: e.courses.title,
      description: e.courses.description,
      course_image_url: e.courses.course_image_url,
      teacher_name: teacherMap.get(e.courses.teacher_id) || 'Instructor',
      progress: e.progress_percentage || 0,
      completed: e.completed || false,
      last_accessed: e.last_accessed,
      status: e.status || 'active'
    }));

    res.json({ courses });
  } catch (error: any) {
    console.error('Error in my-courses endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enroll in a free course
router.post('/enrollments/enroll', requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    const { course_id, fullName, email, mobileNumber } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Get or create student profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      // Create profile if doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: userId,
          full_name: fullName || email?.split('@')[0] || 'Student',
          email: email || '',
          role: 'student',
          created_at: new Date().toISOString()
        })
        .select('id, full_name, email')
        .single();

      if (createError || !newProfile) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({ error: 'Failed to create student profile' });
      }

      profile = newProfile;
    }

    // Check if course is free
    const { data: course } = await supabase
      .from('courses')
      .select('is_free, price, title, prerequisite_courses')
      .eq('id', course_id)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!course.is_free) {
      return res.status(400).json({ error: 'This course requires payment' });
    }

    // Check prerequisite courses if any
    if (course.prerequisite_courses && Array.isArray(course.prerequisite_courses) && course.prerequisite_courses.length > 0) {
      const { data: completedEnrollments } = await supabase
        .from('enrollments')
        .select('course_id, completed, courses(title)')
        .eq('student_id', profile.id)
        .in('course_id', course.prerequisite_courses);

      const completedCourseIds = (completedEnrollments || [])
        .filter((e: any) => e.completed)
        .map((e: any) => e.course_id);

      const missingPrerequisites = course.prerequisite_courses.filter(
        (prereqId: string) => !completedCourseIds.includes(prereqId)
      );

      if (missingPrerequisites.length > 0) {
        // Get missing course titles
        const { data: missingCourses } = await supabase
          .from('courses')
          .select('title')
          .in('id', missingPrerequisites);

        const missingTitles = (missingCourses || []).map((c: any) => c.title).join(', ');
        
        return res.status(403).json({ 
          error: 'Prerequisites not met',
          message: `You must complete the following course(s) before enrolling: ${missingTitles}`,
          missing_prerequisites: missingTitles
        });
      }
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', profile.id)
      .eq('course_id', course_id)
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Check available slots
    const { data: courseData } = await supabase
      .from('courses')
      .select('available_slots, max_students')
      .eq('id', course_id)
      .single();

    if (courseData && courseData.available_slots !== null && courseData.available_slots <= 0) {
      return res.status(400).json({ error: 'No available slots for this course' });
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .insert({
        student_id: profile.id,
        course_id,
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (enrollError) {
      console.error('Error creating enrollment:', enrollError);
      return res.status(500).json({ error: 'Failed to create enrollment' });
    }

    // Reduce available slots by 1
    if (courseData && courseData.available_slots !== null && courseData.available_slots > 0) {
      await supabase
        .from('courses')
        .update({ available_slots: courseData.available_slots - 1 })
        .eq('id', course_id);
    }

    // Send enrollment confirmation email (enhanced notification)
    try {
      const studentEmail = email || profile.email;
      const studentName = fullName || profile.full_name || 'Student';
      
      if (studentEmail) {
        courseNotifications.notifyEnrollmentConfirmation(
          studentEmail,
          studentName,
          course.title,
          course_id
        );
        console.log(`✅ Enrollment confirmation email sent to ${studentEmail}`);
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send enrollment email:', emailError);
      // Don't fail the enrollment if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      enrollment
    });
  } catch (error: any) {
    console.error('Error in enroll endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TEACHER ENROLLMENT MANAGEMENT
// ============================================

// Get all enrollments for a course (teacher only)
router.get(
  '/courses/:courseId/enrollments',
  requireAuth,
  courseEnrollmentController.getCourseEnrollments
);

// Get specific student's details in a course
router.get(
  '/courses/:courseId/students/:studentId',
  requireAuth,
  courseEnrollmentController.getStudentDetails
);

// Quiz management routes
router.get(
  '/quizzes/:quizId/attempts/all',
  requireAuth,
  quizManagementController.getQuizAttempts
);

router.put(
  '/quiz-attempts/:attemptId/score',
  requireAuth,
  quizManagementController.updateQuizScore
);

// Assignment Management
router.get(
  '/assignments/:assignmentId/submissions',
  requireAuth,
  assignmentManagementController.getSubmissions
);

router.post(
  '/assignments/bulk-grade',
  requireAuth,
  assignmentManagementController.bulkGrade
);

router.get(
  '/assignments/:assignmentId/export',
  requireAuth,
  assignmentManagementController.exportGrades
);

export default router;
