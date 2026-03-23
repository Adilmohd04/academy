# Phase 7: In-App Notification Center

**Status:** ✅ Complete  
**Time Estimate:** 7 hours  
**Actual Time:** ~5 hours  
**Dependencies:** All previous phases

## Overview

Comprehensive in-app notification system that centralizes all user activity notifications. Provides real-time updates for enrollments, content releases, grades, assignments, discussions, and system events.

**Key Features:**
- ✅ 16 notification types supported
- ✅ User preference management (enable/disable by type)
- ✅ Read/unread status tracking
- ✅ Archival system
- ✅ Notification statistics and analytics
- ✅ Bulk notification creation
- ✅ Auto-cleanup of old notifications
- ✅ Notification templates

---

## Architecture

### Database Schema

Three main tables power the notification system:

#### 1. user_notifications
```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL, -- Clerk user ID
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'enrollment', 'content', 'resource', 'live_session', 'recording',
    'quiz', 'assignment', 'grade', 'certificate', 'announcement',
    'discussion', 'mention', 'payment', 'deadline', 'reminder', 'system'
  )),
  category VARCHAR(50) NOT NULL CHECK (category IN 
    ('success', 'info', 'warning', 'error', 'activity')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to related resource
  icon VARCHAR(50), -- Icon identifier
  related_id UUID, -- ID of related resource
  related_type VARCHAR(50), -- Type of related resource
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- Optional expiration
);
```

#### 2. notification_preferences
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  -- Toggle for each notification type
  enable_enrollment_notifications BOOLEAN DEFAULT TRUE,
  enable_content_notifications BOOLEAN DEFAULT TRUE,
  enable_resource_notifications BOOLEAN DEFAULT TRUE,
  enable_live_session_notifications BOOLEAN DEFAULT TRUE,
  enable_recording_notifications BOOLEAN DEFAULT TRUE,
  enable_quiz_notifications BOOLEAN DEFAULT TRUE,
  enable_assignment_notifications BOOLEAN DEFAULT TRUE,
  enable_grade_notifications BOOLEAN DEFAULT TRUE,
  enable_certificate_notifications BOOLEAN DEFAULT TRUE,
  enable_announcement_notifications BOOLEAN DEFAULT TRUE,
  enable_discussion_notifications BOOLEAN DEFAULT TRUE,
  enable_mention_notifications BOOLEAN DEFAULT TRUE,
  enable_payment_notifications BOOLEAN DEFAULT TRUE,
  enable_deadline_notifications BOOLEAN DEFAULT TRUE,
  enable_reminder_notifications BOOLEAN DEFAULT TRUE,
  enable_system_notifications BOOLEAN DEFAULT TRUE,
  
  -- Email settings (future)
  enable_email_notifications BOOLEAN DEFAULT TRUE,
  email_frequency VARCHAR(20) DEFAULT 'immediate',
  
  -- Push settings (future)
  enable_push_notifications BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. notification_templates
```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  template_key VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title_template VARCHAR(255) NOT NULL,
  message_template TEXT NOT NULL,
  icon VARCHAR(50),
  default_link_pattern TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

**Indexes:**
- `idx_notifications_user` - Fast user notification queries
- `idx_notifications_unread` - Quick unread count
- `idx_notifications_type` - Filter by type
- `idx_notifications_expires` - Cleanup expired notifications

---

## API Endpoints

All endpoints require authentication.

### 1. Get Notifications

```http
GET /api/notification-center?type=grade&is_read=false&limit=20
```

**Query Parameters:**
- `type` (optional): Filter by notification type
- `category` (optional): Filter by category (success, info, warning, error, activity)
- `is_read` (optional): true | false
- `is_archived` (optional): true | false
- `limit` (optional): Number of notifications (default: 50)
- `offset` (optional): Pagination offset

**Response (200 OK):**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "user_id": "clerk_user_id",
      "type": "grade",
      "category": "success",
      "title": "Grade released",
      "message": "Your grade for Quiz 1 is now available.",
      "link": "/courses/abc123/grades",
      "icon": "star",
      "related_id": "quiz-uuid",
      "related_type": "quiz",
      "is_read": false,
      "is_archived": false,
      "created_at": "2024-01-15T10:00:00Z",
      "expires_at": null
    }
  ],
  "count": 15
}
```

---

### 2. Get Unread Count

```http
GET /api/notification-center/unread-count
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5
}
```

**Use Case:** Display badge on notification bell icon.

