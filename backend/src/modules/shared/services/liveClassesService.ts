/**
 * Live Classes Service
 * 
 * Manages live class schedules with upcoming, live, and completed views
 * for students
 */

import { supabase } from '../../../config/database';

// Types
interface LiveClass {
  id: string;
  course_id: string;
  week_id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
  recording_url?: string;
  teacher_id: string;
  teacher_name?: string;
  course_title?: string;
  week_number?: number;
}

interface ClassCategory {
  upcoming: LiveClass[];
  live: LiveClass[];
  completed: LiveClass[];
}

// ============================================
// STUDENT VIEW - CATEGORIZED CLASSES
// ============================================

/**
 * Get student's classes categorized by status
 */
export const getStudentClassesCategorized = async (
  studentId: string,
  options: {
    courseId?: string;
    limit?: number;
  } = {}
): Promise<ClassCategory> => {
  const limit = options.limit || 10;
  
  // Get enrolled course IDs for this student
  let enrollmentQuery = supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (options.courseId) {
    enrollmentQuery = enrollmentQuery.eq('course_id', options.courseId);
  }

  const { data: enrollments, error: enrollError } = await enrollmentQuery;
  if (enrollError) throw enrollError;

  const courseIds = (enrollments || []).map(e => e.course_id);
  if (courseIds.length === 0) {
    return { upcoming: [], live: [], completed: [] };
  }

  // Get upcoming classes
  const { data: upcomingData, error: upcomingError } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        thumbnail_url,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .in('course_id', courseIds)
    .eq('status', 'scheduled')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(limit);

  if (upcomingError) throw upcomingError;

  // Get live classes
  const { data: liveData, error: liveError } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        thumbnail_url,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .in('course_id', courseIds)
    .eq('status', 'live')
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (liveError) throw liveError;

  // Get completed classes
  const { data: completedData, error: completedError } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        thumbnail_url,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .in('course_id', courseIds)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (completedError) throw completedError;

  // Manually fetch teacher profiles
  const allData = [...(upcomingData || []), ...(liveData || []), ...(completedData || [])];
  const teacherIds = [...new Set(allData.map((item: any) => item.courses?.teacher_id).filter(Boolean))];
  let teacherProfilesMap: Record<string, any> = {};
  if (teacherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds);
    teacherProfilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }

  const mapClass = (item: any) => {
    const teacherProfile = teacherProfilesMap[item.courses?.teacher_id];
    return {
      ...item,
      course_title: item.courses?.title,
      course_thumbnail: item.courses?.thumbnail_url,
      week_number: item.course_weeks?.week_number,
      week_title: item.course_weeks?.title,
      teacher_name: teacherProfile?.full_name,
      teacher_image: null
    };
  };

  return {
    upcoming: (upcomingData || []).map(mapClass),
    live: (liveData || []).map(mapClass),
    completed: (completedData || []).map(mapClass)
  };
};

/**
 * Get upcoming classes for a specific course
 */
