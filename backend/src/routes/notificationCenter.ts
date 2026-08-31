/**
 * Notification Center Routes
 * 
 * API endpoints for in-app notification management
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as notificationController from '../modules/shared/controllers/notificationController';

const router = express.Router();

const authRequired = [requireAuth];

// ==========================================
// NOTIFICATION ENDPOINTS
// ==========================================

/**
 * GET /api/notification-center
 * Get user's notifications with filtering
 * Query params: type, category, is_read, is_archived, limit, offset
 */
router.get('/', ...authRequired, notificationController.getNotifications);

/**
 * GET /api/notification-center/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', ...authRequired, notificationController.getUnreadCount);

/**
 * GET /api/notification-center/stats
 * Get notification statistics
 */
router.get('/stats', ...authRequired, notificationController.getStats);

/**
 * PATCH /api/notification-center/mark-read
 * Mark notification(s) as read
 * Body: { notification_ids?: string[] } (empty array = mark all as read)
 */
router.patch('/mark-read', ...authRequired, notificationController.markAsRead);

/**
 * PATCH /api/notification-center/mark-unread
 * Mark notification(s) as unread
 * Body: { notification_ids: string[] }
 */
router.patch('/mark-unread', ...authRequired, notificationController.markAsUnread);

/**
 * PATCH /api/notification-center/archive
 * Archive notification(s)
 * Body: { notification_ids: string[] }
 */
router.patch('/archive', ...authRequired, notificationController.archiveNotifications);

/**
 * DELETE /api/notification-center
 * Delete notification(s)
 * Body: { notification_ids: string[] }
 */
router.delete('/', ...authRequired, notificationController.deleteNotifications);

/**
 * GET /api/notification-center/preferences
 * Get user's notification preferences
 */
router.get('/preferences', ...authRequired, notificationController.getPreferences);

/**
 * PATCH /api/notification-center/preferences
 * Update user's notification preferences
 * Body: Partial<NotificationPreferences>
 */
router.patch('/preferences', ...authRequired, notificationController.updatePreferences);

/**
 * POST /api/notification-center
 * Create a new notification (admin/system only)
 * Body: CreateNotificationInput
 */
router.post('/', ...authRequired, requireRole(['admin']), notificationController.createNotification);

/**
 * POST /api/notification-center/bulk
 * Create bulk notifications (admin/system only)
 * Body: { user_ids: string[], ...CreateNotificationInput }
 */
router.post('/bulk', ...authRequired, requireRole(['admin']), notificationController.createBulkNotifications);

export default router;