---

### 3. Get Statistics

```http
GET /api/notification-center/stats
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total_notifications": 127,
    "unread_count": 5,
    "archived_count": 12,
    "today_count": 3,
    "week_count": 18,
    "last_notification_at": "2024-01-15T14:30:00Z"
  }
}
```

---

### 4. Mark as Read

```http
PATCH /api/notification-center/mark-read
Content-Type: application/json

{
  "notification_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notifications marked as read",
  "count": 3
}
```

**Mark All as Read:**
```json
{
  "notification_ids": []
}
```
Empty array marks ALL unread notifications as read.

---

### 5. Mark as Unread

```http
PATCH /api/notification-center/mark-unread
Content-Type: application/json

{
  "notification_ids": ["uuid1", "uuid2"]
}
```

---

### 6. Archive Notifications

```http
PATCH /api/notification-center/archive
Content-Type: application/json

{
  "notification_ids": ["uuid1", "uuid2"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notifications archived",
  "count": 2
}
```

---

### 7. Delete Notifications

```http
DELETE /api/notification-center
Content-Type: application/json

{
  "notification_ids": ["uuid1", "uuid2"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notifications deleted",
  "count": 2
}
```

---

### 8. Get Preferences

```http
GET /api/notification-center/preferences
```

**Response (200 OK):**
```json
{
  "success": true,
  "preferences": {
    "id": "uuid",
    "user_id": "clerk_user_id",
    "enable_enrollment_notifications": true,
    "enable_content_notifications": true,
    "enable_resource_notifications": true,
    "enable_live_session_notifications": true,
    "enable_recording_notifications": true,
    "enable_quiz_notifications": true,
    "enable_assignment_notifications": true,
    "enable_grade_notifications": true,
    "enable_certificate_notifications": true,
    "enable_announcement_notifications": true,
    "enable_discussion_notifications": true,
    "enable_mention_notifications": true,
    "enable_payment_notifications": true,
    "enable_deadline_notifications": true,
    "enable_reminder_notifications": true,
    "enable_system_notifications": true,
    "enable_email_notifications": true,
    "email_frequency": "immediate",
    "enable_push_notifications": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### 9. Update Preferences

```http
PATCH /api/notification-center/preferences
Content-Type: application/json

{
  "enable_grade_notifications": false,
  "enable_quiz_notifications": false,
  "email_frequency": "daily"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "preferences": { /* updated preferences */ },
  "message": "Preferences updated successfully"
}
```

---

### 10. Create Notification (Admin/System)

```http
POST /api/notification-center
Content-Type: application/json

{
  "user_id": "clerk_user_id",
  "type": "announcement",
  "category": "info",
  "title": "System Maintenance",
  "message": "The system will be down for maintenance on Jan 20.",
  "link": "/announcements/maintenance",
  "icon": "alert-circle",
  "expires_at": "2024-01-21T00:00:00Z"
}
```

---

### 11. Create Bulk Notifications (Admin/System)

```http
POST /api/notification-center/bulk
Content-Type: application/json

{
  "user_ids": ["user1", "user2", "user3"],
  "type": "announcement",
  "category": "info",
  "title": "New Feature Released",
  "message": "Check out the new course resource management system!",
  "link": "/features/resources",
  "icon": "gift"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "count": 3,
  "message": "3 notifications created"
}
```

---

## Service Layer Functions

Location: `backend/src/modules/shared/services/notificationService.ts`

### Core Functions

```typescript
// CRUD Operations
createNotification(data: CreateNotificationInput): Promise<UserNotification>
createBulkNotifications(user_ids: string[], data): Promise<number>
getUserNotifications(userId: string, filter: NotificationFilter): Promise<UserNotification[]>
getUnreadCount(userId: string): Promise<number>
getNotificationStats(userId: string): Promise<NotificationStats>

// Status Management
markAsRead(userId: string, notificationIds?: string[]): Promise<number>
markAsUnread(userId: string, notificationIds: string[]): Promise<number>
archiveNotifications(userId: string, notificationIds: string[]): Promise<number>
deleteNotifications(userId: string, notificationIds: string[]): Promise<number>

// Preferences
getUserPreferences(userId: string): Promise<NotificationPreferences>
updateUserPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences>

