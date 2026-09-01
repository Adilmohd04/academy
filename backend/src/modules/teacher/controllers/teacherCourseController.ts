import { Request, Response } from 'express';
import { supabase } from '../../../config/database';
import { normalizeMentoringText } from '../../../services/mentoringNormalization';
import * as courseNotifications from '../../../services/courseNotificationService';

/**
 * Teacher Course Management Controller
 * Handles course creation, editing, and content management
 */

// Helper function to safely extract teacher_id from Supabase join result
const getCourseTeacherId = (courses: any): string | null => {
  if (!courses) return null;
  // Supabase returns courses as array even with inner join
  if (Array.isArray(courses)) {
    return courses[0]?.teacher_id || null;
  }
  return courses.teacher_id || null;
};

const isOwnedByTeacher = (
  teacherId: string | null,
  profileId: string | null | undefined,
  clerkUserId: string | null | undefined
): boolean => {
  return !!teacherId && (teacherId === profileId || teacherId === clerkUserId);
};

// ============================================
// COURSE CRUD OPERATIONS
// ============================================

/**
 * Get all courses for the logged-in teacher (including co-taught courses)
 * GET /api/teacher/courses
 */
export const getMyCourses = async (req: any, res: Response) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // First get the teacher's profile to find their profile.id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    // teacher_id in courses table may store EITHER profile.id (UUID) or clerk_user_id (TEXT)
    // We need to query for both to handle all cases
    const teacherIds = [userId]; // Always search by clerk_user_id
    if (profile && !profileError && profile.id) {
      teacherIds.push(profile.id); // Also search by profile UUID
    }

    // Get courses where teacher is the main teacher (by either ID format)
    const { data: mainCourses, error: mainError } = await supabase
      .from('courses')
      .select(`
        *,
        enrollments(count),
        course_weeks(count),
        live_sessions(count)
      `)
      .in('teacher_id', teacherIds)
      .order('created_at', { ascending: false });

    if (mainError) {
      console.error('Error fetching main courses:', mainError);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }

    // Mark main courses with role
    const mainCoursesWithRole = (mainCourses || []).map(course => ({
      ...course,
      user_role: 'main_teacher'
    }));

    // Get co-teacher courses (course_teachers table uses profile.id)
    let coTeacherCourses: any[] = [];
    if (profile && !profileError) {
      const { data: coTeacherRelations, error: coError } = await supabase
        .from('course_teachers')
        .select(`
          course_id,
          courses (
            *,
            enrollments(count),
            course_weeks(count),
            live_sessions(count)
          )
        `)
        .eq('teacher_id', profile.id);

      if (!coError && coTeacherRelations) {
        // Get course IDs already in main courses to avoid duplicates
        const mainCourseIds = new Set((mainCourses || []).map(c => c.id));
        
        coTeacherCourses = coTeacherRelations
          .map(relation => relation.courses)
          .filter(course => course !== null && !mainCourseIds.has((course as any).id))
          .map(course => ({
            ...course,
            user_role: 'co_teacher'
          }));
      } else if (coError) {
        console.error('Error fetching co-teacher courses:', coError);
      }
    }

    // Combine both arrays
    const allCourses = [...mainCoursesWithRole, ...coTeacherCourses];

    // Map _count.enrollments to student_count for frontend compatibility
    const coursesWithStudentCount = allCourses.map(course => ({
      ...course,
      student_count: course._count?.enrollments || course.enrollments?.[0]?.count || 0
    }));

    res.json({ courses: coursesWithStudentCount });
  } catch (error: any) {
    console.error('Error in getMyCourses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get single course details with full content structure
 * GET /api/teacher/courses/:courseId
 */
export const getCourseDetails = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;
    const role = req.auth?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Resolve both canonical identities. Courses created through the current
    // `/api/courses` flow store the Clerk id, while older courses store the
    // profile UUID.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (profileError || (!profile && role !== 'admin')) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Load the course first, then grant access to the owner, a co-teacher, or
    // an administrator. Filtering the initial query by profile.id locked a
    // teacher out of every newly-created (Clerk-id keyed) course.
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isOwner = course.teacher_id === userId || course.teacher_id === profile?.id;
    let isCoTeacher = false;
    if (!isOwner && role !== 'admin' && profile?.id) {
      const { data: coTeacher } = await supabase
        .from('course_teachers')
        .select('id')
        .eq('course_id', courseId)
        .in('teacher_id', [profile.id, userId])
        .limit(1)
        .maybeSingle();
      isCoTeacher = Boolean(coTeacher);
    }

    if (role !== 'admin' && !isOwner && !isCoTeacher) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [ownerByProfileId, ownerByClerkId] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', course.teacher_id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('clerk_user_id', course.teacher_id)
        .maybeSingle(),
    ]);
    const courseOwner = ownerByProfileId.data || ownerByClerkId.data || profile;

    // Get weeks with lessons, live sessions, co-teachers, and teacher profile in parallel
    const [weeksResult, sessionsResult, gradingResult, accessResult, coTeachersResult] = await Promise.all([
      supabase
        .from('course_weeks')
        .select(`*, course_lessons(*)`)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }),
      supabase
        .from('live_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('course_grading_policies')
        .select('*')
        .eq('course_id', courseId)
        .single(),
      supabase
        .from('course_access_settings')
        .select('*')
        .eq('course_id', courseId)
        .single(),
      supabase
        .from('course_teachers')
        .select('teacher_id, role')
        .eq('course_id', courseId)
        .eq('role', 'co-teacher')
    ]);

    // Get co-teacher profiles
    let coTeachers: any[] = [];
    const coTeacherIds = (coTeachersResult.data || []).map((ct: any) => ct.teacher_id).filter(Boolean);
    if (coTeacherIds.length > 0) {
      const [byId, byClerk] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, clerk_user_id').in('id', coTeacherIds),
        supabase.from('profiles').select('id, full_name, email, clerk_user_id').in('clerk_user_id', coTeacherIds)
      ]);
      const allProfiles = [...(byId.data || []), ...(byClerk.data || [])];
      const profileMap = new Map(allProfiles.map((p: any) => [p.id, p]));
      const profileByClerk = new Map(allProfiles.map((p: any) => [p.clerk_user_id, p]));
      
      coTeachers = (coTeachersResult.data || []).map((ct: any) => {
        const p = profileMap.get(ct.teacher_id) || profileByClerk.get(ct.teacher_id);
        return {
          id: p?.id || ct.teacher_id,
          name: p?.full_name || null,
          full_name: p?.full_name || null,
          email: p?.email || null,
          role: ct.role
        };
      });
    }

    res.json({
      course: {
        ...course,
        teacher: courseOwner
          ? { id: courseOwner.id, full_name: courseOwner.full_name, email: courseOwner.email }
          : null,
        teacher_name: courseOwner?.full_name || courseOwner?.email || 'Instructor',
        co_teachers: coTeachers
      },
      weeks: weeksResult.data || [],
      sessions: sessionsResult.data || [],
      grading_policy: gradingResult.data,
      access_settings: accessResult.data
    });
  } catch (error: any) {
    console.error('Error in getCourseDetails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new course
 * POST /api/teacher/courses
 */
export const createCourse = async (req: any, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const {
      title,
      description,
      course_type,
      duration_weeks,
      level,
      category,
      price,
      course_image_url,
      enrollment_limit,
      starts_at,
      ends_at
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Create course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        teacher_id: profile.id,
        title,
        description,
        course_type: course_type || 'pre-recorded',
        duration_weeks: duration_weeks || 8,
        level: level || 'beginner',
        category,
        price: price || 0,
        course_image_url,
        enrollment_limit,
        status: 'draft',
        starts_at,
        ends_at
      })
      .select()
      .single();

    if (courseError) {
      console.error('Error creating course:', courseError);
      return res.status(500).json({ error: 'Failed to create course' });
    }

    // Create default grading policy
    await supabase
      .from('course_grading_policies')
      .insert({
        course_id: course.id,
        assignments_weight: 20,
        quizzes_weight: 30,
        midterm_weight: 15,
        final_exam_weight: 25,
        attendance_weight: 10,
        passing_grade: 60
      });

    // Create default access settings
    await supabase
      .from('course_access_settings')
      .insert({
        course_id: course.id,
        is_public: true,
        requires_approval: false,
        allow_guest_preview: true,
        drip_content: false
      });

    res.status(201).json({ course });
  } catch (error: any) {
    console.error('Error in createCourse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update course details
 * PUT /api/teacher/courses/:courseId
 */
export const updateCourse = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;
    const updateData = req.body;

    // AI normalization: If mentoring_text is being updated, normalize it
    if (updateData.mentoring_text && updateData.mentoring_text.trim().length > 0) {
      try {
        const structured = await normalizeMentoringText(updateData.mentoring_text);
        if (structured && Object.keys(structured).length > 0) {
          updateData.mentoring_structured = structured;
        }
      } catch (normError) {
        console.warn('Mentoring normalization failed, continuing without structured data:', normError);
        // Continue without structured data - not critical
      }
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (!course || course.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow known database columns to prevent "column does not exist" errors
    const allowedDbColumns = [
      'title', 'description', 'short_description', 'long_description',
      'teacher_id', 'price', 'is_free', 'thumbnail_url', 'course_image_url',
      'thumbnail_image', 'duration_weeks', 'status', 'approval_status',
      'is_live', 'category', 'level', 'prerequisites', 'prerequisite_courses',
      'enrollment_cap', 'passing_threshold', 'syllabus',
      'tags', 'learning_outcomes', 'skills_gained', 'teacher_title',
      'teacher_bio', 'estimated_hours', 'language', 'starts_at',
      'course_type', 'instructors', 'course_languages',
      'mentoring_text', 'mentoring_structured', 'schedule_frequency',
      'schedule_timezone', 'enrollment_deadline', 'course_format_description',
      'grading_weights', 'passing_percentage', 'is_published'
    ];

    const filteredData: Record<string, any> = {};
    for (const key of Object.keys(updateData)) {
      if (allowedDbColumns.includes(key)) {
        filteredData[key] = updateData[key];
      }
    }

    // Update course
    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update({
        ...filteredData,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating course:', updateError);
      return res.status(500).json({ error: 'Failed to update course' });
    }

    res.json({ course: updatedCourse });
  } catch (error: any) {
    console.error('Error in updateCourse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Publish/unpublish course
 * PUT /api/teacher/courses/:courseId/publish
 */
export const togglePublishCourse = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const { status, is_published } = req.body;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    const isOwner = course && (course.teacher_id === profile.id || course.teacher_id === userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update status
    const nextIsPublished =
      typeof is_published === 'boolean'
        ? is_published
        : status === 'published';

    const nextStatus =
      typeof status === 'string' && status.length > 0
        ? status
        : (nextIsPublished ? 'published' : 'draft');

    const updateData: any = {
      status: nextStatus,
      is_published: nextIsPublished,
      updated_at: new Date().toISOString()
    };

    if (nextIsPublished) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating course status:', updateError);
      return res.status(500).json({ error: 'Failed to update course status' });
    }

    res.json({ course: updatedCourse });
  } catch (error: any) {
    console.error('Error in togglePublishCourse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete course
 * DELETE /api/teacher/courses/:courseId
 */
export const deleteCourse = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (!course || course.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete course (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (deleteError) {
      console.error('Error deleting course:', deleteError);
      return res.status(500).json({ error: 'Failed to delete course' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteCourse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// WEEK MANAGEMENT
// ============================================

/**
 * Add a week/module to course
 * POST /api/teacher/courses/:courseId/weeks
 */
export const addWeek = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const { week_number, title, description, unlock_date } = req.body;
    const userId = req.auth?.userId;

    if (!title || week_number === undefined) {
      return res.status(400).json({ error: 'Week number and title are required' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify course access (main teacher by profile/clerk ID OR co-teacher)
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isOwner = isOwnedByTeacher(course.teacher_id, profile.id, userId);

    let isCoTeacher = false;
    if (!isOwner) {
      const { data: coTeacherRow } = await supabase
        .from('course_teachers')
        .select('id')
        .eq('course_id', courseId)
        .in('teacher_id', [profile.id, userId])
        .limit(1)
        .single();

      isCoTeacher = !!coTeacherRow;
    }

    if (!isOwner && !isCoTeacher) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Read existing weeks to compute safe week number and append order index.
    const { data: existingWeeks, error: existingWeeksError } = await supabase
      .from('course_weeks')
      .select('week_number, order_index')
      .eq('course_id', courseId);

    if (existingWeeksError) {
      console.error('Error fetching existing weeks:', existingWeeksError);
      return res.status(500).json({ error: 'Failed to validate week number' });
    }

    const usedWeekNumbers = new Set<number>(
      (existingWeeks || [])
        .map((w: any) => Number(w.week_number))
        .filter((n: number) => Number.isInteger(n))
    );

    let safeWeekNumber = Number(week_number);
    if (!Number.isInteger(safeWeekNumber) || safeWeekNumber <= 0) {
      return res.status(400).json({ error: 'week_number must be a positive integer' });
    }

    // If requested week number is already used, choose the next free number.
    if (usedWeekNumbers.has(safeWeekNumber)) {
      safeWeekNumber = 1;
      while (usedWeekNumbers.has(safeWeekNumber)) {
        safeWeekNumber += 1;
      }
    }

    const maxOrderIndex = (existingWeeks || []).reduce((max: number, w: any) => {
      const value = Number(w.order_index);
      return Number.isNaN(value) ? max : Math.max(max, value);
    }, -1);

    const nextOrder = maxOrderIndex + 1;

    // Create week
    const { data: week, error: weekError } = await supabase
      .from('course_weeks')
      .insert({
        course_id: courseId,
        week_number: safeWeekNumber,
        title,
        description,
        unlock_date,
        is_published: false,
        order_index: nextOrder
      })
      .select()
      .single();

    if (weekError) {
      if ((weekError as any).code === '23505') {
        return res.status(409).json({ error: 'Week number already exists. Please try again.' });
      }

      console.error('Error creating week:', weekError);
      return res.status(500).json({ error: 'Failed to create week' });
    }

    res.status(201).json({ week });
  } catch (error: any) {
    console.error('Error in addWeek:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update week details
 * PUT /api/teacher/weeks/:weekId
 */
export const updateWeek = async (req: any, res: Response) => {
  try {
    const { weekId } = req.params;
    const updateData = req.body;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership through course
    const { data: week } = await supabase
      .from('course_weeks')
      .select('course_id, courses!inner(teacher_id, course_type)')
      .eq('id', weekId)
      .single();

    if (!week) {
      return res.status(404).json({ error: 'Week not found' });
    }

    const courseTeacherId = getCourseTeacherId(week.courses);
    if (!isOwnedByTeacher(courseTeacherId, profile.id, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Extract course_type from the joined courses data
    const courseType = Array.isArray(week.courses)
      ? week.courses[0]?.course_type || null
      : (week.courses as any)?.course_type || null;

    // Update week
    const { data: updatedWeek, error: updateError } = await supabase
      .from('course_weeks')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', weekId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating week:', updateError);
      return res.status(500).json({ error: 'Failed to update week' });
    }

    // Skip week-to-lesson publish cascade for pre-recorded courses.
    // Pre-recorded course weeks are containers only — publishing is controlled at the course level.
    if (courseType !== 'pre-recorded') {
      // When publishing a week, auto-publish all lessons in this week
      if (updateData.is_published === true) {
        const { error: autoPublishError } = await supabase
          .from('course_lessons')
          .update({ is_published: true })
          .eq('week_id', weekId);
        
        if (autoPublishError) {
          console.error('Warning: Failed to auto-publish lessons:', autoPublishError);
        }
      }

      // When unpublishing a week, also unpublish ALL lessons in it
      if (updateData.is_published === false) {
        const { error: unpublishError } = await supabase
          .from('course_lessons')
          .update({ is_published: false })
          .eq('week_id', weekId);
        
        if (unpublishError) {
          console.error('Warning: Failed to unpublish lessons:', unpublishError);
        }
      }
    }

    res.json({ week: updatedWeek });
  } catch (error: any) {
    console.error('Error in updateWeek:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete week
 * DELETE /api/teacher/weeks/:weekId
 */
export const deleteWeek = async (req: any, res: Response) => {
  try {
    const { weekId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: week } = await supabase
      .from('course_weeks')
      .select('course_id, courses!inner(teacher_id)')
      .eq('id', weekId)
      .single();

    if (!week) {
      return res.status(404).json({ error: 'Week not found' });
    }

    const courseTeacherId = getCourseTeacherId(week.courses);
    if (!isOwnedByTeacher(courseTeacherId, profile.id, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete week
    const { error: deleteError } = await supabase
      .from('course_weeks')
      .delete()
      .eq('id', weekId);

    if (deleteError) {
      console.error('Error deleting week:', deleteError);
      return res.status(500).json({ error: 'Failed to delete week' });
    }

    res.json({ message: 'Week deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteWeek:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// LESSON MANAGEMENT
// ============================================

/**
 * Add lesson to a week
 * POST /api/teacher/weeks/:weekId/lessons
 */
export const addLesson = async (req: any, res: Response) => {
  try {
    const { weekId } = req.params;
    const {
      title,
      description,
      content_type,
      content_url,
      video_duration_minutes,
      is_required,
      is_preview
    } = req.body;
    const userId = req.auth?.userId;

    if (!title || !content_type) {
      return res.status(400).json({ error: 'Title and content type are required' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: week } = await supabase
      .from('course_weeks')
      .select('course_id, is_published, courses!inner(teacher_id, course_type)')
      .eq('id', weekId)
      .single();

    if (!week) {
      return res.status(404).json({ error: 'Week not found' });
    }

    const courseTeacherId = getCourseTeacherId(week.courses);
    if (!isOwnedByTeacher(courseTeacherId, profile.id, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Extract course_type from the joined courses data
    const courseType = Array.isArray(week.courses)
      ? week.courses[0]?.course_type || null
      : (week.courses as any)?.course_type || null;

    // Get highest order_index
    const { data: lastLesson } = await supabase
      .from('course_lessons')
      .select('order_index')
      .eq('week_id', weekId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = lastLesson ? (lastLesson.order_index || 0) + 1 : 0;

    // Build lesson insert data with all supported fields
    const lessonInsert: Record<string, any> = {
      week_id: weekId,
      title,
      description,
      content_type,
      content_url,
      video_duration_minutes,
      is_required: is_required !== false,
      is_preview: is_preview === true,
      order_index: nextOrder
    };

    // Videos and resources auto-publish when the parent week is published
    // Quiz and assignment default to draft (need individual publish)
    // For pre-recorded courses, always default to draft — publishing is controlled at the course level
    if (content_type === 'video' || content_type === 'resource' || content_type === 'text') {
      if (courseType === 'pre-recorded') {
        lessonInsert.is_published = false;
      } else {
        lessonInsert.is_published = week.is_published === true;
      }
    }

    // Include optional fields if provided
    const optionalFields = [
      'video_urls', 'quiz_questions', 'assignment_details',
      'content_url_en', 'content_url_ta', 'content_url_ar',
      'is_published', 'release_date', 'deadline', 'time_limit_minutes',
      'max_attempts', 'show_answers_after_deadline', 'show_correct_answers'
    ];
    for (const field of optionalFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        lessonInsert[field] = req.body[field];
      }
    }

    // Create lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .insert(lessonInsert)
      .select()
      .single();

    if (lessonError) {
      console.error('Error creating lesson:', lessonError);
      return res.status(500).json({ error: 'Failed to create lesson' });
    }

    // Notify enrolled students when a quiz/assignment is added and published
    if ((content_type === 'quiz' || content_type === 'assignment') && lesson.is_published) {
      try {
        // Get week title and course info for the notification
        const { data: weekInfo } = await supabase
          .from('course_weeks')
          .select('title, course_id, courses!inner(title)')
          .eq('id', weekId)
          .single();

        if (weekInfo) {
          const cInfo: any = Array.isArray(weekInfo.courses) ? weekInfo.courses[0] : weekInfo.courses;
          courseNotifications.notifyCourseContentUpdate(
            weekInfo.course_id,
            cInfo?.title || 'Course',
            weekInfo.title || 'Week',
            content_type,
            title
          );
        }
      } catch (notifErr) {
        console.error('⚠️ Failed to send content update notification:', notifErr);
      }
    }

    res.status(201).json({ lesson });
  } catch (error: any) {
    console.error('Error in addLesson:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update lesson
 * PUT /api/teacher/lessons/:lessonId
 */
export const updateLesson = async (req: any, res: Response) => {
  try {
    const { lessonId } = req.params;
    const updateData = req.body;
    const userId = req.auth?.userId;
    
    console.log('📝 updateLesson called with data:', JSON.stringify(updateData, null, 2));

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership through week and course
    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('week_id, course_weeks!inner(course_id, courses!inner(teacher_id))')
      .eq('id', lessonId)
      .single();

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const weekData: any = Array.isArray(lesson.course_weeks) ? lesson.course_weeks[0] : lesson.course_weeks;
    const courseData: any = Array.isArray(weekData?.courses) ? weekData.courses[0] : weekData?.courses;
    
    if (!isOwnedByTeacher(courseData?.teacher_id, profile.id, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Define allowed fields that exist in course_lessons table
    const allowedFields = [
      'title', 'description', 'content_type', 'content_url', 
      'video_duration_minutes', 'order_index', 'is_required', 
      'is_preview', 'content_url_en', 'content_url_ta', 'content_url_ar',
      'quiz_questions', 'assignment_details', 'video_urls',
      'is_published', 'release_date', 'deadline', 'time_limit_minutes',
      'max_attempts', 'show_answers_after_deadline', 'show_correct_answers'
    ];

    // Transform camelCase to snake_case and filter only allowed fields
    const dbUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      // Only include if it's in allowed fields
      if (allowedFields.includes(snakeKey)) {
        // Store JSON fields as-is (quiz_questions, assignment_details, video_urls)
        dbUpdateData[snakeKey] = updateData[key];
      }
    });

    console.log('📝 Filtered update data:', JSON.stringify(dbUpdateData, null, 2));

    // Update lesson
    const { data: updatedLesson, error: updateError } = await supabase
      .from('course_lessons')
      .update({
        ...dbUpdateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lesson:', updateError);
      return res.status(500).json({ error: 'Failed to update lesson' });
    }

    // Notify enrolled students when a deadline is set or changed on a quiz/assignment
    if (
      dbUpdateData.deadline &&
      (updatedLesson.content_type === 'quiz' || updatedLesson.content_type === 'assignment')
    ) {
      try {
        const { data: weekInfo } = await supabase
          .from('course_weeks')
          .select('course_id, courses!inner(title)')
          .eq('id', updatedLesson.week_id)
          .single();

        if (weekInfo) {
          const cInfo: any = Array.isArray(weekInfo.courses) ? weekInfo.courses[0] : weekInfo.courses;
          // Determine if this is a new deadline or an update
          const isNew = !lesson || !(lesson as any).deadline;
          courseNotifications.notifyDeadlineUpdate(
            weekInfo.course_id,
            cInfo?.title || 'Course',
            updatedLesson.title,
            updatedLesson.content_type as 'quiz' | 'assignment',
            dbUpdateData.deadline,
            isNew
          );
        }
      } catch (notifErr) {
        console.error('⚠️ Failed to send deadline notification:', notifErr);
      }
    }

    res.json({ lesson: updatedLesson });
  } catch (error: any) {
    console.error('Error in updateLesson:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete lesson
 * DELETE /api/teacher/lessons/:lessonId
 */
export const deleteLesson = async (req: any, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('week_id, course_weeks!inner(course_id, courses!inner(teacher_id))')
      .eq('id', lessonId)
      .single();

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const weekData: any = Array.isArray(lesson.course_weeks) ? lesson.course_weeks[0] : lesson.course_weeks;
    const courseData: any = Array.isArray(weekData?.courses) ? weekData.courses[0] : weekData?.courses;
    
    if (!isOwnedByTeacher(courseData?.teacher_id, profile.id, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete lesson
    const { error: deleteError } = await supabase
      .from('course_lessons')
      .delete()
      .eq('id', lessonId);

    if (deleteError) {
      console.error('Error deleting lesson:', deleteError);
      return res.status(500).json({ error: 'Failed to delete lesson' });
    }

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteLesson:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// LIVE SESSION SCHEDULING
// ============================================

/**
 * Schedule a live session
 * POST /api/teacher/courses/:courseId/sessions
 */
export const scheduleLiveSession = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const {
      week_id,
      title,
      description,
      scheduled_at,
      duration_minutes,
      meet_link,
      max_participants
    } = req.body;
    const userId = req.auth?.userId;

    if (!title || !scheduled_at) {
      return res.status(400).json({ error: 'Title and scheduled time are required' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify course ownership
    const { data: course } = await supabase
      .from('courses')
      .select('id, title, teacher_id')
      .eq('id', courseId)
      .single();

    if (!course || course.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create live session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .insert({
        course_id: courseId,
        week_id,
        title,
        description,
        scheduled_at,
        duration_minutes: duration_minutes || 60,
        meet_link,
        max_participants,
        status: 'scheduled'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating live session:', sessionError);
      return res.status(500).json({ error: 'Failed to create live session' });
    }

    // Notify enrolled students about the new live class (fire-and-forget)
    try {
      const { data: courseInfo } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      courseNotifications.notifyLiveClassScheduled(
        courseId,
        courseInfo?.title || 'Course',
        title,
        scheduled_at,
        duration_minutes || 60,
        meet_link
      );
    } catch (notifErr) {
      console.error('⚠️ Failed to send live class notification:', notifErr);
    }

    res.status(201).json({ session });
  } catch (error: any) {
    console.error('Error in scheduleLiveSession:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update live session
 * PUT /api/teacher/sessions/:sessionId
 */
export const updateLiveSession = async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const updateData = req.body;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: session } = await supabase
      .from('live_sessions')
      .select('course_id, courses!inner(teacher_id)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const courseTeacherId = getCourseTeacherId(session.courses);
    if (!isOwnedByTeacher(courseTeacherId, profile.id, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('live_sessions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return res.status(500).json({ error: 'Failed to update session' });
    }

    res.json({ session: updatedSession });
  } catch (error: any) {
    console.error('Error in updateLiveSession:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete/cancel live session
 * DELETE /api/teacher/sessions/:sessionId
 */
export const deleteLiveSession = async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify ownership
    const { data: session } = await supabase
      .from('live_sessions')
      .select('course_id, courses!inner(teacher_id)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const courseTeacherId = getCourseTeacherId(session.courses);
    if (!isOwnedByTeacher(courseTeacherId, profile.id, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete session
    const { error: deleteError } = await supabase
      .from('live_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      return res.status(500).json({ error: 'Failed to delete session' });
    }

    res.json({ message: 'Live session deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteLiveSession:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// ANNOUNCEMENTS
// ============================================

/**
 * Create course announcement
 * POST /api/teacher/courses/:courseId/announcements
 */
export const createAnnouncement = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, content, is_pinned } = req.body;
    const userId = req.auth?.userId;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify course ownership
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id, title')
      .eq('id', courseId)
      .single();

    if (!course || course.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create announcement
    const { data: announcement, error: announcementError } = await supabase
      .from('course_announcements')
      .insert({
        course_id: courseId,
        title,
        content,
        is_pinned: is_pinned === true,
        created_by: userId
      })
      .select()
      .single();

    if (announcementError) {
      console.error('Error creating announcement:', announcementError);
      return res.status(500).json({ error: 'Failed to create announcement' });
    }

    try {
      await courseNotifications.notifyAnnouncementCreated(
        courseId,
        course?.title || 'Course',
        title,
        content.substring(0, 180),
        announcement.id
      );
    } catch (notifErr) {
      console.error('⚠️ Failed to send announcement notification:', notifErr);
    }

    res.status(201).json({ data: announcement });
  } catch (error: any) {
    console.error('Error in createAnnouncement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update course announcement
 * PUT /api/teacher/courses/:courseId/announcements/:id
 */
export const updateAnnouncement = async (req: any, res: Response) => {
  try {
    const { courseId, id } = req.params;
    const { title, content, is_pinned } = req.body;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify course ownership
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (!course || course.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update announcement
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

    const { data: announcement, error: updateError } = await supabase
      .from('course_announcements')
      .update(updateData)
      .eq('id', id)
      .eq('course_id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating announcement:', updateError);
      return res.status(500).json({ error: 'Failed to update announcement' });
    }

    res.json({ data: announcement });
  } catch (error: any) {
    console.error('Error in updateAnnouncement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete course announcement
 * DELETE /api/teacher/courses/:courseId/announcements/:id
 */
export const deleteAnnouncement = async (req: any, res: Response) => {
  try {
    const { courseId, id } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify course ownership
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (!course || course.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete announcement
    const { error: deleteError } = await supabase
      .from('course_announcements')
      .delete()
      .eq('id', id)
      .eq('course_id', courseId);

    if (deleteError) {
      console.error('Error deleting announcement:', deleteError);
      return res.status(500).json({ error: 'Failed to delete announcement' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error in deleteAnnouncement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
/**
 * Mark course as complete (teacher verification)
 * POST /api/teacher/courses/:courseId/complete
 */
export const markCourseComplete = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .or(`clerk_user_id.eq.${userId},id.eq.${userId}`)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id, is_completed')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const isOwner = course.teacher_id === profile.id || course.teacher_id === profile.clerk_user_id;
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (course.is_completed) {
      return res.json({
        success: true,
        message: 'Course is already marked as complete.'
      });
    }

    // Mark course as complete
    const { error: updateError } = await supabase
      .from('courses')
      .update({ 
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Error marking course complete:', updateError);
      return res.status(500).json({ error: 'Failed to mark course complete' });
    }

    res.json({ 
      success: true, 
      message: 'Course marked as complete. It is now ready for admin approval.' 
    });
  } catch (error: any) {
    console.error('Error in markCourseComplete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
