/**
 * Course Controller
 * 
 * Handles HTTP requests for course management
 */

import { Request, Response, NextFunction } from 'express';
import * as courseService from '../services/courseService';
import { supabase } from '../../../config/database';
import { courseCache, cacheKeys, invalidateCache } from '../../../lib/cache';

/**
 * Create a new course (Teacher only)
 * POST /api/courses
 */
export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      price, 
      duration_weeks, 
      thumbnail_url, 
      is_live, 
      category, 
      level,
      is_free,
      enrollment_cap,
      prerequisites,
      passing_threshold,
      course_image_url,
      approval_status,
      // NEW PROFESSIONAL FIELDS
      learning_outcomes,
      skills_gained,
      teacher_title,
      teacher_bio,
      estimated_hours,
      language,
      starts_at,
      course_type
    } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    // Fetch teacher name from profiles table
    let teacherName = 'Unknown Teacher';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('clerk_user_id', userId)
        .single();
      
      if (profile?.full_name) {
        teacherName = profile.full_name;
      }
    } catch (err) {
      console.warn('Failed to fetch teacher name:', err);
    }

    const course = await courseService.createCourse({
      title,
      description,
      teacher_id: userId,
      teacher_name: teacherName,
      price: price || 0,
      duration_weeks: duration_weeks || 4,
      thumbnail_url,
      status: 'draft',
      is_live: is_live || false,
      category,
      level,
      is_free: is_free || false,
      enrollment_cap: enrollment_cap || null,
      prerequisites: prerequisites || null,
      passing_threshold: passing_threshold || 40,
      course_image_url: course_image_url || null,
      approval_status: approval_status || 'draft',
      // NEW PROFESSIONAL FIELDS
      learning_outcomes: learning_outcomes || null,
      skills_gained: skills_gained || null,
      teacher_title: teacher_title || null,
      teacher_bio: teacher_bio || null,
      estimated_hours: estimated_hours || null,
      language: Array.isArray(language) ? language : (language ? [language] : ['English']),
      starts_at: starts_at || null,
      course_type: course_type || 'pre-recorded'
    });

    console.log('✅ Course created:', { id: course.id, title: course.title });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all courses (with caching for performance)
 * GET /api/courses
 */
export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, teacher_id, is_published, approval_status } = req.query;
    
    const filters = {
      status: status as string,
      teacher_id: teacher_id as string,
      is_published: is_published as string,
      approval_status: approval_status as string,
    };

    // Use cache for frequently accessed course lists (60 second TTL)
    const cacheKey = cacheKeys.allCourses(filters);
    const courses = await courseCache.getOrSet(
      cacheKey,
      () => courseService.getAllCourses(filters),
      60 // 1 minute cache
    );

    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single course by ID
 * GET /api/courses/:id
 */
export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const course = await courseService.getCourseById(id);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Fetch co-teachers from course_teachers table
    const { data: coTeachersRaw } = await supabase
      .from('course_teachers')
      .select('teacher_id, role')
      .eq('course_id', id)
      .eq('role', 'co-teacher');

    // Manually fetch teacher profiles
    let coTeachers: any[] = [];
    if (coTeachersRaw && coTeachersRaw.length > 0) {
      const teacherIds = coTeachersRaw.map((ct: any) => ct.teacher_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', teacherIds);
      
      const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
      
      coTeachers = coTeachersRaw.map((ct: any) => ({
        id: ct.teacher_id,
        name: profilesMap[ct.teacher_id]?.full_name,
        email: profilesMap[ct.teacher_id]?.email,
        role: ct.role
      }));
    }

    // Add co-teachers to response
    const courseWithCoTeachers = {
      ...course,
      co_teachers: coTeachers
    };

    res.json({
      success: true,
      data: courseWithCoTeachers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update course (Teacher only - must own the course)
 * PUT /api/courses/:id
 */
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;
    const updates = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get the teacher's profile to find their profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      res.status(404).json({ error: 'Teacher profile not found' });
      return;
    }

    // Check if course exists and belongs to teacher
    const course = await courseService.getCourseById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    console.log('🔍 Course ownership check:', {
      courseId: id,
      courseTeacherId: course.teacher_id,
      profileId: profile.id,
      clerkUserId: userId,
      match: course.teacher_id === profile.id
    });

    // Check if course belongs to this teacher (compare with profile ID)
    if (course.teacher_id !== profile.id) {
      res.status(403).json({ 
        error: 'You can only update your own courses'
      });
      return;
    }

    const updatedCourse = await courseService.updateCourse(id, updates);

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete course (Teacher only - must own the course)
 * DELETE /api/courses/:id
 */
export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get the teacher's profile to find their profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      res.status(404).json({ error: 'Teacher profile not found' });
      return;
    }

    // Check if course exists and belongs to teacher
    const course = await courseService.getCourseById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.teacher_id !== profile.id) {
      res.status(403).json({ error: 'You can only delete your own courses' });
      return;
    }

    await courseService.deleteCourse(id);

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all courses by teacher
 * GET /api/teacher/courses
 */
export const getTeacherCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const courses = await courseService.getCoursesByTeacher(userId);

    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get students enrolled in a course
 * GET /api/courses/:id/students
 */
