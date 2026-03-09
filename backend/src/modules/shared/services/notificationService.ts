/**
 * Notification Center Service
 * 
 * Comprehensive notification management system for:
 * - Creating notifications
 * - Fetching user notifications
 * - Managing read/unread status
 * - User preferences
 * - Notification stats
 */

import pool from '../../../config/database';

// ============================================
// TYPES & INTERFACES
// ============================================

export type NotificationType = 
  | 'enrollment' | 'content' | 'resource' | 'live_session' | 'recording'
  | 'quiz' | 'assignment' | 'grade' | 'certificate' | 'announcement'
  | 'discussion' | 'mention' | 'payment' | 'deadline' | 'reminder' | 'system';

export type NotificationCategory = 'success' | 'info' | 'warning' | 'error' | 'activity';

export interface UserNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  link: string | null;
  icon: string | null;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  is_archived: boolean;
  created_at: Date;
  expires_at: Date | null;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string;
  icon?: string;
  related_id?: string;
  related_type?: string;
  expires_at?: Date;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  enable_enrollment_notifications: boolean;
  enable_content_notifications: boolean;
  enable_resource_notifications: boolean;
  enable_live_session_notifications: boolean;
  enable_recording_notifications: boolean;
  enable_quiz_notifications: boolean;
  enable_assignment_notifications: boolean;
  enable_grade_notifications: boolean;
  enable_certificate_notifications: boolean;
  enable_announcement_notifications: boolean;
  enable_discussion_notifications: boolean;
  enable_mention_notifications: boolean;
  enable_payment_notifications: boolean;
  enable_deadline_notifications: boolean;
  enable_reminder_notifications: boolean;
  enable_system_notifications: boolean;
  enable_email_notifications: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  enable_push_notifications: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationStats {
  total_notifications: number;
  unread_count: number;
  archived_count: number;
  today_count: number;
  week_count: number;
  last_notification_at: Date | null;
}

export interface NotificationFilter {
  type?: NotificationType;
  category?: NotificationCategory;
  is_read?: boolean;
  is_archived?: boolean;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
}

// ============================================
// NOTIFICATION CRUD
// ============================================

/**
 * Create a new notification
 */
export const createNotification = async (data: CreateNotificationInput): Promise<UserNotification> => {
  const client = await pool.connect();
  try {
    // Check user preferences first
    const prefResult = await client.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [data.user_id]
    );

    // If preferences exist, check if this type is enabled
    if (prefResult.rows.length > 0) {
      const prefs = prefResult.rows[0];
      const prefKey = `enable_${data.type}_notifications`;
      if (prefs[prefKey] === false) {
        console.log(`Notification type ${data.type} disabled for user ${data.user_id}`);
        return null as any; // User has disabled this notification type
      }
    }

    const result = await client.query(
      `INSERT INTO user_notifications (
        user_id, type, category, title, message, link, icon,
        related_id, related_type, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.user_id,
        data.type,
        data.category,
        data.title,
        data.message,
        data.link || null,
        data.icon || null,
        data.related_id || null,
        data.related_type || null,
        data.expires_at || null,
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Create bulk notifications (e.g., to all enrolled students)
 */
export const createBulkNotifications = async (
  user_ids: string[],
  notificationData: Omit<CreateNotificationInput, 'user_id'>
): Promise<number> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let createdCount = 0;
    for (const user_id of user_ids) {
      const notification = await createNotification({ ...notificationData, user_id });
      if (notification) createdCount++;
    }

    await client.query('COMMIT');
    return createdCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get notifications for a user with filtering
 */
export const getUserNotifications = async (
  userId: string,
  filter: NotificationFilter = {}
): Promise<UserNotification[]> => {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM user_notifications WHERE user_id = $1';
    const params: any[] = [userId];
    let paramCount = 2;

    // Apply filters
    if (filter.type !== undefined) {
      query += ` AND type = $${paramCount}`;
      params.push(filter.type);
      paramCount++;
    }

    if (filter.category !== undefined) {
      query += ` AND category = $${paramCount}`;
      params.push(filter.category);
      paramCount++;
    }

    if (filter.is_read !== undefined) {
      query += ` AND is_read = $${paramCount}`;
      params.push(filter.is_read);
      paramCount++;
    }

    if (filter.is_archived !== undefined) {
      query += ` AND is_archived = $${paramCount}`;
      params.push(filter.is_archived);
      paramCount++;
    }

    if (filter.date_from) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(filter.date_from);
      paramCount++;
    }

    if (filter.date_to) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(filter.date_to);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filter.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filter.limit);
      paramCount++;
    }

    if (filter.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filter.offset);
      paramCount++;
    }

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM user_notifications 
       WHERE user_id = $1 AND is_read = FALSE AND is_archived = FALSE`,
      [userId]
    );

    return parseInt(result.rows[0].count) || 0;
  } finally {
    client.release();
  }
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (userId: string): Promise<NotificationStats> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM notification_stats WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        total_notifications: 0,
        unread_count: 0,
        archived_count: 0,
        today_count: 0,
        week_count: 0,
        last_notification_at: null,
      };
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Mark notification(s) as read
 */
export const markAsRead = async (
  userId: string,
  notificationIds?: string[]
): Promise<number> => {
  const client = await pool.connect();
  try {
    let result;

    if (notificationIds && notificationIds.length > 0) {
      result = await client.query(
        `UPDATE user_notifications 
         SET is_read = TRUE 
         WHERE user_id = $1 AND id = ANY($2::uuid[])
         RETURNING id`,
        [userId, notificationIds]
      );
    } else {
      result = await client.query(
        `UPDATE user_notifications 
         SET is_read = TRUE 
         WHERE user_id = $1 AND is_read = FALSE
         RETURNING id`,
        [userId]
      );
    }

    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
};

/**
 * Mark notification(s) as unread
 */
export const markAsUnread = async (
  userId: string,
  notificationIds: string[]
): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE user_notifications 
       SET is_read = FALSE 
       WHERE user_id = $1 AND id = ANY($2::uuid[])
       RETURNING id`,
      [userId, notificationIds]
    );

    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
};

/**
 * Archive notification(s)
 */
export const archiveNotifications = async (
  userId: string,
  notificationIds: string[]
): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE user_notifications 
       SET is_archived = TRUE 
       WHERE user_id = $1 AND id = ANY($2::uuid[])
       RETURNING id`,
      [userId, notificationIds]
    );

    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
};

/**
 * Delete notification(s)
 */
export const deleteNotifications = async (
  userId: string,
  notificationIds: string[]
): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM user_notifications 
       WHERE user_id = $1 AND id = ANY($2::uuid[])
       RETURNING id`,
      [userId, notificationIds]
    );

    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
};

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * Get user's notification preferences
 */
export const getUserPreferences = async (userId: string): Promise<NotificationPreferences> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      const createResult = await client.query(
        'INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      return createResult.rows[0];
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Update user's notification preferences
 */
export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  const client = await pool.connect();
  try {
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    Object.entries(preferences).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
        updates.push(`${key} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    });

    updates.push(`updated_at = NOW()`);
    params.push(userId);

    const query = `
      UPDATE notification_preferences 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      // Create if doesn't exist
      return await getUserPreferences(userId);
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Cleanup expired notifications
 */
export const cleanupExpiredNotifications = async (): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM user_notifications 
       WHERE expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING id`
    );

    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
};

/**
 * Cleanup old read notifications (90+ days)
 */
export const cleanupOldReadNotifications = async (): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM user_notifications 
       WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '90 days'
       RETURNING id`
    );

    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
};
