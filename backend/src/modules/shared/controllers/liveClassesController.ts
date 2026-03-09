/**
 * Live Classes Controller
 * 
 * API endpoints for live class management and views
 */

import { Request, Response } from 'express';
import * as liveClassesService from '../services/liveClassesService';
import { supabase } from '../../../config/database';

// ============================================
// STUDENT VIEW ENDPOINTS
// ============================================

/**
 * Get student's classes categorized by status
 */
export const getMyClassesCategorized = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    const { courseId, limit } = req.query;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const classes = await liveClassesService.getStudentClassesCategorized(
      studentId,
      {
        courseId: courseId as string,
        limit: limit ? parseInt(limit as string) : undefined
      }
    );
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch classes'
    });
  }
};

/**
 * Get live classes currently happening
 */
export const getMyLiveClasses = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const classes = await liveClassesService.getStudentLiveClasses(studentId);
    
    res.json({
      success: true,
      data: classes,
      count: classes.length
    });
  } catch (error: any) {
    console.error('Error fetching live classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch live classes'
    });
  }
};

/**
 * Get next upcoming class
 */
export const getNextUpcomingClass = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const nextClass = await liveClassesService.getNextUpcomingClass(studentId);
    
    res.json({
      success: true,
      data: nextClass,
      hasUpcoming: !!nextClass
    });
  } catch (error: any) {
    console.error('Error fetching next class:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch next class'
    });
  }
};

/**
 * Get completed classes with recordings
 */
export const getCompletedWithRecordings = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    const { courseId, limit } = req.query;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const classes = await liveClassesService.getCompletedClassesWithRecordings(
      studentId,
      courseId as string,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recordings'
    });
  }
};

// ============================================
// COURSE-SPECIFIC ENDPOINTS
// ============================================

/**
 * Get upcoming classes for a course
 */
export const getCourseUpcomingClasses = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { limit } = req.query;
    
    const classes = await liveClassesService.getCourseUpcomingClasses(
      courseId,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching course classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch classes'
    });
  }
};

// ============================================
// TEACHER VIEW ENDPOINTS
// ============================================

/**
 * Get teacher's upcoming classes
 */
export const getTeacherUpcomingClasses = async (req: Request, res: Response) => {
  try {
    const teacherId = req.auth?.userId;
    const { days } = req.query;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const classes = await liveClassesService.getTeacherUpcomingClasses(
      teacherId,
      days ? parseInt(days as string) : undefined
    );
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch classes'
    });
  }
};

/**
 * Get teacher's classes for today
 */
export const getTeacherTodayClasses = async (req: Request, res: Response) => {
  try {
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const classes = await liveClassesService.getTeacherTodayClasses(teacherId);
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching today classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch classes'
    });
  }
};

// ============================================
// CLASS MANAGEMENT ENDPOINTS
// ============================================

/**
 * Start a live class
 */
export const startLiveClass = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const liveClass = await liveClassesService.startLiveClass(scheduleId, teacherId);
    
    res.json({
      success: true,
      data: liveClass,
      message: 'Live class started'
    });
  } catch (error: any) {
    console.error('Error starting class:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start class'
    });
  }
};

/**
 * End a live class
 */
export const endLiveClass = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { recording_url } = req.body;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const liveClass = await liveClassesService.endLiveClass(
      scheduleId,
      teacherId,
      recording_url
    );
    
    res.json({
      success: true,
      data: liveClass,
      message: 'Live class ended'
    });
  } catch (error: any) {
    console.error('Error ending class:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end class'
    });
  }
};

/**
 * Join live class (record attendance)
 */
export const joinLiveClass = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get the course_id from the live session/schedule
    const { data: session } = await supabase
      .from('live_sessions')
      .select('course_id')
      .eq('id', scheduleId)
      .single();

    // Also check live_class_schedules if live_sessions didn't match
    let courseId = session?.course_id;
    if (!courseId) {
      const { data: schedule } = await supabase
        .from('live_class_schedules')
        .select('course_id')
        .eq('id', scheduleId)
        .single();
      courseId = schedule?.course_id;
    }

    if (!courseId) {
      return res.status(404).json({ error: 'Live session not found' });
    }

    // Verify the student is enrolled in the course
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', profile.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!enrollment) {
      return res.status(403).json({ 
        error: 'Access denied. Only enrolled students can join this meeting.' 
      });
    }
    
    const result = await liveClassesService.recordAttendance(scheduleId, studentId);
    
    res.json({
      success: true,
      already_joined: result.already_attended,
      message: result.already_attended ? 'Already joined' : 'Joined successfully'
    });
  } catch (error: any) {
    console.error('Error joining class:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join class'
    });
  }
};

/**
 * Get class attendance report
 */
export const getClassAttendance = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    
    const report = await liveClassesService.getClassAttendance(scheduleId);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch attendance'
    });
  }
};

// ============================================
// CALENDAR ENDPOINTS
// ============================================

/**
 * Get classes for calendar view
 */
export const getCalendarClasses = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const role = req.auth?.role as 'student' | 'teacher';
    const { year, month } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const classes = await liveClassesService.getCalendarClasses(
      userId,
      role || 'student',
      year ? parseInt(year as string) : currentYear,
      month ? parseInt(month as string) : currentMonth
    );
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching calendar classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch calendar classes'
    });
  }
};
