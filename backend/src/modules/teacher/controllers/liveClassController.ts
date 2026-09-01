/**
 * Live Class Controller
 * 
 * API endpoints for live class scheduling
 */

import { Request, Response } from 'express';
import * as liveClassService from '../services/liveClassService';
import { supabase } from '../../../config/database';

const getTeacherIdCandidates = async (clerkUserId: string): Promise<string[]> => {
  const candidates = [clerkUserId];
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (profile?.id) candidates.push(profile.id);
  return candidates;
};

const getJoinedTeacherId = (course: unknown): string | undefined => {
  if (Array.isArray(course)) return course[0]?.teacher_id;
  return (course as { teacher_id?: string } | null)?.teacher_id;
};

/**
 * The courses table has historically stored either a Clerk user ID or a
 * profile UUID in teacher_id. Resolve both before granting access. This keeps
 * a signed-in teacher from listing or mutating another teacher's schedule.
 */
const canManageCourse = async (
  courseId: string,
  clerkUserId: string,
  role?: string,
): Promise<boolean> => {
  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', courseId)
    .maybeSingle();

  if (!course) return false;
  if (role === 'admin') return true;

  const courseTeacherId = typeof course.teacher_id === 'string' ? course.teacher_id : '';
  if (!courseTeacherId) return false;
  return (await getTeacherIdCandidates(clerkUserId)).includes(courseTeacherId);
};

const canManageSchedule = async (
  scheduleId: string,
  clerkUserId: string,
  role?: string,
): Promise<boolean> => {
  const { data: schedule } = await supabase
    .from('live_class_schedules')
    .select('id, courses!inner(teacher_id)')
    .eq('id', scheduleId)
    .maybeSingle();

  if (!schedule) return false;
  if (role === 'admin') return true;

  const courseTeacherId = getJoinedTeacherId(schedule.courses);
  if (!courseTeacherId) return false;
  return (await getTeacherIdCandidates(clerkUserId)).includes(courseTeacherId);
};

const getScheduleCourseId = async (scheduleId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('live_class_schedules')
    .select('course_id')
    .eq('id', scheduleId)
    .maybeSingle();
  return data?.course_id || null;
};

const belongsToCourse = async (
  table: 'course_weeks' | 'course_lessons',
  id: string,
  courseId: string,
): Promise<boolean> => {
  if (table === 'course_weeks') {
    const { data } = await supabase
      .from('course_weeks')
      .select('id')
      .eq('id', id)
      .eq('course_id', courseId)
      .maybeSingle();
    return Boolean(data);
  }

  const { data: lesson } = await supabase
    .from('course_lessons')
    .select('week_id')
    .eq('id', id)
    .maybeSingle();
  if (!lesson?.week_id) return false;

  const { data: week } = await supabase
    .from('course_weeks')
    .select('id')
    .eq('id', lesson.week_id)
    .eq('course_id', courseId)
    .maybeSingle();
  return Boolean(week);
};

/**
 * Create a new schedule
 * POST /api/teacher/courses/:courseId/schedules
 */
