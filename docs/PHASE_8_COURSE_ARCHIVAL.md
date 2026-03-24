# Phase 8: Course Archival System

**Status:** ✅ Complete  
**Time Estimate:** 4 hours  
**Actual Time:** ~3 hours  
**Dependencies:** Phase 1-7

## Overview

Course lifecycle management system that allows teachers and admins to archive courses (soft delete) rather than permanently deleting them. Archived courses preserve all data (enrollments, lessons, resources, grades) for historical reference while removing them from active course lists.

**Key Features:**
- ✅ Soft delete (archive) vs permanent delete
- ✅ Restore archived courses
- ✅ Archive log tracking (who, when, why)
- ✅ Student notifications on archive
- ✅ Archive statistics
- ✅ Teacher and admin access

---

## Architecture

### Database Schema

```sql
CREATE TABLE course_archive_log (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  archived_by TEXT NOT NULL, -- User ID who performed action
  archive_reason TEXT,
  action VARCHAR(50) NOT NULL CHECK (action IN 
    ('archived', 'restored', 'permanently_deleted')),
  performed_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_archive_log_course` - Fast course history lookups
- `idx_archive_log_user` - Track user actions
- `idx_archive_log_action` - Filter by action type

---

## API Endpoints

### Admin Endpoints

#### 1. Archive Course
```http
POST /api/admin/courses/:courseId/archive
Content-Type: application/json

{
  "reason": "Course content outdated",
  "notify_students": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Course archived successfully"
}
```

#### 2. Restore Course
```http
POST /api/admin/courses/:courseId/restore
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Course restored successfully"
}
```

**Note:** Restored courses return to 'draft' status. Teacher must re-publish.

#### 3. Get All Archived Courses
```http
GET /api/admin/courses/archived?limit=50&offset=0
```

**Response (200 OK):**
```json
{
  "success": true,
  "courses": [
    {
      "id": "uuid",
      "title": "Introduction to React (2023)",
      "teacher_id": "teacher_uuid",
      "teacher_name": "John Doe",
      "status": "archived",
      "archived_at": "2024-01-15T10:00:00Z",
      "archived_by": "admin_uuid",
      "archive_reason": "Outdated content",
      "enrolled_count": 45,
      "total_lessons": 24,
      "total_resources": 18
    }
  ],
  "count": 12
}
```

#### 4. Get Archive Details
```http
GET /api/admin/courses/:courseId/archive-details
```

**Response (200 OK):**
```json
{
  "success": true,
  "details": {
    "id": "uuid",
    "title": "React Course 2023",
    "teacher_id": "uuid",
    "status": "archived",
    "archived_by": "admin_uuid",
    "archive_reason": "Content outdated",
    "archived_at": "2024-01-15T10:00:00Z",
    "total_enrollments": 45,
    "total_weeks": 8,
    "total_lessons": 24,
    "total_resources": 18
  }
}
```

#### 5. Permanently Delete Course
```http
DELETE /api/admin/courses/:courseId/permanent
```

**WARNING:** This is irreversible! All course data will be permanently deleted.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Course permanently deleted"
}
```

**Requirements:**
- Course must be archived first
- Only admins can permanently delete
- Cannot be undone

#### 6. Get Archive Statistics
```http
GET /api/admin/archive-statistics
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total_archived": 12,
    "total_affected_students": 450,
    "oldest_archive": "2023-06-01T00:00:00Z",
    "newest_archive": "2024-01-15T10:00:00Z"
  }
}
```

---

### Teacher Endpoints

#### 1. Get My Archived Courses
```http
GET /api/teacher/archived-courses?limit=20&offset=0
```

Returns only the teacher's own archived courses.

#### 2. Archive My Course
```http
POST /api/teacher/courses/:courseId/archive
Content-Type: application/json

{
  "reason": "Replacing with updated version",
  "notify_students": true
}
```

#### 3. Restore My Course
```http
POST /api/teacher/courses/:courseId/restore
```

---

## Service Layer Functions

Location: `backend/src/modules/shared/services/courseArchivalService.ts`

```typescript
// Archive operations
archiveCourse(courseId: string, archivedBy: string, options: ArchiveOptions): Promise<void>
restoreCourse(courseId: string, restoredBy: string): Promise<void>

// Query operations
getArchivedCourses(filters: { teacher_id?, limit?, offset? }): Promise<ArchivedCourse[]>
getCourseArchiveDetails(courseId: string): Promise<any>

// Dangerous operations (admin only)
permanentlyDeleteCourse(courseId: string, deletedBy: string): Promise<void>

