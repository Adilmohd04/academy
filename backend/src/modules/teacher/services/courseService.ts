/**
 * Course Service
 * 
 * Database operations for courses
 */

import { supabase } from '../../../config/database';

export interface Course {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  teacher_name?: string;
  price: number;
  is_free: boolean;
  thumbnail_url?: string;
  course_image_url?: string;
  duration_weeks: number;
  status: 'draft' | 'published' | 'archived';
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  published_at?: string;
  is_live?: boolean;
  category?: string;
  level?: string;
  prerequisites?: string;
  enrollment_cap?: number;
  enrolled_count: number;
  passing_threshold: number;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  teacher_id: string;
  teacher_name?: string;
  price?: number;
  is_free?: boolean;
  duration_weeks?: number;
  thumbnail_url?: string;
  course_image_url?: string;
  thumbnail_image?: string;
  status?: string;
  approval_status?: string;
  is_live?: boolean;
  category?: string;
  tags?: string[];
  level?: string;
  prerequisites?: string;
  enrollment_cap?: number;
  passing_threshold?: number;
  learning_outcomes?: string;
  skills_gained?: string;
  teacher_title?: string;
  teacher_bio?: string;
  teacher_avatar?: string;
  estimated_hours?: number;
  language?: string | string[];
  subtitle_languages?: string[];
  starts_at?: string;
  ends_at?: string;
  course_type?: string;
  instructors?: any;
  mentoring_text?: string;
  mentoring_structured?: any;
  schedule_frequency?: string;
  schedule_timezone?: string;
  enrollment_deadline?: string;
  course_format_description?: string;
}

export interface CourseFilters {
  status?: string;
  teacher_id?: string;
  is_published?: string;
  approval_status?: string;
}

/**
 * Create a new course
 */