export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;
    const { title, description, scheduled_date, start_time, end_time, timezone, week_id, meet_link } = req.body;

    if (!teacherId || !await canManageCourse(courseId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!title || !scheduled_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, date, start time, and end time are required' });
    }

    if (week_id && !await belongsToCourse('course_weeks', week_id, courseId)) {
      return res.status(400).json({ error: 'The selected week does not belong to this course' });
    }

    const schedule = await liveClassService.createSchedule({
      course_id: courseId,
      week_id,
      title,
      description,
      scheduled_date,
      start_time,
      end_time,
      timezone,
      meet_link
    });

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all schedules for a course
 * GET /api/teacher/courses/:courseId/schedules
 */
export const getCourseSchedules = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId || !await canManageCourse(courseId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const schedules = await liveClassService.getCourseSchedules(courseId);

    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get teacher's upcoming classes
 * GET /api/teacher/live-classes/upcoming
 */
export const getUpcomingClasses = async (req: Request, res: Response) => {
  try {
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const classes = await liveClassService.getTeacherUpcomingClasses(
      await getTeacherIdCandidates(teacherId),
    );

    res.json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching upcoming classes:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update schedule
 * PUT /api/teacher/schedules/:scheduleId
 */
export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId || !await canManageSchedule(scheduleId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const courseId = await getScheduleCourseId(scheduleId);
    if (!courseId) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const allowedFields = ['title', 'description', 'scheduled_date', 'start_time', 'end_time', 'timezone', 'meet_link', 'week_id'];
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => req.body?.[field] !== undefined)
        .map((field) => [field, req.body[field]]),
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid schedule fields were supplied' });
    }

    if (typeof updates.week_id === 'string' && !await belongsToCourse('course_weeks', updates.week_id, courseId)) {
      return res.status(400).json({ error: 'The selected week does not belong to this course' });
    }

    const schedule = await liveClassService.updateSchedule(scheduleId, updates);

    res.json({
      success: true,
      data: schedule
    });
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Go live
 * POST /api/teacher/schedules/:scheduleId/go-live
 */
export const goLive = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const teacherId = req.auth?.userId;
    const { meet_link } = req.body;

    if (!teacherId || !await canManageSchedule(scheduleId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = await liveClassService.goLive(scheduleId, meet_link);

    res.json({
      success: true,
      message: 'You are now live!',
      data: schedule
    });
  } catch (error: any) {
    console.error('Error going live:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * End live class
 * POST /api/teacher/schedules/:scheduleId/end
 */
export const endLiveClass = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const teacherId = req.auth?.userId;
    const { recording_url, add_to_lesson_id } = req.body;

    if (!teacherId || !await canManageSchedule(scheduleId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (add_to_lesson_id) {
      const courseId = await getScheduleCourseId(scheduleId);
      if (!courseId || !await belongsToCourse('course_lessons', add_to_lesson_id, courseId)) {
        return res.status(400).json({ error: 'The selected lesson does not belong to this course' });
      }
    }

    const schedule = await liveClassService.endLiveClass(scheduleId, recording_url, add_to_lesson_id);

    res.json({
      success: true,
      message: 'Live class ended',
      data: schedule
    });
  } catch (error: any) {
    console.error('Error ending live class:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Cancel schedule
 * POST /api/teacher/schedules/:scheduleId/cancel
 */
export const cancelSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId || !await canManageSchedule(scheduleId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = await liveClassService.cancelSchedule(scheduleId);

    res.json({
      success: true,
      message: 'Schedule cancelled',
      data: schedule
    });
  } catch (error: any) {
    console.error('Error cancelling schedule:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Update schedule status
 * PATCH /api/teacher/schedules/:scheduleId/status
 */
export const updateScheduleStatus = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const teacherId = req.auth?.userId;
    const { status, scheduled_date, start_time, end_time } = req.body || {};

    if (!teacherId || !await canManageSchedule(scheduleId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const validStatuses = ['upcoming', 'live', 'completed', 'cancelled', 'rescheduled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // The builder sends a new date/time when rescheduling. Persist those
    // fields with the status transition rather than marking a class as
    // rescheduled while leaving it at its old time.
    const updates: Record<string, string> = { status };
    if (typeof scheduled_date === 'string') updates.scheduled_date = scheduled_date;
    if (typeof start_time === 'string') updates.start_time = start_time;
    if (typeof end_time === 'string') updates.end_time = end_time;
    const schedule = await liveClassService.updateSchedule(scheduleId, updates as any);

    res.json({
      success: true,
      message: `Schedule status updated to ${status}`,
      data: schedule
    });
  } catch (error: any) {
    console.error('Error updating schedule status:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete schedule
 * DELETE /api/teacher/schedules/:scheduleId
 */
export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId || !await canManageSchedule(scheduleId, teacherId, req.auth?.role)) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await liveClassService.deleteSchedule(scheduleId);

    res.json({
      success: true,
      message: 'Schedule deleted'
    });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    res.status(400).json({ error: error.message });
  }
};