// Cleanup
cleanupExpiredNotifications(): Promise<number>
cleanupOldReadNotifications(): Promise<number> // 90+ days old
```

---

## Notification Types & Use Cases

### 1. enrollment
**When:** Student enrolls in a course  
**Example:** "Successfully enrolled in Introduction to React"

### 2. content
**When:** New week/lesson added  
**Example:** "New content in React Course: Week 3 - State Management"

### 3. resource
**When:** Teacher uploads resource  
**Example:** "New resource in React Course: Lecture 5 Slides.pdf"

### 4. live_session
**When:** Live session scheduled  
**Example:** "Live session scheduled: React Hooks on Jan 20, 3:00 PM"

### 5. recording
**When:** Recording becomes available  
**Example:** "Recording available: React Hooks Session"

### 6. quiz
**When:** Quiz published  
**Example:** "New quiz available: React Basics Quiz"

### 7. assignment
**When:** Assignment published  
**Example:** "New assignment: Build a Todo App"

### 8. grade
**When:** Grade released  
**Example:** "Your grade for Quiz 1 is now available"

### 9. certificate
**When:** Certificate issued  
**Example:** "Congratulations! Your certificate for React Course is ready"

### 10. announcement
**When:** Teacher posts announcement  
**Example:** "Important: Class rescheduled to Jan 22"

### 11. discussion
**When:** Someone replies to your discussion  
**Example:** "John replied to your discussion: Best React Hooks"

### 12. mention
**When:** You're mentioned in discussion  
**Example:** "@Ahmed mentioned you in React Performance Tips"

### 13. payment
**When:** Payment successful  
**Example:** "Payment successful for React Advanced Course"

### 14. deadline
**When:** Assignment/quiz deadline approaching  
**Example:** "Assignment 'Todo App' is due in 24 hours"

### 15. reminder
**When:** System reminder  
**Example:** "Don't forget to complete Week 3 lessons"

### 16. system
**When:** System-wide notification  
**Example:** "System maintenance scheduled for Jan 20"

---

## Frontend Integration

### Notification Bell Component

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    fetchRecentNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchRecentNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    const res = await fetch('/api/notification-center/unread-count', {
      headers: { Authorization: `Bearer ${await getToken()}` }
    });
    const data = await res.json();
    setUnreadCount(data.count);
  };

  const fetchRecentNotifications = async () => {
    const res = await fetch('/api/notification-center?limit=5&is_read=false', {
      headers: { Authorization: `Bearer ${await getToken()}` }
    });
    const data = await res.json();
    setNotifications(data.notifications);
  };

  const markAllAsRead = async () => {
    await fetch('/api/notification-center/mark-read', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getToken()}`
      },
      body: JSON.stringify({ notification_ids: [] })
    });
    
    setUnreadCount(0);
    fetchRecentNotifications();
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                />
              ))
            )}
          </div>

          <div className="p-4 border-t text-center">
            <a href="/notifications" className="text-sm text-blue-600 hover:underline">
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification }) {
  return (
    <a 
      href={notification.link || '/notifications'}
      className="block p-4 hover:bg-gray-50 border-b"
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 ${
          notification.category === 'success' ? 'bg-green-500' :
          notification.category === 'warning' ? 'bg-yellow-500' :
          notification.category === 'error' ? 'bg-red-500' :
          'bg-blue-500'
        }`} />
        <div className="flex-1">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-2">
            {formatTimeAgo(notification.created_at)}
          </p>
        </div>
      </div>
    </a>
  );
}
```

---

## Automated Cleanup

### Expired Notifications
Automatically deleted when `expires_at < NOW()`.

### Old Read Notifications
Automatically deleted after 90 days when marked as read.

**Run cleanup via cron job:**
```typescript
// backend/src/jobs/notificationCleanup.ts
import cron from 'node-cron';
import * as notificationService from '../modules/shared/services/notificationService';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Running notification cleanup...');
  
  const expiredCount = await notificationService.cleanupExpiredNotifications();
  const oldCount = await notificationService.cleanupOldReadNotifications();
  
  console.log(`✅ Cleaned up ${expiredCount} expired and ${oldCount} old notifications`);
});
```

---

## Summary

**Phase 7 Complete:**

✅ **Database Schema:** 3 tables + 1 view  
✅ **Service Layer:** notificationService.ts (500+ lines)  
✅ **Controller:** notificationController.ts (300+ lines)  
✅ **Routes:** 11 API endpoints  
✅ **Migration:** 003_create_notification_system.sql  
✅ **Documentation:** This comprehensive guide  

**Total:** ~1000 lines of code + database schema

**Next:** Phase 8 - Course Archival System

