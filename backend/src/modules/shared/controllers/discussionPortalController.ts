/**
 * Discussion Portal Controller
 * 
 * API endpoints for course discussions/queries
 */

import { Request, Response } from 'express';
import * as discussionService from '../services/discussionPortalService';

/**
 * Create a new discussion/query
 */
export const createDiscussion = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userRole = (req.auth as any)?.sessionClaims?.metadata?.role || 'student';
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const data = {
      ...req.body,
      author_id: userId,
      author_role: userRole
    };
    
    const discussion = await discussionService.createDiscussion(data);
    
    res.status(201).json({
      success: true,
      data: discussion,
      message: 'Discussion created successfully'
    });
  } catch (error: any) {
    console.error('Error creating discussion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create discussion'
    });
  }
};

/**
 * Get discussions for a course
 */
export const getCourseDiscussions = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { weekId, lessonId, status, type, limit, offset } = req.query;
    
    const result = await discussionService.getCourseDiscussions(courseId, {
      weekId: weekId as string,
      lessonId: lessonId as string,
      status: status as string,
      type: type as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    
    res.json({
      success: true,
      data: result.discussions,
      total: result.total
    });
  } catch (error: any) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch discussions'
    });
  }
};

/**
 * Get a single discussion with replies
 */
export const getDiscussion = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    
    const result = await discussionService.getDiscussionWithReplies(discussionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch discussion'
    });
  }
};

/**
 * Create a reply to a discussion
 */
export const createReply = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userRole = (req.auth as any)?.sessionClaims?.metadata?.role || 'student';
    const { discussionId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const data = {
      discussion_id: discussionId,
      parent_reply_id: req.body.parent_reply_id,
      author_id: userId,
      author_role: userRole,
      content: req.body.content
    };
    
    const reply = await discussionService.createReply(data);
    
    res.status(201).json({
      success: true,
      data: reply,
      message: 'Reply posted successfully'
    });
  } catch (error: any) {
    console.error('Error creating reply:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create reply'
    });
  }
};

/**
 * Update a discussion
 */
export const updateDiscussion = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { discussionId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const discussion = await discussionService.updateDiscussion(
      discussionId,
      userId,
      req.body
    );
    
    res.json({
      success: true,
      data: discussion,
      message: 'Discussion updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating discussion:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update discussion'
    });
  }
};

/**
 * Update a reply
 */
export const updateReply = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { replyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const reply = await discussionService.updateReply(
      replyId,
      userId,
      req.body.content
    );
    
    res.json({
      success: true,
      data: reply,
      message: 'Reply updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating reply:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update reply'
    });
  }
};

/**
 * Delete a discussion
 */
export const deleteDiscussion = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userRole = (req.auth as any)?.sessionClaims?.metadata?.role;
    const { discussionId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await discussionService.deleteDiscussion(
      discussionId,
      userId,
      userRole === 'admin'
    );
    
    res.json({
      success: true,
      message: 'Discussion deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting discussion:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete discussion'
    });
  }
};

/**
 * Delete a reply
 */
export const deleteReply = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userRole = (req.auth as any)?.sessionClaims?.metadata?.role;
    const { replyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await discussionService.deleteReply(
      replyId,
      userId,
      userRole === 'admin'
    );
    
    res.json({
      success: true,
      message: 'Reply deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting reply:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete reply'
    });
  }
};

/**
 * Upvote a discussion
 */
export const upvoteDiscussion = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { discussionId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await discussionService.upvoteDiscussion(discussionId, userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error upvoting discussion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upvote'
    });
  }
};

/**
 * Upvote a reply
 */
export const upvoteReply = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { replyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await discussionService.upvoteReply(replyId, userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error upvoting reply:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upvote'
    });
  }
};

/**
 * Mark a reply as accepted answer
 */
export const markAcceptedAnswer = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userRole = (req.auth as any)?.sessionClaims?.metadata?.role;
    const { discussionId, replyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await discussionService.markAcceptedAnswer(
      replyId,
      discussionId,
      userId,
      userRole === 'teacher' || userRole === 'admin'
    );
    
    res.json({
      success: true,
      message: 'Answer marked as accepted'
    });
  } catch (error: any) {
    console.error('Error marking accepted answer:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to mark accepted answer'
    });
  }
};

/**
 * Pin/unpin a discussion (teacher/admin only)
 */
export const togglePin = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    const { is_pinned } = req.body;
    
    await discussionService.togglePinDiscussion(discussionId, is_pinned);
    
    res.json({
      success: true,
      message: is_pinned ? 'Discussion pinned' : 'Discussion unpinned'
    });
  } catch (error: any) {
    console.error('Error toggling pin:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle pin'
    });
  }
};

/**
 * Get user's notifications
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { unreadOnly } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const notifications = await discussionService.getUserNotifications(
      userId,
      unreadOnly === 'true'
    );
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notifications'
    });
  }
};

/**
 * Mark notifications as read
 */
export const markNotificationsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { notification_ids } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await discussionService.markNotificationsRead(userId, notification_ids);
    
    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error: any) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark notifications read'
    });
  }
};