export const createCourse = async (data: CreateCourseInput): Promise<Course> => {
  // Map language to course_languages for database
  const { language, ...restData } = data;
  const courseData = {
    ...restData,
    course_languages: Array.isArray(language) ? language : (language ? [language] : ['English']),
    updated_at: new Date().toISOString(),
  };

  const { data: course, error } = await supabase
    .from('courses')
    .insert([courseData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create course: ${error.message}`);
  }

  return course;
};

/**
 * Get all courses with optional filters
 * FIXED: Uses manual lookups since FK relationships don't exist in schema
 */
export const getAllCourses = async (filters: CourseFilters = {}): Promise<Course[]> => {
  // Step 1: Fetch courses without FK joins (no FK relationships in schema)
  let query = supabase
    .from('courses')
    .select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id);
  }

  if (filters.is_published !== undefined && filters.is_published !== '') {
    query = query.eq('is_published', filters.is_published === 'true');
  }

  if (filters.approval_status) {
    query = query.eq('approval_status', filters.approval_status);
  }

  query = query.order('created_at', { ascending: false });

  const { data: courses, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  if (!courses || courses.length === 0) {
    return [];
  }

  // Step 2: Get unique teacher IDs and fetch profiles
  const teacherIds = [...new Set(courses.map((c: any) => c.teacher_id).filter(Boolean))];
  
  let profilesMap: Record<string, any> = {};
  if (teacherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, clerk_user_id')
      .in('id', teacherIds);
    
    if (profiles) {
      profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }
  }

  // Step 3: Get enrollment counts per course
  const courseIds = courses.map((c: any) => c.id);
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courseIds);

  const enrollmentCounts: Record<string, number> = {};
  if (enrollments) {
    enrollments.forEach((e: any) => {
      enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] || 0) + 1;
    });
  }

  // Step 4: Get co-teachers if needed
  const { data: courseTeachers } = await supabase
    .from('course_teachers')
    .select('course_id, teacher_id, role')
    .in('course_id', courseIds)
    .eq('role', 'co-teacher');

  // Get co-teacher profiles
  const coTeacherIds = [...new Set((courseTeachers || []).map((ct: any) => ct.teacher_id).filter(Boolean))];
  let coTeacherProfilesMap: Record<string, any> = {};
  if (coTeacherIds.length > 0) {
    const { data: coTeacherProfiles } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, full_name')
      .in('id', coTeacherIds);
    
    if (coTeacherProfiles) {
      coTeacherProfilesMap = coTeacherProfiles.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }
  }

  // Step 5: Transform data
  const coursesWithDetails = courses.map((course: any) => {
    const teacherProfile = profilesMap[course.teacher_id];
    
    // Get co-teachers for this course
    const coTeachers = (courseTeachers || [])
      .filter((ct: any) => ct.course_id === course.id)
      .map((ct: any) => {
        const profile = coTeacherProfilesMap[ct.teacher_id];
        return profile ? {
          clerk_user_id: profile.clerk_user_id,
          full_name: profile.full_name
        } : null;
      })
      .filter(Boolean);

    return {
      ...course,
      profiles: teacherProfile ? { full_name: teacherProfile.full_name } : null,
      _count: { enrollments: enrollmentCounts[course.id] || 0 },
      co_teachers: coTeachers
    };
  });

  return coursesWithDetails;
};

/**
 * Get a single course by ID
 */
export const getCourseById = async (id: string): Promise<Course | null> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch course: ${error.message}`);
  }

  // Fetch main teacher info
  if (data.teacher_id) {
    try {
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('id, full_name, email, clerk_user_id')
        .or(`id.eq.${data.teacher_id},clerk_user_id.eq.${data.teacher_id}`)
        .single();

      if (!teacherError && teacherData) {
        (data as any).teacher = teacherData;
        (data as any).teacher_name = teacherData.full_name || teacherData.email;
      }
    } catch (err) {
      console.error('Error fetching teacher:', err);
    }
  }

  // Fetch co-teachers for this course
  try {
    const { data: coTeachersData, error: coTeachersError } = await supabase
      .from('course_teachers')
      .select('teacher_id')
      .eq('course_id', id);

    if (!coTeachersError && coTeachersData && coTeachersData.length > 0) {
      const teacherIds = coTeachersData.map((ct: any) => ct.teacher_id).filter(Boolean);
      const { data: teacherProfiles } = await supabase
        .from('profiles')
        .select('id, clerk_user_id, full_name, email')
        .in('clerk_user_id', teacherIds);

      const profileMap = new Map((teacherProfiles || []).map((p: any) => [p.clerk_user_id, p]));
      const coTeachers = coTeachersData.map((ct: any) => {
        const profile = profileMap.get(ct.teacher_id);
        return {
          id: profile?.id || ct.teacher_id,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
        };
      });
      (data as any).co_teachers = coTeachers;
    } else {
      (data as any).co_teachers = [];
    }
  } catch (err) {
    console.error('Error fetching co-teachers:', err);
    // Continue without co-teachers if there's an error
  }

  // Fetch sections with lessons for this course
  try {
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('course_sections')
      .select(`
        id,
        title,
        description,
        order_index,
        section_lessons (
          id,
          title,
          type,
          duration_minutes,
          order_index
        )
      `)
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    if (!sectionsError && sectionsData) {
      const sections = sectionsData.map((section: any) => ({
        section_id: section.id,
        title: section.title,
        description: section.description,
        display_order: section.order_index,
        lessons: (section.section_lessons || []).map((lesson: any) => ({
          lesson_id: lesson.id,
          title: lesson.title,
          lesson_type: lesson.type,
          duration_minutes: lesson.duration_minutes,
          display_order: lesson.order_index,
        })),
      }));
      (data as any).sections = sections;
    }
  } catch (err) {
    console.error('Error fetching sections:', err);
    // Continue without sections if there's an error
  }

  return data;
};

/**
 * Update a course
 */
export const updateCourse = async (
  id: string,
  updates: Partial<CreateCourseInput>
): Promise<Course> => {
  // Only allow known database columns to prevent Supabase errors
  const allowedDbColumns = [
    'title', 'description', 'short_description', 'long_description',
    'teacher_id', 'price', 'is_free', 'thumbnail_url', 'course_image_url',
    'duration_weeks', 'status', 'approval_status',
    'is_live', 'category', 'level', 'prerequisites', 'prerequisite_courses',
    'enrollment_cap', 'passing_threshold', 'syllabus', 'course_languages',
    'tags', 'learning_outcomes', 'skills_gained', 'teacher_title',
    'teacher_bio', 'estimated_hours', 'language', 'starts_at',
    'course_type', 'instructors',
    'mentoring_text', 'mentoring_structured', 'schedule_frequency',
    'schedule_timezone', 'enrollment_deadline', 'course_format_description',
    'start_date', 'end_date', 'available_slots'
  ];

  const sanitizedUpdates: Record<string, any> = {};
  for (const key of Object.keys(updates)) {
    if (allowedDbColumns.includes(key) && (updates as any)[key] !== undefined) {
      sanitizedUpdates[key] = (updates as any)[key];
    }
  }

  const { data, error } = await supabase
    .from('courses')
    .update({
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }

  return data;
};

/**
 * Delete a course
 */
export const deleteCourse = async (id: string): Promise<void> => {
  const { error } = await supabase.from('courses').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }
};

