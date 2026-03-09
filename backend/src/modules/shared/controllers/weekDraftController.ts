/**
 * Week Draft Mode Controller
 * 
 * API endpoints for Week 0 draft mode functionality
 */

import { Request, Response } from 'express';
import * as weekDraftService from '../services/weekDraftService';

// ============================================
// WEEK DRAFT MANAGEMENT
// ============================================

/**
 * Create a new week draft
 */
export const createWeekDraft = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { week_number, title, description } = req.body;
    
    const week = await weekDraftService.createWeekDraft(courseId, {
      week_number,
      title,
      description
    });
    
    res.status(201).json({
      success: true,
      data: week,
      message: 'Week draft created successfully'
    });
  } catch (error: any) {
    console.error('Error creating week draft:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create week draft'
    });
  }
};

/**
 * Save week draft (manual save)
 */
export const saveWeekDraft = async (req: Request, res: Response) => {
  try {
    const { weekId } = req.params;
    const { title, description } = req.body;
    
    const week = await weekDraftService.saveWeekDraft(weekId, {
      title,
      description
    });
    
    res.json({
      success: true,
      data: week,
      message: 'Draft saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving week draft:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save draft'
    });
  }
};

/**
 * Autosave draft content
 */
export const autosaveDraft = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const teacherId = req.auth?.userId;
    const { draft_content } = req.body;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const draft = await weekDraftService.autosaveDraft(
      entityType as any,
      entityId,
      teacherId,
      draft_content
    );
    
    res.json({
      success: true,
      data: draft,
      message: 'Autosaved'
    });
  } catch (error: any) {
    console.error('Error autosaving:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to autosave'
    });
  }
};

/**
 * Get autosaved draft
 */
export const getAutosavedDraft = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const draft = await weekDraftService.getAutosavedDraft(entityType, entityId, teacherId);
    
    res.json({
      success: true,
      data: draft,
      hasAutosave: !!draft
    });
  } catch (error: any) {
    console.error('Error fetching autosave:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch autosave'
    });
  }
};

/**
 * Discard autosaved draft
 */
export const discardAutosave = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await weekDraftService.discardAutosave(entityType, entityId, teacherId);
    
    res.json({
      success: true,
      message: 'Autosave discarded'
    });
  } catch (error: any) {
    console.error('Error discarding autosave:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to discard autosave'
    });
  }
};

// ============================================
// PUBLISHING
// ============================================

/**
 * Publish a week and all its content
 */
export const publishWeek = async (req: Request, res: Response) => {
  try {
    const { weekId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if ready to publish
    const readiness = await weekDraftService.checkWeekReadyToPublish(weekId);
    
    if (!readiness.ready) {
      return res.status(400).json({
        success: false,
        error: 'Week is not ready to publish',
        issues: readiness.issues
      });
    }
    
    const result = await weekDraftService.publishWeek(weekId, teacherId);
    
    res.json({
      success: true,
      data: result,
      message: 'Week published successfully'
    });
  } catch (error: any) {
    console.error('Error publishing week:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish week'
    });
  }
};

/**
 * Unpublish a week (return to draft)
 */
export const unpublishWeek = async (req: Request, res: Response) => {
  try {
    const { weekId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await weekDraftService.unpublishWeek(weekId, teacherId);
    
    res.json({
      success: true,
      data: result,
      message: 'Week unpublished'
    });
  } catch (error: any) {
    console.error('Error unpublishing week:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unpublish week'
    });
  }
};

/**
 * Publish a single lesson
 */
export const publishLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const lesson = await weekDraftService.publishLesson(lessonId, teacherId);
    
    res.json({
      success: true,
      data: lesson,
      message: 'Lesson published'
    });
  } catch (error: any) {
    console.error('Error publishing lesson:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish lesson'
    });
  }
};

/**
 * Check if week is ready to publish
 */
export const checkReadyToPublish = async (req: Request, res: Response) => {
  try {
    const { weekId } = req.params;
    
    const result = await weekDraftService.checkWeekReadyToPublish(weekId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error checking readiness:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check readiness'
    });
  }
};

// ============================================
// CONTENT RETRIEVAL
// ============================================

/**
 * Get teacher's draft weeks
 */
export const getMyDraftWeeks = async (req: Request, res: Response) => {
  try {
    const teacherId = req.auth?.userId;
    const { courseId } = req.query;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const weeks = await weekDraftService.getTeacherDraftWeeks(
      teacherId,
      courseId as string
    );
    
    res.json({
      success: true,
      data: weeks
    });
  } catch (error: any) {
    console.error('Error fetching draft weeks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch draft weeks'
    });
  }
};

/**
 * Get week with all content for editing
 */
export const getWeekWithContent = async (req: Request, res: Response) => {
  try {
    const { weekId } = req.params;
    
    const data = await weekDraftService.getWeekWithContent(weekId);
    
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching week content:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch week content'
    });
  }
};

/**
 * Get publishing history
 */
export const getPublishHistory = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    
    const history = await weekDraftService.getPublishHistory(entityType, entityId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching publish history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch history'
    });
  }
};

/**
 * Get all teacher's autosaved drafts
 */
export const getMyAutosaves = async (req: Request, res: Response) => {
  try {
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const autosaves = await weekDraftService.getTeacherAutosaves(teacherId);
    
    res.json({
      success: true,
      data: autosaves
    });
  } catch (error: any) {
    console.error('Error fetching autosaves:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch autosaves'
    });
  }
};