export const getCourseUpcomingClasses = async (
  courseId: string,
  limit: number = 10
): Promise<LiveClass[]> => {
  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      course_weeks!inner (
        week_number,
        title
      ),
      courses!inner (
        teacher_id
      )
    `)
    .eq('course_id', courseId)
    .eq('status', 'scheduled')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(limit);

  if (error) throw error;

  // Manually fetch teacher profiles
  const teacherIds = [...new Set((data || []).map((item: any) => item.courses?.teacher_id).filter(Boolean))];
  let teacherProfilesMap: Record<string, any> = {};
  if (teacherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds);
    teacherProfilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }

  return (data || []).map(item => {
    const teacherProfile = teacherProfilesMap[item.courses?.teacher_id];
    return {
      ...item,
      week_number: item.course_weeks?.week_number,
      week_title: item.course_weeks?.title,
      teacher_name: teacherProfile?.full_name,
      teacher_image: null
    };
  });
};

/**
 * Get currently live classes for a student
 */
export const getStudentLiveClasses = async (
  studentId: string
): Promise<LiveClass[]> => {
  // Get enrolled course IDs
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (enrollError) throw enrollError;

  const courseIds = (enrollments || []).map(e => e.course_id);
  if (courseIds.length === 0) return [];

  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        thumbnail_url,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .in('course_id', courseIds)
    .eq('status', 'live')
    .order('scheduled_at', { ascending: false });

  if (error) throw error;

  // Manually fetch teacher profiles
  const teacherIds = [...new Set((data || []).map((item: any) => item.courses?.teacher_id).filter(Boolean))];
  let teacherProfilesMap: Record<string, any> = {};
  if (teacherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds);
    teacherProfilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }

  return (data || []).map(item => {
    const teacherProfile = teacherProfilesMap[item.courses?.teacher_id];
    return {
      ...item,
      course_title: item.courses?.title,
      course_thumbnail: item.courses?.thumbnail_url,
      week_number: item.course_weeks?.week_number,
      week_title: item.course_weeks?.title,
      teacher_name: teacherProfile?.full_name,
      teacher_image: null
    };
  });
};

/**
 * Get completed classes with recordings
 */
export const getCompletedClassesWithRecordings = async (
  studentId: string,
  courseId?: string,
  limit: number = 20
): Promise<LiveClass[]> => {
  // Get enrolled course IDs
  let enrollmentQuery = supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (courseId) {
    enrollmentQuery = enrollmentQuery.eq('course_id', courseId);
  }

  const { data: enrollments, error: enrollError } = await enrollmentQuery;
  if (enrollError) throw enrollError;

  const courseIds = (enrollments || []).map(e => e.course_id);
  if (courseIds.length === 0) return [];

  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .in('course_id', courseIds)
    .eq('status', 'completed')
    .not('recording_url', 'is', null)
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Manually fetch teacher profiles
  const teacherIds = [...new Set((data || []).map((item: any) => item.courses?.teacher_id).filter(Boolean))];
  let teacherProfilesMap: Record<string, any> = {};
  if (teacherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds);
    teacherProfilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }

  return (data || []).map(item => {
    const teacherProfile = teacherProfilesMap[item.courses?.teacher_id];
    return {
      ...item,
      course_title: item.courses?.title,
      week_number: item.course_weeks?.week_number,
      week_title: item.course_weeks?.title,
      teacher_name: teacherProfile?.full_name
    };
  });
};

// ============================================
// TEACHER VIEW
// ============================================

/**
 * Get teacher's upcoming classes
 */
export const getTeacherUpcomingClasses = async (
  teacherId: string,
  days: number = 7
): Promise<LiveClass[]> => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .eq('courses.teacher_id', teacherId)
    .eq('status', 'scheduled')
    .gt('scheduled_at', new Date().toISOString())
    .lt('scheduled_at', endDate.toISOString())
    .order('scheduled_at');

  if (error) throw error;

  // Get enrollment counts for each course
  const courseIds = [...new Set((data || []).map(d => d.course_id))];
  const { data: enrollmentCounts } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courseIds)
    .eq('status', 'active');

  const countMap: { [key: string]: number } = {};
  for (const e of enrollmentCounts || []) {
    countMap[e.course_id] = (countMap[e.course_id] || 0) + 1;
  }

  return (data || []).map(item => ({
    ...item,
    course_title: item.courses?.title,
    week_number: item.course_weeks?.week_number,
    week_title: item.course_weeks?.title,
    enrolled_students: countMap[item.course_id] || 0
  }));
};

/**
 * Get teacher's classes for today
 */
export const getTeacherTodayClasses = async (
  teacherId: string
): Promise<{
  upcoming: LiveClass[];
  live: LiveClass[];
  completed: LiveClass[];
}> => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  // Get all classes for today
  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .eq('courses.teacher_id', teacherId)
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay);

  if (error) throw error;

  const mapClass = (item: any) => ({
    ...item,
    course_title: item.courses?.title,
    week_number: item.course_weeks?.week_number,
    week_title: item.course_weeks?.title
  });

  const classes = (data || []).map(mapClass);

  return {
    upcoming: classes.filter(c => c.status === 'scheduled' && new Date(c.scheduled_at) > new Date()),
    live: classes.filter(c => c.status === 'live'),
    completed: classes.filter(c => c.status === 'completed')
  };
};

// ============================================
// CLASS STATUS MANAGEMENT
// ============================================

/**
 * Start a live class
 */
export const startLiveClass = async (
  scheduleId: string,
  teacherId: string
): Promise<LiveClass> => {
  // Verify teacher owns this class
  const { data: verifyData, error: verifyError } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        teacher_id
      )
    `)
    .eq('id', scheduleId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error('Class not found');
  }

  if (verifyData.courses.teacher_id !== teacherId) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('live_class_schedules')
    .update({
      status: 'live',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * End a live class
 */
export const endLiveClass = async (
  scheduleId: string,
  teacherId: string,
  recordingUrl?: string
): Promise<LiveClass> => {
  // Verify teacher owns this class
  const { data: verifyData, error: verifyError } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        teacher_id
      )
    `)
    .eq('id', scheduleId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error('Class not found');
  }

  if (verifyData.courses.teacher_id !== teacherId) {
    throw new Error('Unauthorized');
  }

  const updateData: any = {
    status: 'completed',
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (recordingUrl) {
    updateData.recording_url = recordingUrl;
  }

  const { data, error } = await supabase
    .from('live_class_schedules')
    .update(updateData)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Record student attendance for live class
 */
export const recordAttendance = async (
  scheduleId: string,
  studentId: string
): Promise<{ already_attended: boolean }> => {
  // Check if already attended
  const { data: existing, error: checkError } = await supabase
    .from('live_class_attendance')
    .select('id')
    .eq('schedule_id', scheduleId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    return { already_attended: true };
  }

  const { error } = await supabase
    .from('live_class_attendance')
    .insert({
      schedule_id: scheduleId,
      student_id: studentId,
      joined_at: new Date().toISOString()
    });

  if (error) throw error;
  return { already_attended: false };
};

/**
 * Get class attendance report
 */
export const getClassAttendance = async (
  scheduleId: string
): Promise<{
  total_enrolled: number;
  total_attended: number;
  attendance_rate: number;
  attendees: any[];
}> => {
  // Get class details
  const { data: classData, error: classError } = await supabase
    .from('live_class_schedules')
    .select('course_id')
    .eq('id', scheduleId)
    .single();

  if (classError || !classData) {
    throw new Error('Class not found');
  }

  const courseId = classData.course_id;

  // Get enrolled count
  const { count: enrolledCount, error: enrolledError } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'active');

  if (enrolledError) throw enrolledError;

  // Get attendees
  const { data: attendeesData, error: attendeesError } = await supabase
    .from('live_class_attendance')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('joined_at');

  if (attendeesError) throw attendeesError;

  // Fetch student profiles manually
  const studentIds = (attendeesData || []).map(a => a.student_id).filter(Boolean);
  let studentProfiles: any[] = [];
  if (studentIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);
    if (!profilesError) studentProfiles = profiles || [];
  }

  // Map profiles to attendees
  const attendeesWithProfiles = (attendeesData || []).map(attendee => {
    const profile = studentProfiles.find(p => p.id === attendee.student_id);
    return {
      ...attendee,
      profiles: profile || null
    };
  });

  const totalEnrolled = enrolledCount || 0;
  const totalAttended = attendeesWithProfiles.length;

  return {
    total_enrolled: totalEnrolled,
    total_attended: totalAttended,
    attendance_rate: totalEnrolled > 0 ? (totalAttended / totalEnrolled) * 100 : 0,
    attendees: (attendeesData || []).map(a => ({
      ...a,
      student_name: a.profiles?.full_name,
      email: a.profiles?.email
    }))
  };
};

// ============================================
// CALENDAR VIEW
// ============================================

/**
 * Get classes for calendar view (by month)
 */
export const getCalendarClasses = async (
  userId: string,
  role: 'student' | 'teacher',
  year: number,
  month: number
): Promise<LiveClass[]> => {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  if (role === 'teacher') {
    const { data, error } = await supabase
      .from('live_class_schedules')
      .select(`
        *,
        courses!inner (
          title,
          teacher_id
        ),
        course_weeks!inner (
          week_number
        )
      `)
      .eq('courses.teacher_id', userId)
      .neq('status', 'draft')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at');

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      course_title: item.courses?.title,
      week_number: item.course_weeks?.week_number
    }));
  } else {
    // Get enrolled course IDs
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', userId)
      .eq('status', 'active');

    if (enrollError) throw enrollError;

    const courseIds = (enrollments || []).map(e => e.course_id);
    if (courseIds.length === 0) return [];

    const { data, error } = await supabase
      .from('live_class_schedules')
      .select(`
        *,
        courses!inner (
          title,
          teacher_id
        ),
        course_weeks!inner (
          week_number
        )
      `)
      .in('course_id', courseIds)
      .in('status', ['scheduled', 'live', 'completed'])
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at');

    if (error) throw error;

    // Fetch teacher profiles manually
    const teacherIds = (data || []).map(item => item.courses?.teacher_id).filter(Boolean);
    let teacherProfiles: any[] = [];
    if (teacherIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);
      if (!profilesError) teacherProfiles = profiles || [];
    }

    return (data || []).map(item => ({
      ...item,
      course_title: item.courses?.title,
      teacher_name: teacherProfiles.find(p => p.id === item.courses?.teacher_id)?.full_name || null,
      week_number: item.course_weeks?.week_number
    }));
  }
};

/**
 * Get next upcoming class for a student
 */
export const getNextUpcomingClass = async (
  studentId: string
): Promise<LiveClass | null> => {
  // Get enrolled course IDs
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (enrollError) throw enrollError;

  const courseIds = (enrollments || []).map(e => e.course_id);
  if (courseIds.length === 0) return null;

  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        title,
        thumbnail_url,
        teacher_id
      ),
      course_weeks!inner (
        week_number,
        title
      )
    `)
    .in('course_id', courseIds)
    .eq('status', 'scheduled')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  // Fetch teacher profile manually if data exists
  if (data && data.courses?.teacher_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', data.courses.teacher_id)
      .single();
    
    if (profile) {
      data.courses.profiles = profile;
    }
  }

  if (!data) return null;

  return {
    ...data,
    course_title: data.courses?.title,
    course_thumbnail: data.courses?.thumbnail_url,
    week_number: data.course_weeks?.week_number,
    week_title: data.course_weeks?.title,
    teacher_name: data.courses?.profiles?.full_name,
    teacher_image: null
  };
};
