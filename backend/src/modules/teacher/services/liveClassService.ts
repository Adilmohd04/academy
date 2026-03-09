/**
 * Live Class Schedule Service
 * 
 * Handles live class scheduling for courses:
 * - Create/update schedules
 * - Change status (scheduled -> live -> completed)
 * - Add recordings to lessons
 */

import { supabase } from '../../../config/database';

export interface LiveClassSchedule {
  id: string;
  course_id: string;
  week_id?: string;
  title: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  meet_link?: string;
  recording_url?: string;
  recording_added_to_lesson_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleInput {
  course_id: string;
  week_id?: string;
  title: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  meet_link?: string;
}

/**
 * Create a new live class schedule
 */
export const createSchedule = async (data: CreateScheduleInput): Promise<LiveClassSchedule> => {
  const { data: schedule, error } = await supabase
    .from('live_class_schedules')
    .insert([{
      ...data,
      timezone: data.timezone || 'Asia/Kolkata',
      status: 'scheduled'
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create schedule: ${error.message}`);
  }

  return schedule;
};

/**
 * Get all schedules for a course
 */
export const getCourseSchedules = async (courseId: string): Promise<LiveClassSchedule[]> => {
  const { data, error } = await supabase
    .from('live_class_schedules')
    .select('*')
    .eq('course_id', courseId)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch schedules: ${error.message}`);
  }

  return data || [];
};

/**
 * Get upcoming live classes for a teacher
 */
export const getTeacherUpcomingClasses = async (teacherId: string): Promise<LiveClassSchedule[]> => {
  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        id,
        title,
        teacher_id
      )
    `)
    .eq('courses.teacher_id', teacherId)
    .in('status', ['scheduled', 'live'])
    .gte('scheduled_date', new Date().toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch upcoming classes: ${error.message}`);
  }

  return data || [];
};

/**
 * Update schedule details
 */
export const updateSchedule = async (
  scheduleId: string, 
  updates: Partial<CreateScheduleInput>
): Promise<LiveClassSchedule> => {
  const { data, error } = await supabase
    .from('live_class_schedules')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update schedule: ${error.message}`);
  }

  return data;
};

/**
 * Change schedule status to LIVE
 */
export const goLive = async (scheduleId: string, meetLink?: string): Promise<LiveClassSchedule> => {
  const updates: any = {
    status: 'live',
    updated_at: new Date().toISOString()
  };

  if (meetLink) {
    updates.meet_link = meetLink;
  }

  const { data, error } = await supabase
    .from('live_class_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to go live: ${error.message}`);
  }

  return data;
};

/**
 * End live class and optionally add recording
 */
export const endLiveClass = async (
  scheduleId: string, 
  recordingUrl?: string,
  addToLessonId?: string
): Promise<LiveClassSchedule> => {
  const updates: any = {
    status: 'completed',
    updated_at: new Date().toISOString()
  };

  if (recordingUrl) {
    updates.recording_url = recordingUrl;
  }

  if (addToLessonId) {
    updates.recording_added_to_lesson_id = addToLessonId;
  }

  const { data, error } = await supabase
    .from('live_class_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to end live class: ${error.message}`);
  }

  // If adding to lesson, update the lesson with video URL
  if (recordingUrl && addToLessonId) {
    await supabase
      .from('course_lessons')
      .update({
        video_url: recordingUrl,
        video_type: 'upload',
        updated_at: new Date().toISOString()
      })
      .eq('id', addToLessonId);
  }

  return data;
};

/**
 * Cancel a scheduled class
 */
export const cancelSchedule = async (scheduleId: string): Promise<LiveClassSchedule> => {
  const { data, error } = await supabase
    .from('live_class_schedules')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cancel schedule: ${error.message}`);
  }

  return data;
};

/**
 * Update schedule status
 */
export const updateScheduleStatus = async (
  scheduleId: string, 
  status: 'upcoming' | 'live' | 'completed' | 'cancelled' | 'rescheduled'
): Promise<LiveClassSchedule> => {
  const { data, error } = await supabase
    .from('live_class_schedules')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }

  return data;
};

/**
 * Delete a schedule
 */
export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  const { error } = await supabase
    .from('live_class_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    throw new Error(`Failed to delete schedule: ${error.message}`);
  }
};

/**
 * Get student's upcoming live classes (enrolled courses)
 */
export const getStudentUpcomingClasses = async (studentId: string): Promise<LiveClassSchedule[]> => {
  const { data, error } = await supabase
    .from('live_class_schedules')
    .select(`
      *,
      courses!inner (
        id,
        title,
        enrollments!inner (
          student_id
        )
      )
    `)
    .eq('courses.enrollments.student_id', studentId)
    .in('status', ['scheduled', 'live'])
    .gte('scheduled_date', new Date().toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch upcoming classes: ${error.message}`);
  }

  return data || [];
};
