/**
 * Leaderboard Controller
 * 
 * Handles API endpoints for leaderboard functionality
 */

import { Request, Response } from 'express';
import * as leaderboardService from '../services/leaderboardService';

/**
 * Get weekly leaderboard
 */
export const getWeeklyLeaderboard = async (req: Request, res: Response) => {
  try {
    const { courseId, weekId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const leaderboard = await leaderboardService.getWeeklyLeaderboard(courseId, weekId, limit);
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly leaderboard'
    });
  }
};

/**
 * Get weekly top 5 (for live class display)
 */
export const getWeeklyTop5 = async (req: Request, res: Response) => {
  try {
    const { courseId, weekId } = req.params;
    
    const top5 = await leaderboardService.getWeeklyTop5(courseId, weekId);
    
    res.json({
      success: true,
      data: top5
    });
  } catch (error) {
    console.error('Error fetching weekly top 5:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly top 5'
    });
  }
};

/**
 * Get course leaderboard (overall)
 */
export const getCourseLeaderboard = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const leaderboard = await leaderboardService.getCourseLeaderboard(courseId, limit);
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching course leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course leaderboard'
    });
  }
};

/**
 * Get course top 5
 */
export const getCourseTop5 = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const top5 = await leaderboardService.getCourseTop5(courseId);
    
    res.json({
      success: true,
      data: top5
    });
  } catch (error) {
    console.error('Error fetching course top 5:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course top 5'
    });
  }
};

/**
 * Get student's rank in weekly leaderboard
 */
export const getStudentWeeklyRank = async (req: Request, res: Response) => {
  try {
    const { courseId, weekId } = req.params;
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const rank = await leaderboardService.getStudentWeeklyRank(courseId, weekId, studentId);
    
    res.json({
      success: true,
      data: rank
    });
  } catch (error) {
    console.error('Error fetching student weekly rank:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student weekly rank'
    });
  }
};

/**
 * Get student's rank in course leaderboard
 */
export const getStudentCourseRank = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const rank = await leaderboardService.getStudentCourseRank(courseId, studentId);
    
    res.json({
      success: true,
      data: rank
    });
  } catch (error) {
    console.error('Error fetching student course rank:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student course rank'
    });
  }
};

/**
 * Refresh weekly leaderboard (teacher/admin)
 */
export const refreshWeeklyLeaderboard = async (req: Request, res: Response) => {
  try {
    const { courseId, weekId } = req.params;
    
    await leaderboardService.updateWeeklyLeaderboard(courseId, weekId);
    
    res.json({
      success: true,
      message: 'Weekly leaderboard updated'
    });
  } catch (error) {
    console.error('Error refreshing weekly leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh weekly leaderboard'
    });
  }
};

/**
 * Refresh course leaderboard (teacher/admin)
 */
export const refreshCourseLeaderboard = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    await leaderboardService.updateCourseLeaderboard(courseId);
    
    res.json({
      success: true,
      message: 'Course leaderboard updated'
    });
  } catch (error) {
    console.error('Error refreshing course leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh course leaderboard'
    });
  }
};

/**
 * Get leaderboard summary (for dashboard)
 */
export const getLeaderboardSummary = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const summary = await leaderboardService.getLeaderboardSummary(courseId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching leaderboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard summary'
    });
  }
};

/**
 * Record student joining live class
 */
export const joinLiveClass = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await leaderboardService.recordAttendance(scheduleId, studentId, true);
    
    res.json({
      success: true,
      message: 'Attendance recorded'
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record attendance'
    });
  }
};

/**
 * Record student leaving live class
 */
export const leaveLiveClass = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await leaderboardService.recordLeaveTime(scheduleId, studentId);
    
    res.json({
      success: true,
      message: 'Leave time recorded'
    });
  } catch (error) {
    console.error('Error recording leave time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record leave time'
    });
  }
};
