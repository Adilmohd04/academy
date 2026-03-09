/**
 * Course Week Controller
 * 
 * Handles HTTP requests for course week management
 */

import { Request, Response, NextFunction } from 'express';
import * as weekService from '../services/courseWeekService';

/**
 * Get all weeks for a course
 * GET /api/courses/:courseId/weeks
 */
export const getCourseWeeks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;

    const weeks = await weekService.getCourseWeeks(courseId);

    res.json({
      success: true,
      data: weeks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single week by ID
 * GET /api/courses/:courseId/weeks/:weekId
 */
export const getWeekById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { weekId } = req.params;

    const week = await weekService.getWeekById(weekId);

    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    res.json({
      success: true,
      data: week,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new week
 * POST /api/courses/:courseId/weeks
 */
export const createWeek = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { week_number, title, description, unlock_date, order_index } = req.body;

    if (!week_number || !title) {
      res.status(400).json({ error: 'Week number and title are required' });
      return;
    }

    const week = await weekService.createWeek({
      course_id: courseId,
      week_number,
      title,
      description,
      unlock_date,
      order_index,
    });

    res.status(201).json({
      success: true,
      message: 'Week created successfully',
      data: week,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a week
 * PUT /api/courses/:courseId/weeks/:weekId
 */
export const updateWeek = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { weekId } = req.params;
    const { title, description, unlock_date, order_index, status } = req.body;

    const week = await weekService.updateWeek(weekId, {
      title,
      description,
      unlock_date,
      order_index,
      status,
    });

    res.json({
      success: true,
      message: 'Week updated successfully',
      data: week,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a week
 * DELETE /api/courses/:courseId/weeks/:weekId
 */
export const deleteWeek = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { weekId } = req.params;

    await weekService.deleteWeek(weekId);

    res.json({
      success: true,
      message: 'Week deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder weeks
 * POST /api/courses/:courseId/weeks/reorder
 */
export const reorderWeeks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { weekOrders } = req.body;

    if (!Array.isArray(weekOrders)) {
      res.status(400).json({ error: 'weekOrders must be an array' });
      return;
    }

    await weekService.reorderWeeks(weekOrders);

    res.json({
      success: true,
      message: 'Weeks reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};