export const getCourseStudents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Step 1: Get enrollments
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('id, enrolled_at, status, progress, student_id')
      .eq('course_id', id)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;

    // Step 2: Manually fetch student profiles
    // student_id in enrollments is clerk_user_id (text), NOT profiles.id (UUID)
    const clerkUserIds = (enrollments || []).map((e: any) => e.student_id).filter(Boolean);
    let profilesMap: Record<string, any> = {};
    
    console.log('[getCourseStudents] clerkUserIds:', clerkUserIds);
    
    if (clerkUserIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, clerk_user_id, full_name, email')
        .in('clerk_user_id', clerkUserIds);
      
      console.log('[getCourseStudents] profiles result:', profiles, 'error:', profileError);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
          acc[p.clerk_user_id] = p;
          return acc;
        }, {});
      }
    }

    // Step 3: Attach profiles to enrollments
    const enrichedEnrollments = (enrollments || []).map((enrollment: any) => ({
      ...enrollment,
      profiles: profilesMap[enrollment.student_id] || null
    }));

    res.json({
      success: true,
      data: enrichedEnrollments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get submissions for a course
 * GET /api/courses/:id/submissions
 */
export const getCourseSubmissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get all weeks/lessons for this course
    const { data: weeks } = await supabase
      .from('course_weeks')
      .select('id, course_lessons(id, title, content_type)')
      .eq('course_id', id);

    const lessonIds = (weeks || []).flatMap((w: any) => 
      (w.course_lessons || []).map((l: any) => l.id)
    );
    const lessonMap: Map<string, any> = new Map(
      (weeks || []).flatMap((w: any) => 
        (w.course_lessons || []).map((l: any) => [l.id, l])
      )
    );

    if (lessonIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // Fetch quiz submissions and assignment submissions in parallel
    const [quizResult, assignmentResult] = await Promise.all([
      supabase
        .from('quiz_submissions')
        .select('id, lesson_id, student_id, score, total_points, submitted_at')
        .in('lesson_id', lessonIds)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('assignment_submissions')
        .select('id, lesson_id, student_id, grade, max_grade, status, submitted_at, submission_text, feedback, file_url, file_name, link_url, text_content, submission_type, is_late')
        .in('lesson_id', lessonIds)
        .order('submitted_at', { ascending: false })
    ]);

    // Get unique student IDs to fetch their profiles
    const allStudentIds = [
      ...new Set([
        ...(quizResult.data || []).map((s: any) => s.student_id),
        ...(assignmentResult.data || []).map((s: any) => s.student_id)
      ])
    ];

    let profileMap = new Map();
    if (allStudentIds.length > 0) {
      const [byClerk, byId] = await Promise.all([
        supabase.from('profiles').select('id, clerk_user_id, full_name, email').in('clerk_user_id', allStudentIds),
        supabase.from('profiles').select('id, clerk_user_id, full_name, email').in('id', allStudentIds)
      ]);
      [...(byClerk.data || []), ...(byId.data || [])].forEach((p: any) => {
        profileMap.set(p.clerk_user_id, p);
        profileMap.set(p.id, p);
      });
    }

    // Build unified submissions list
    const submissions: any[] = [];

    (assignmentResult.data || []).forEach((sub: any) => {
      const lesson = lessonMap.get(sub.lesson_id);
      const profile = profileMap.get(sub.student_id);
      submissions.push({
        id: sub.id,
        type: 'assignment',
        lesson_id: sub.lesson_id,
        assignment_title: lesson?.title || 'Assignment',
        student_id: sub.student_id,
        student_name: profile?.full_name || profile?.email || sub.student_id,
        score: sub.grade,
        total_points: sub.max_grade || 100,
        grade: sub.grade,
        status: sub.status || 'pending',
        submitted_at: sub.submitted_at,
        drive_link: sub.link_url || sub.file_url,
        file_url: sub.file_url,
        file_name: sub.file_name,
        link_url: sub.link_url,
        text_content: sub.text_content || sub.submission_text,
        feedback: sub.feedback,
        submission_type: sub.submission_type,
        is_late: sub.is_late
      });
    });

    (quizResult.data || []).forEach((sub: any) => {
      const lesson = lessonMap.get(sub.lesson_id);
      const profile = profileMap.get(sub.student_id);
      submissions.push({
        id: sub.id,
        type: 'quiz',
        lesson_id: sub.lesson_id,
        assignment_title: lesson?.title || 'Quiz',
        student_id: sub.student_id,
        student_name: profile?.full_name || profile?.email || sub.student_id,
        score: sub.score,
        total_points: sub.total_points,
        grade: sub.total_points > 0 ? Math.round((sub.score / sub.total_points) * 100) : 0,
        status: 'graded',
        submitted_at: sub.submitted_at,
        drive_link: null,
        feedback: null
      });
    });

    // Sort by submission date, newest first
    submissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    res.json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get announcements for a course
 * GET /api/courses/:id/announcements
 */
export const getCourseAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId, id } = req.params;
    const actualCourseId = courseId || id;

    const { data: announcements, error } = await supabase
      .from('course_announcements')
      .select('*')
      .eq('course_id', actualCourseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: announcements || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create announcement for a course
 * POST /api/courses/:courseId/announcements
 */
export const createCourseAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, content, is_pinned } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        course_id: courseId,
        title,
        content,
        is_pinned: is_pinned || false,
        created_by: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update announcement
 * PUT /api/announcements/:id
 */
export const updateCourseAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, is_pinned } = req.body;

    const { data: announcement, error } = await supabase
      .from('course_announcements')
      .update({ title, content, is_pinned })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete announcement
 * DELETE /api/announcements/:id
 */
export const deleteCourseAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('course_announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get scheduled classes for a course
 * GET /api/courses/:id/classes
 */
export const getCourseClasses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: classes, error } = await supabase
      .from('scheduled_classes')
      .select('*')
      .eq('course_id', id)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: classes || [],
    });
  } catch (error) {
    next(error);
  }
};
