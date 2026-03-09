import { Response, NextFunction } from 'express';
import { supabase } from '../config/database';

/**
 * Middleware to verify that a student is enrolled in a course
 * before allowing access to course content (lessons, quizzes, assignments, etc.)
 * 
 * Usage: Add to routes that require enrollment
 * Example: router.get('/quiz/:quizId', requireAuth, requireEnrollment, getQuiz)
 * 
 * Extracts courseId from:
 * 1. req.params.courseId
 * 2. req.query.courseId
 * 3. req.body.courseId
 * 4. Fetches from related entity (quiz, assignment, lesson)
 */
export const requireEnrollment = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    // Get student profile to get internal ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ 
        success: false,
        error: 'User profile not found' 
      });
    }

    // Teachers and admins bypass enrollment check
    if (profile.role === 'teacher' || profile.role === 'admin') {
      return next();
    }

    // Try to get courseId from various sources
    let courseId = req.params.courseId || req.query.courseId || req.body.courseId;

    // If courseId not directly provided, try to fetch from related entities
    if (!courseId) {
      courseId = await getCourseIdFromEntity(req);
    }

    if (!courseId) {
      return res.status(400).json({ 
        success: false,
        error: 'Course ID not found in request' 
      });
    }

    // Check if user is enrolled in the course
    // NOTE: enrollments.student_id stores clerk_user_id (TEXT), NOT profiles.id (UUID)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ 
        success: false,
        error: 'You must be enrolled in this course to access this content',
        message: 'Please enroll in the course first to access lessons, quizzes, and assignments.'
      });
    }

    // Check if enrollment is active
    if (enrollment.status === 'cancelled' || enrollment.status === 'expired') {
      return res.status(403).json({ 
        success: false,
        error: 'Your enrollment in this course is not active',
        message: 'Your enrollment has been cancelled or expired. Please contact support.'
      });
    }

    // Enrollment verified - add to request for downstream use
    req.enrollment = enrollment;
    req.courseId = courseId;
    
    next();
  } catch (error) {
    console.error('Enrollment check error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to verify enrollment' 
    });
  }
};

/**
 * Helper function to get courseId from related entities
 * (quiz, assignment, lesson, discussion)
 */
async function getCourseIdFromEntity(req: any): Promise<string | null> {
  try {
    // Try to get courseId from quiz
    if (req.params.quizId) {
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('course_id')
        .eq('id', req.params.quizId)
        .single();
      
      if (quiz?.course_id) return quiz.course_id;
    }

    // Try to get courseId from assignment
    if (req.params.assignmentId) {
      const { data: assignment } = await supabase
        .from('assignments')
        .select('course_id')
        .eq('id', req.params.assignmentId)
        .single();
      
      if (assignment?.course_id) return assignment.course_id;
    }

    // Try to get courseId from lesson
    if (req.params.lessonId) {
      const { data: lesson } = await supabase
        .from('course_lessons')
        .select('week:course_weeks!inner(course_id)')
        .eq('id', req.params.lessonId)
        .single();
      
      // TypeScript fix: Access the first element of the array
      const week = lesson?.week as any;
      if (Array.isArray(week) && week[0]?.course_id) {
        return week[0].course_id;
      } else if (week?.course_id) {
        return week.course_id;
      }
    }

    // Try to get courseId from discussion
    if (req.params.discussionId) {
      const { data: discussion } = await supabase
        .from('course_discussions')
        .select('course_id')
        .eq('id', req.params.discussionId)
        .single();
      
      if (discussion?.course_id) return discussion.course_id;
    }

    return null;
  } catch (error) {
    console.error('Error fetching courseId from entity:', error);
    return null;
  }
}

/**
 * Optional: Check if user can access a specific resource within a course
 * (e.g., check if content is locked based on drip schedule)
 */
export const checkContentAccess = async (req: any, res: Response, next: NextFunction) => {
  try {
    const courseId = req.courseId;
    const lessonId = req.params.lessonId;

    if (!courseId || !lessonId) {
      return next();
    }

    // Get course access settings
    const { data: accessSettings } = await supabase
      .from('course_access_settings')
      .select('drip_content, drip_schedule')
      .eq('course_id', courseId)
      .single();

    // If drip content is disabled, allow access
    if (!accessSettings?.drip_content) {
      return next();
    }

    // Check if lesson is unlocked based on drip schedule
    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('week:course_weeks!inner(unlock_date)')
      .eq('id', lessonId)
      .single();

    // TypeScript fix: Access the first element of the array
    const week = lesson?.week as any;
    const unlockDateValue = Array.isArray(week) ? week[0]?.unlock_date : week?.unlock_date;

    if (unlockDateValue) {
      const unlockDate = new Date(unlockDateValue);
      const now = new Date();

      if (now < unlockDate) {
        return res.status(403).json({ 
          success: false,
          error: 'Content not yet available',
          message: `This content will be unlocked on ${unlockDate.toLocaleDateString()}`,
          unlockDate: unlockDateValue
        });
      }
    }

    next();
  } catch (error) {
    console.error('Content access check error:', error);
    // Don't block access if check fails, just log error
    next();
  }
};
