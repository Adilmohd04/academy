/**
 * Course Controller
 * 
 * Handles HTTP requests for course management
 */

import { Request, Response, NextFunction } from 'express';
import * as courseService from '../services/courseService';
import { AuthRequest } from '../middleware/clerkAuth';

/**
 * Create a new course (Teacher only)
 * POST /api/courses
 */
export const createCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, price, duration_weeks, thumbnail_url } = req.body;
    const userId = req.auth?.userId;
    const userName = req.auth?.email?.split('@')[0] || 'Unknown Teacher';

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const course = await courseService.createCourse({
      title,
      description,
      teacher_id: userId,
      teacher_name: userName,
      price: price || 0,
      duration_weeks: duration_weeks || 4,
      thumbnail_url,
      status: 'draft',
    });

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
 * Get all courses
 * GET /api/courses
 */
export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, teacher_id } = req.query;

    const courses = await courseService.getAllCourses({
      status: status as string,
      teacher_id: teacher_id as string,
    });

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

    res.json({
      success: true,
      data: course,
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
  req: AuthRequest,
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

    // Check if course exists and belongs to teacher
    const course = await courseService.getCourseById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.teacher_id !== userId) {
      res.status(403).json({ error: 'You can only update your own courses' });
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
  req: AuthRequest,
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

    // Check if course exists and belongs to teacher
    const course = await courseService.getCourseById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.teacher_id !== userId) {
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
  req: AuthRequest,
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
