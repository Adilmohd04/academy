/**
 * Live Class Controller
 * 
 * API endpoints for live class scheduling
 */

import { Request, Response } from 'express';
import * as liveClassService from '../services/liveClassService';

/**
 * Create a new schedule
 * POST /api/teacher/courses/:courseId/schedules
 */
export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, description, scheduled_date, start_time, end_time, timezone, week_id, meet_link } = req.body;

    if (!title || !scheduled_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, date, start time, and end time are required' });
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

    const classes = await liveClassService.getTeacherUpcomingClasses(teacherId);

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
    const updates = req.body;

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
    const { meet_link } = req.body;

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
    const { recording_url, add_to_lesson_id } = req.body;

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
    const { status } = req.body;

    const validStatuses = ['upcoming', 'live', 'completed', 'cancelled', 'rescheduled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const schedule = await liveClassService.updateScheduleStatus(scheduleId, status);

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
