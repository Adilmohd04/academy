/**
 * Notification Center Controller
 * 
 * Handles notification management for all users:
 * - Fetch notifications
 * - Mark as read/unread
 * - Archive/delete notifications
 * - Get unread count
 * - Manage preferences
 */

import { Request, Response } from 'express';
import * as notificationService from '../../shared/services/notificationService';

/**
 * GET /api/notifications
 * Get user's notifications with filtering
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, category, is_read, is_archived, limit, offset } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, {
      type: type as any,
      category: category as any,
      is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
      is_archived: is_archived === 'true' ? true : is_archived === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({ success: true, notifications, count: notifications.length });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await notificationService.getUnreadCount(userId);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await notificationService.getNotificationStats(userId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
};

/**
 * PATCH /api/notifications/mark-read
 * Mark notification(s) as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notification_ids } = req.body;
    const count = await notificationService.markAsRead(userId, notification_ids);

    res.json({ success: true, message: 'Notifications marked as read', count });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

/**
 * PATCH /api/notifications/mark-unread
 * Mark notification(s) as unread
 */
export const markAsUnread = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notification_ids } = req.body;
    
    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({ error: 'notification_ids array is required' });
    }

    const count = await notificationService.markAsUnread(userId, notification_ids);

    res.json({ success: true, message: 'Notifications marked as unread', count });
  } catch (error) {
    console.error('Error marking notifications as unread:', error);
    res.status(500).json({ error: 'Failed to mark notifications as unread' });
  }
};

/**
 * PATCH /api/notifications/archive
 * Archive notification(s)
 */
export const archiveNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notification_ids } = req.body;
    
    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({ error: 'notification_ids array is required' });
    }

    const count = await notificationService.archiveNotifications(userId, notification_ids);

    res.json({ success: true, message: 'Notifications archived', count });
  } catch (error) {
    console.error('Error archiving notifications:', error);
    res.status(500).json({ error: 'Failed to archive notifications' });
  }
};

/**
 * DELETE /api/notifications
 * Delete notification(s)
 */
export const deleteNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notification_ids } = req.body;
    
    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({ error: 'notification_ids array is required' });
    }

    const count = await notificationService.deleteNotifications(userId, notification_ids);

    res.json({ success: true, message: 'Notifications deleted', count });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
};

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await notificationService.getUserPreferences(userId);
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

/**
 * PATCH /api/notifications/preferences
 * Update user's notification preferences
 */
export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await notificationService.updateUserPreferences(userId, req.body);
    res.json({ success: true, preferences, message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

/**
 * POST /api/notifications
 * Create a new notification (admin/system only)
 */
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { user_id, type, category, title, message, link, icon, related_id, related_type, expires_at } = req.body;

    if (!user_id || !type || !category || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const notification = await notificationService.createNotification({
      user_id,
      type,
      category,
      title,
      message,
      link,
      icon,
      related_id,
      related_type,
      expires_at: expires_at ? new Date(expires_at) : undefined,
    });

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

/**
 * POST /api/notifications/bulk
 * Create bulk notifications (admin/system only)
 */
export const createBulkNotifications = async (req: Request, res: Response) => {
  try {
    const { user_ids, type, category, title, message, link, icon, related_id, related_type, expires_at } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || !type || !category || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const count = await notificationService.createBulkNotifications(user_ids, {
      type,
      category,
      title,
      message,
      link,
      icon,
      related_id,
      related_type,
      expires_at: expires_at ? new Date(expires_at) : undefined,
    });

    res.status(201).json({ success: true, count, message: `${count} notifications created` });
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    res.status(500).json({ error: 'Failed to create bulk notifications' });
  }
};