// Statistics
getArchiveStatistics(teacherId?: string): Promise<any>
```

---

## Archive vs Permanent Delete

### Archive (Soft Delete)
**What happens:**
- Course status changes to 'archived'
- Course removed from active listings
- All data preserved (enrollments, lessons, resources, progress, grades)
- Students can still access their progress
- Can be restored later

**Use when:**
- Course content outdated but want to preserve history
- Temporarily removing course
- Migrating to updated version
- Need audit trail

### Permanent Delete
**What happens:**
- Course record deleted from database
- ALL related data deleted (CASCADE):
  - Weeks, lessons, resources
  - Enrollments, progress
  - Quizzes, assignments, grades
  - Discussion threads
  - All activity logs
- Cannot be recovered
- Only archive log remains

**Use when:**
- Course was created in error
- Legal requirement to remove data
- Absolutely certain data not needed

---

## Student Notifications

When a course is archived with `notify_students: true`:

**Notification Created:**
```json
{
  "type": "announcement",
  "category": "info",
  "title": "Course Archived",
  "message": "The course 'React 2023' has been archived. You can still access your progress and materials.",
  "link": "/courses/{courseId}",
  "related_id": "{courseId}",
  "related_type": "course"
}
```

Students receive in-app notification automatically.

---

## Audit Trail

Every archive action is logged in `course_archive_log`:

**Actions tracked:**
1. `archived` - Course was archived
2. `restored` - Course was restored from archive
3. `permanently_deleted` - Course was permanently deleted

**Log includes:**
- Who performed the action
- When it was performed
- Reason for archiving (if provided)

**Query archive history:**
```sql
SELECT * FROM course_archive_log 
WHERE course_id = 'uuid' 
ORDER BY performed_at DESC;
```

---

## Frontend Integration

### Teacher Archive Button

```tsx
'use client';

import { useState } from 'react';

export function ArchiveCourseButton({ courseId, courseTitle }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [notifyStudents, setNotifyStudents] = useState(true);

  const handleArchive = async () => {
    const res = await fetch(`/api/teacher/courses/${courseId}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getToken()}`
      },
      body: JSON.stringify({
        reason,
        notify_students: notifyStudents
      })
    });

    if (res.ok) {
      alert('Course archived successfully');
      window.location.href = '/teacher/courses';
    } else {
      alert('Failed to archive course');
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowConfirm(true)}
        className="bg-yellow-500 text-white px-4 py-2 rounded"
      >
        Archive Course
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Archive Course</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to archive "{courseTitle}"? 
              The course will be removed from active listings but all data will be preserved.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Reason for archiving
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border rounded p-2"
                rows={3}
                placeholder="Optional: Why are you archiving this course?"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyStudents}
                  onChange={(e) => setNotifyStudents(e.target.checked)}
                />
                <span className="text-sm">Notify enrolled students</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="px-4 py-2 bg-yellow-500 text-white rounded"
              >
                Archive Course
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### Admin Archived Courses Page

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function ArchivedCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchArchivedCourses();
    fetchStats();
  }, []);

  const fetchArchivedCourses = async () => {
    const res = await fetch('/api/admin/courses/archived', {
      headers: { Authorization: `Bearer ${await getToken()}` }
    });
    const data = await res.json();
    setCourses(data.courses);
  };

  const fetchStats = async () => {
    const res = await fetch('/api/admin/archive-statistics', {
      headers: { Authorization: `Bearer ${await getToken()}` }
    });
    const data = await res.json();
    setStats(data.stats);
  };

  const handleRestore = async (courseId) => {
    const res = await fetch(`/api/admin/courses/${courseId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}` }
    });

    if (res.ok) {
      alert('Course restored successfully');
      fetchArchivedCourses();
      fetchStats();
    }
  };

  const handlePermanentDelete = async (courseId, courseTitle) => {
    const confirmed = confirm(
      `WARNING: This will permanently delete "${courseTitle}" and ALL related data. This cannot be undone. Are you absolutely sure?`
    );

    if (!confirmed) return;

    const doubleConfirm = prompt(
      `Type "DELETE" to confirm permanent deletion:`
    );

    if (doubleConfirm !== 'DELETE') return;

    const res = await fetch(`/api/admin/courses/${courseId}/permanent`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await getToken()}` }
    });

    if (res.ok) {
      alert('Course permanently deleted');
      fetchArchivedCourses();
      fetchStats();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Archived Courses</h1>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Archived</p>
            <p className="text-2xl font-bold">{stats.total_archived}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Affected Students</p>
            <p className="text-2xl font-bold">{stats.total_affected_students}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left p-4">Course Title</th>
              <th className="text-left p-4">Teacher</th>
              <th className="text-left p-4">Archived Date</th>
              <th className="text-left p-4">Reason</th>
              <th className="text-left p-4">Students</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{course.title}</td>
                <td className="p-4">{course.teacher_name}</td>
                <td className="p-4">
                  {new Date(course.archived_at).toLocaleDateString()}
                </td>
                <td className="p-4">{course.archive_reason || 'N/A'}</td>
                <td className="p-4">{course.enrolled_count}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleRestore(course.id)}
                    className="text-blue-600 hover:underline mr-3"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(course.id, course.title)}
                    className="text-red-600 hover:underline"
                  >
                    Delete Permanently
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Best Practices

### When to Archive
1. Course content is outdated
2. Replacing with new version
3. Course no longer offered
4. Teacher leaving platform
5. Low enrollment/activity

### When to Restore
1. Course content updated
2. New teacher taking over
3. Renewed interest/demand
4. Accidental archive

### When to Permanently Delete
1. Created in error
2. Legal requirement
3. Duplicate course
4. Test/demo course

**Warning:** Never permanently delete courses with significant enrollments without proper backup!

---

## Summary

**Phase 8 Complete:**

✅ **Database Schema:** course_archive_log table  
✅ **Service Layer:** courseArchivalService.ts (200+ lines)  
✅ **Controller:** courseArchivalController.ts (200+ lines)  
✅ **Routes:** 9 API endpoints (6 admin, 3 teacher)  
✅ **Migration:** 004_create_course_archival_system.sql  
✅ **Documentation:** This comprehensive guide  

**Total:** ~500 lines of code + database schema

**Next:** Phase 9 - Testing & QA

