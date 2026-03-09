import pool from '../../../config/database';

export interface LiveSession {
  id: string;
  course_id: string;
  lesson_id?: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meet_link?: string;
  is_live: boolean;
  recording_url?: string;
  created_at: string;
}

export const getLessonLiveSession = async (
  lessonId: string
): Promise<LiveSession | null> => {
  const { data, error } = await pool
    .from('live_sessions')
    .select('*')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

export const markSessionAttendance = async (
  sessionId: string,
  studentId: string
): Promise<void> => {
  // Check if already marked
  const { data: existing, error: existingError } = await pool
    .from('live_session_attendance')
    .select('id')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing) {
    const { error } = await pool
      .from('live_session_attendance')
      .insert({ session_id: sessionId, student_id: studentId, joined_at: new Date().toISOString() });
    
    if (error) throw error;
  }
};

export const getCourseLiveSessions = async (
  courseId: string,
  studentId: string
): Promise<any> => {
  // Fetch live class schedules created by the teacher in the course builder
  const { data, error } = await pool
    .from('live_class_schedules')
    .select(`
      id,
      title,
      description,
      meet_link,
      scheduled_date,
      start_time,
      end_time,
      timezone,
      status,
      recording_url
    `)
    .eq('course_id', courseId)
    .order('scheduled_date', { ascending: false });

  if (error) throw error;

  // Map live_class_schedules fields to the format the frontend expects
  const sessions = (data || []).map((ls: any) => {
    // Combine scheduled_date and start_time into a single ISO timestamp
    const scheduledAt = ls.scheduled_date && ls.start_time
      ? `${ls.scheduled_date}T${ls.start_time}`
      : ls.scheduled_date || '';

    // Calculate duration from start_time and end_time
    let durationMinutes = 60; // default
    if (ls.start_time && ls.end_time) {
      const [sh, sm] = ls.start_time.split(':').map(Number);
      const [eh, em] = ls.end_time.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) durationMinutes = diff;
    }

    return {
      id: ls.id,
      title: ls.title,
      description: ls.description,
      meeting_link: ls.meet_link,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      status: ls.status || 'scheduled',
      recording_url: ls.recording_url,
      is_live: ls.status === 'live',
      timezone: ls.timezone
    };
  });

  return { sessions };
};
