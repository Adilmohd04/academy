import { supabase } from '../../../config/database';

export const getAllCourses = async () => {
  try {
    // First get all courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (coursesError) throw coursesError;
    if (!courses) return [];

    console.log('[CourseService] Found', courses.length, 'courses');
    if (courses.length > 0) {
      console.log('[CourseService] First course fields:', Object.keys(courses[0]));
      console.log('[CourseService] First course teacher_id:', courses[0].teacher_id);
    }

    // Then get teacher info for each course
    const coursesWithTeachers = await Promise.all(
      courses.map(async (course) => {
        // Try to get teacher ID from either teacher_id or created_by field
        const teacherId = course.teacher_id || (course as any).created_by;
        
        if (!teacherId) {
          console.log('[CourseService] Course', course.title, 'has no teacher_id or created_by');
          return { ...course, teacher: null };
        }

        console.log('[CourseService] Fetching teacher for course:', course.title, 'ID:', teacherId);
        
        // Try to find teacher by profile ID first (if it looks like a UUID)
        let teacher = null;
        let teacherError = null;
        
        if (teacherId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // Looks like a UUID, try ID lookup
          const idResult = await supabase
            .from('profiles')
            .select('*')
            .eq('id', teacherId)
            .single();
          teacher = idResult.data;
          teacherError = idResult.error;
        }
        
        // If not found or looks like Clerk ID, try by clerk_user_id
        if (!teacher) {
          console.log('[CourseService] Trying clerk_user_id lookup for:', teacherId);
          const clerkResult = await supabase
            .from('profiles')
            .select('*')
            .eq('clerk_user_id', teacherId)
            .single();
          teacher = clerkResult.data;
          teacherError = clerkResult.error;
        }

        if (teacherError) {
          console.error('[CourseService] Error fetching teacher:', teacherError.message);
          console.error('[CourseService] Teacher ID was:', teacherId);
        } else if (teacher) {
          console.log('[CourseService] Teacher found:', teacher.email, teacher.full_name);
          console.log('[CourseService] Teacher fields:', Object.keys(teacher));
        } else {
          console.warn('[CourseService] ⚠️  No teacher profile found for ID:', teacherId);
          console.warn('[CourseService] This teacher may not have logged in yet or their profile was not created');
          console.warn('[CourseService] Course:', course.title, '| Teacher ID:', teacherId);
        }

        // Also fetch co-teachers for this course
        const { data: coTeachers } = await supabase
          .from('course_teachers')
          .select('teacher_id, role')
          .eq('course_id', course.id);
        
        // Fetch full profiles for co-teachers
        let coTeacherProfiles = [];
        if (coTeachers && coTeachers.length > 0) {
          const coTeacherIds = coTeachers.map(ct => ct.teacher_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', coTeacherIds);
          
          if (profiles) {
            coTeacherProfiles = profiles;
          }
        }
        
        return {
          ...course,
          teacher: teacher || null,
          co_teachers: coTeacherProfiles || []
        };
      })
    );

    console.log('[CourseService] Returning', coursesWithTeachers.length, 'courses with teacher data');
    return coursesWithTeachers;
  } catch (error) {
    console.error('Error in getAllCourses:', error);
    throw error;
  }
};

export const updateCourseStatus = async (courseId: string, status: 'approved' | 'rejected' | 'pending_approval') => {
  const { data, error } = await supabase
    .from('courses')
    .update({ approval_status: status })
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCourse = async (courseId: string) => {
  // First delete all co-teacher associations
  const { error: coTeacherError } = await supabase
    .from('course_teachers')
    .delete()
    .eq('course_id', courseId);

  if (coTeacherError) {
    console.error('Error deleting co-teachers:', coTeacherError);
    // Continue even if this fails (table might not exist yet)
  }

  // Then delete the course (other related data will CASCADE automatically)
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) throw error;
  return true;
};

export const getPendingCourses = async () => {
  try {
    // First get pending courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('approval_status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (coursesError) throw coursesError;
    if (!courses) return [];

    // Then get teacher info for each course
    const coursesWithTeachers = await Promise.all(
      courses.map(async (course) => {
        if (!course.teacher_id) {
          return { ...course, teacher: null };
        }

        const { data: teacher } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', course.teacher_id)
          .single();

        return {
          ...course,
          teacher: teacher || null
        };
      })
    );

    return coursesWithTeachers;
  } catch (error) {
    console.error('Error in getPendingCourses:', error);
    throw error;
  }
};

export const addCoTeacher = async (courseId: string, teacherId: string) => {
  try {
    // Convert clerk_user_id to profile UUID
    // teacherId could be either clerk_user_id (TEXT) or profile.id (UUID)
    const { data: teacherProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .or(`id.eq.${teacherId},clerk_user_id.eq.${teacherId}`)
      .single();

    if (profileError || !teacherProfile) {
      throw new Error('Teacher profile not found');
    }

    // Check if already a co-teacher
    const { data: existing } = await supabase
      .from('course_teachers')
      .select('id')
      .eq('course_id', courseId)
      .eq('teacher_id', teacherProfile.id)
      .maybeSingle();

    if (existing) {
      throw new Error('This teacher is already a co-teacher for this course');
    }

    // Check if this teacher is the primary teacher of the course
    const { data: courseData } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseData && courseData.teacher_id === teacherProfile.id) {
      throw new Error('Cannot add the primary teacher as a co-teacher');
    }

    // Insert into course_teachers with profile UUID
    const { data, error } = await supabase
      .from('course_teachers')
      .insert({
        course_id: courseId,
        teacher_id: teacherProfile.id, // Use profile UUID, not clerk_user_id
        role: 'co-teacher'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error in addCoTeacher:', error);
    throw error;
  }
};

export const removeCoTeacher = async (courseId: string, teacherClerkId: string) => {
  try {
    // Convert clerk_user_id to profile UUID
    const { data: teacherProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', teacherClerkId)
      .single();

    if (profileError || !teacherProfile) {
      throw new Error('Teacher profile not found');
    }

    // Delete from course_teachers
    const { error } = await supabase
      .from('course_teachers')
      .delete()
      .eq('course_id', courseId)
      .eq('teacher_id', teacherProfile.id)
      .eq('role', 'co-teacher');

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error in removeCoTeacher:', error);
    throw error;
  }
};

export const updateCoursePrice = async (courseId: string, price: number) => {
  try {
    // Update both price and is_free flag
    // is_free should be true only when price is 0, false otherwise
    const { data, error } = await supabase
      .from('courses')
      .update({ 
        price,
        is_free: price === 0
      })
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error in updateCoursePrice:', error);
    throw error;
  }
};