/**
 * Submit course for approval (Teacher → Admin)
 */
export const submitForApproval = async (id: string): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .update({ approval_status: 'pending_approval' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to submit course: ${error.message}`);
  return data;
};

/**
 * Approve course (Admin only)
 */
export const approveCourse = async (id: string): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .update({ 
      approval_status: 'approved',
      status: 'published',
      published_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to approve course: ${error.message}`);
  return data;
};

/**
 * Reject course (Admin only)
 */
export const rejectCourse = async (id: string, reason?: string): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .update({ approval_status: 'rejected' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to reject course: ${error.message}`);
  return data;
};

/**
 * Get courses pending approval (Admin)
 */
export const getPendingCourses = async (): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('approval_status', 'pending_approval')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch pending courses: ${error.message}`);
  return data || [];
};

/**
 * Get all courses by a specific teacher (including as main teacher and co-teacher)
 */
export const getCoursesByTeacher = async (teacherId: string): Promise<Course[]> => {
  // First, get the teacher's profile ID and clerk_user_id
  // Try by clerk_user_id first (most common case)
  let profile = await supabase
    .from('profiles')
    .select('id, clerk_user_id')
    .eq('clerk_user_id', teacherId)
    .single();

  // If not found, try by UUID
  if (!profile.data) {
    profile = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('id', teacherId)
      .single();
  }

  if (!profile.data) {
    throw new Error('Teacher profile not found');
  }

  const profileId = profile.data.id;
  const clerkUserId = profile.data.clerk_user_id;

  // Get courses where teacher is the main teacher (using profile UUID)
  // Note: We check both profileId (UUID) and clerkUserId for backward compatibility
  const { data: mainCourses, error: mainError } = await supabase
    .from('courses')
    .select('*')
    .or(`teacher_id.eq.${profileId},teacher_id.eq.${clerkUserId}`)
    .order('created_at', { ascending: false });

  if (mainError) {
    throw new Error(`Failed to fetch teacher courses: ${mainError.message}`);
  }

  // Get enrollment counts for each course
  const coursesWithEnrollments = await Promise.all(
    (mainCourses || []).map(async (course) => {
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);
      
      return {
        ...course,
        user_role: 'main_teacher',
        _count: {
          enrollments: count || 0
        }
      };
    })
  );

  const coursesWithRole = coursesWithEnrollments;

  // Get courses where teacher is a co-teacher
  let coTeacherCourses: any[] = [];
  if (profileId) {
    const { data: coTeacherData, error: coError } = await supabase
      .from('course_teachers')
      .select(`
        course_id,
        courses (*)
      `)
      .eq('teacher_id', profileId);

    if (!coError && coTeacherData) {
      // Fetch enrollment counts for co-teacher courses
      const coTeacherCoursesWithEnrollments = await Promise.all(
        coTeacherData
          .map((ct: any) => ct.courses)
          .filter(course => course && course.id)
          .map(async (course: any) => {
            const { count } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);
            
            return {
              ...course,
              user_role: 'co_teacher',
              _count: {
                enrollments: count || 0
              }
            };
          })
      );

      coTeacherCourses = coTeacherCoursesWithEnrollments;
    }
  }

  // Combine and deduplicate courses (prioritize main teacher role if both)
  const allCourses = [...coursesWithRole, ...coTeacherCourses];
  const uniqueCourses = Array.from(
    new Map(allCourses.map(course => [course.id, course])).values()
  );

  // Map _count.enrollments to student_count for frontend compatibility
  const coursesWithStudentCount = uniqueCourses.map(course => ({
    ...course,
    student_count: course._count?.enrollments || 0
  }));

  return coursesWithStudentCount.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};
