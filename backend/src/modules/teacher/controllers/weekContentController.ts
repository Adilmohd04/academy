/**
 * Week Content Controller
 * 
 * Handles HTTP requests for week content management
 */

import { Request, Response, NextFunction } from 'express';
import * as contentService from '../services/weekContentService';

/**
 * Get all content for a week
 * GET /api/courses/:courseId/weeks/:weekId/content
 */
export const getWeekContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { weekId } = req.params;

    const content = await contentService.getWeekContent(weekId);

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single content item
 * GET /api/courses/:courseId/weeks/:weekId/content/:contentId
 */
export const getContentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contentId } = req.params;

    const content = await contentService.getContentById(contentId);

    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new content
 * POST /api/courses/:courseId/weeks/:weekId/content
 */
export const createContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { weekId } = req.params;
    const { type, title, content_url, duration_minutes, scheduled_at, meet_link, order_index, is_required } = req.body;

    if (!type || !title) {
      res.status(400).json({ error: 'Type and title are required' });
      return;
    }

    const content = await contentService.createContent({
      week_id: weekId,
      type,
      title,
      content_url,
      duration_minutes,
      scheduled_at,
      meet_link,
      order_index,
      is_required,
    });

    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update content
 * PUT /api/courses/:courseId/weeks/:weekId/content/:contentId
 */
export const updateContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contentId } = req.params;
    const { title, content_url, duration_minutes, scheduled_at, meet_link, order_index, is_required } = req.body;

    const content = await contentService.updateContent(contentId, {
      title,
      content_url,
      duration_minutes,
      scheduled_at,
      meet_link,
      order_index,
      is_required,
    });

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete content
 * DELETE /api/courses/:courseId/weeks/:weekId/content/:contentId
 */
export const deleteContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contentId } = req.params;

    await contentService.deleteContent(contentId);

    res.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder content items
 * POST /api/courses/:courseId/weeks/:weekId/content/reorder
 */
export const reorderContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contentOrders } = req.body;

    if (!Array.isArray(contentOrders)) {
      res.status(400).json({ error: 'contentOrders must be an array' });
      return;
    }

    await contentService.reorderContent(contentOrders);

    res.json({
      success: true,
      message: 'Content reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};
