/**
 * Student Course Controllers
 * Handle student-specific course operations
 */

import { Request, Response } from 'express';
import * as enrollmentService from '../services/enrollmentService';
import { supabase } from '../../../config/database';

/**
 * Get all published/approved courses for browsing
 */
export const getPublishedCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId; // Optional - to check enrollment status

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        category,
        price,
        enrollment_limit,
        teacher_id,
        teacher_name,
        course_image_url,
        level,
        created_at,
        learning_outcomes,
        skills_gained,
        estimated_hours,
        language,
        teacher_bio,
        teacher_title
      `)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching published courses:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }

    // Get student's enrolled course IDs if authenticated
    let enrolledCourseIds: string[] = [];
    if (userId) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', userId)
        .eq('status', 'active');
      
      enrolledCourseIds = (enrollments || []).map(e => e.course_id);
    }

    // Get enrollment counts and lesson counts, mark if student is enrolled
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course) => {
        // Get enrollment count
        const { count: enrollmentCount, error: enrollError } = await supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('status', 'active');

        if (enrollError) {
          console.error(`Error counting enrollments for ${course.id}:`, enrollError);
        }

        // Get lesson count
        const { count: lessonCount } = await supabase
          .from('course_lessons')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', course.id);

        console.log(`📊 Course "${course.title}": ${enrollmentCount} students, ${lessonCount} lessons`);

        return {
          ...course,
          enrolled_count: enrollmentCount || 0,
          total_students: enrollmentCount || 0,
          total_lessons: lessonCount || 0,
          is_enrolled: enrolledCourseIds.includes(course.id)
        };
      })
    );

    res.json({ success: true, courses: coursesWithCounts });
  } catch (error) {
    console.error('Error in getPublishedCourses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get detailed course information with prerequisites
 * OPTIMIZED: Parallelized queries to reduce response time
 */
export const getCourseDetails = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // PARALLEL BATCH 1: Fetch course, co-teachers, prerequisites, and enrollment data simultaneously
    const [courseResult, coTeachersResult, prerequisitesResult, enrollmentCountResult, userEnrollmentResult] = await Promise.all([
      // Course with weeks
      supabase
        .from('courses')
        .select(`
          *,
          weeks:course_weeks (
            id,
            week_number,
            title,
            description
          )
        `)
        .eq('id', courseId)
        .single(),
      
      // Co-teachers
      supabase
        .from('course_teachers')
        .select('teacher_id, role')
        .eq('course_id', courseId)
        .eq('role', 'co-teacher'),
      
      // Prerequisites
      supabase
        .from('course_prerequisites')
        .select('prerequisite_course_id')
        .eq('course_id', courseId),
      
      // Enrollment count
      supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'active'),
      
      // User enrollment check (only if authenticated)
      userId
        ? supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', userId)
            .eq('course_id', courseId)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const { data: course, error: courseError } = courseResult;
    if (courseError || !course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const { data: coTeachersRaw } = coTeachersResult;
    const { data: prerequisites } = prerequisitesResult;
    const { count: enrolledCount } = enrollmentCountResult;
    const isEnrolled = !!userEnrollmentResult.data;

    // PARALLEL BATCH 2: Fetch teacher profile and co-teacher profiles (now that we have IDs)
    const teacherProfilePromise = course.teacher_id
      ? (async () => {
          // Try by UUID id first, then by clerk_user_id
          const { data: byId } = await supabase
            .from('profiles')
            .select('id, clerk_user_id, full_name, email, bio, title')
            .eq('id', course.teacher_id)
            .maybeSingle();
          if (byId) return { data: byId };
          
          const { data: byClerk } = await supabase
            .from('profiles')
            .select('id, clerk_user_id, full_name, email, bio, title')
            .eq('clerk_user_id', course.teacher_id)
            .maybeSingle();
          return { data: byClerk };
        })()
      : Promise.resolve({ data: null });

    const coTeacherIds = (coTeachersRaw || []).map((ct: any) => ct.teacher_id).filter(Boolean);
    const coTeacherProfilesPromise = coTeacherIds.length > 0
      ? Promise.all([
          supabase.from('profiles').select('id, full_name, email, clerk_user_id').in('id', coTeacherIds),
          supabase.from('profiles').select('id, full_name, email, clerk_user_id').in('clerk_user_id', coTeacherIds)
        ])
      : Promise.resolve([{ data: [] }, { data: [] }]);

    const prereqIds = (prerequisites || []).map((p: any) => p.prerequisite_course_id);
    const prereqCoursesPromise = prereqIds.length > 0
      ? supabase.from('courses').select('id, title, description').in('id', prereqIds)
      : Promise.resolve({ data: [] });

    const [teacherProfileResult, coTeacherProfilesResults, prereqCoursesResult] = await Promise.all([
      teacherProfilePromise,
      coTeacherProfilesPromise,
      prereqCoursesPromise
    ]);

    // Process teacher profile
    let teacherProfile = teacherProfileResult.data;
    if (teacherProfile) {
      course.teacher_bio = course.teacher_bio || (teacherProfile as any).bio;
      course.teacher_title = course.teacher_title || (teacherProfile as any).title;
    }

    // Process co-teacher profiles
    let coTeachers: any[] = [];
    if (coTeacherIds.length > 0) {
      const [profilesByIdResult, profilesByClerkResult] = coTeacherProfilesResults;
      const mergedProfiles = [...(profilesByIdResult.data || []), ...(profilesByClerkResult.data || [])];
      const profileMap = new Map(mergedProfiles.map((p: any) => [p.id, p]));
      const profileByClerk = new Map(mergedProfiles.map((p: any) => [p.clerk_user_id, p]));

      coTeachers = (coTeachersRaw || []).map((ct: any) => {
        const profile = profileMap.get(ct.teacher_id) || profileByClerk.get(ct.teacher_id);
        return {
          id: profile?.id || ct.teacher_id,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          role: ct.role
        };
      });
    }

    res.json({
      success: true,
      course: {
        ...course,
        teacher: teacherProfile,
        teacher_name: teacherProfile?.full_name || null,
        co_teachers: coTeachers,
        enrolled_count: enrolledCount || 0,
        prerequisites: prereqCoursesResult.data || [],
        is_enrolled: isEnrolled
      }
    });
  } catch (error) {
    console.error('Error in getCourseDetails:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Check student eligibility for course enrollment
 */
export const checkCourseEligibility = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const eligibility = await enrollmentService.checkEligibility(userId, courseId);

    res.json({ success: true, eligibility });
  } catch (error: any) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * Get student's enrolled courses
 */
export const getMyEnrolledCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const courses = await enrollmentService.getEnrolledCourses(userId);

    res.json({ success: true, courses });
  } catch (error: any) {
    console.error('Error getting enrolled courses:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * Get course modules/weeks with lessons
 */
export const getCourseModules = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify user is enrolled in the course
    // NOTE: student_id stores clerk_user_id (TEXT), NOT profiles.id (UUID)
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    // Get course weeks with lessons (only published weeks for students)
    // Note: Supabase auto-generates relationship name from foreign key
    // course_lessons has week_id FK, so relationship is just "course_lessons"
    const { data: weeks, error } = await supabase
      .from('course_weeks')
      .select(`
        id,
        week_number,
        title,
        description,
        order_index,
        is_published,
        course_lessons (
          id,
          title,
          description,
          content_type,
          content_url,
          content_url_en,
          content_url_ta,
          content_url_ar,
          video_urls,
          video_duration_minutes,
          order_index,
          is_preview,
          is_published,
          deadline
        )
      `)
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching course modules:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch course modules',
        error: error.message 
      });
    }

    // Transform to include lessons array with correct property name
    // Also fetch completion status from lesson_progress, quiz_submissions, and assignment_submissions
    const allLessonIds = (weeks || []).flatMap(w => (w.course_lessons || []).map((l: any) => l.id));

    // Fetch completed lessons from lesson_progress
    let completedLessonIds = new Set<string>();
    if (allLessonIds.length > 0) {
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', userId)
        .eq('is_completed', true)
        .in('lesson_id', allLessonIds);
      if (progress) {
        progress.forEach((p: any) => completedLessonIds.add(p.lesson_id));
      }

      // Also check quiz_submissions (submitted = completed for quiz)
      const { data: quizSubs } = await supabase
        .from('quiz_submissions')
        .select('lesson_id')
        .eq('student_id', userId)
        .in('lesson_id', allLessonIds);
      if (quizSubs) {
        quizSubs.forEach((s: any) => completedLessonIds.add(s.lesson_id));
      }

      // Also check assignment_submissions (submitted = completed for assignment)
      const { data: assignSubs } = await supabase
        .from('assignment_submissions')
        .select('lesson_id')
        .eq('student_id', userId)
        .in('lesson_id', allLessonIds);
      if (assignSubs) {
        assignSubs.forEach((s: any) => completedLessonIds.add(s.lesson_id));
      }
    }

    const modulesWithSortedLessons = (weeks || []).map(week => {
      const lessons = (week.course_lessons || []).sort((a: any, b: any) => a.order_index - b.order_index)
        .map((lesson: any) => ({
          ...lesson,
          completed: completedLessonIds.has(lesson.id)
        }));
      return {
        ...week,
        lessons, // Rename course_lessons to lessons for frontend
        course_lessons: undefined // Remove original property
      };
    });

    res.json({ success: true, data: modulesWithSortedLessons });
  } catch (error) {
    console.error('Error in getCourseModules:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get enrollment details for a specific course
 */
export const getEnrollmentForCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get enrollment with course details
    // NOTE: student_id stores clerk_user_id (TEXT), NOT profiles.id (UUID)
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        last_accessed,
        progress_percentage,
        completed,
        status,
        course_id
      `)
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrollError) {
      console.error('Error fetching enrollment:', enrollError);
      return res.status(500).json({ success: false, message: 'Failed to fetch enrollment' });
    }

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Not enrolled in this course' });
    }

    res.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        course_id: enrollment.course_id,
        progress: enrollment.progress_percentage || 0,
        completed: enrollment.completed || false,
        last_accessed: enrollment.last_accessed,
        status: enrollment.status || 'active'
      }
    });
  } catch (error: any) {
    console.error('Error in getEnrollmentForCourse:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

