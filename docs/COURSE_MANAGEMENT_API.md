# Teacher Course Management APIs

Comprehensive API documentation for teacher course creation, content management, and live session scheduling.

## Overview

The Course Management System provides teachers with complete control over:
- **Course CRUD**: Create, read, update, delete courses
- **Week/Module Management**: Organize courses into weeks
- **Lesson Management**: Add various content types (video, document, link, quiz, assignment)
- **Live Session Scheduling**: Schedule and manage live classes
- **Announcements**: Communicate with enrolled students
- **Grading & Access Control**: Configure grading policies and access settings

## Database Schema

### New Tables (10)
1. `course_weeks` - Week-by-week course organization
2. `course_lessons` - Individual lessons with various content types
3. `live_sessions` - Live class scheduling with Google Meet integration
4. `session_attendees` - Attendance tracking for live sessions
5. `lesson_progress` - Student progress through lessons
6. `course_resources` - Downloadable course materials
7. `course_announcements` - Teacher announcements
8. `course_grading_policies` - Grading weight configuration
9. `course_access_settings` - Course visibility and access control
10. `student_notes` - Student note-taking feature

### Enhanced Tables
- `courses` - Added: duration_weeks, level, category, status, enrollment_limit, starts_at, ends_at
- `enrollments` - Added: certificate_url, completion_percentage, final_grade, attendance_percentage

---

## Authentication

All endpoints require:
- **Authorization**: Bearer token (Clerk JWT)
- **Role**: Teacher or Admin

```
Authorization: Bearer <clerk-jwt-token>
```

---

## Course Management Endpoints

### 1. Get My Courses

Retrieve all courses for the logged-in teacher with statistics.

**Endpoint**: `GET /api/teacher/my-courses`

**Response**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Advanced Quran Tajweed",
      "description": "Master the rules of Tajweed",
      "course_type": "hybrid",
      "duration_weeks": 12,
      "level": "intermediate",
      "category": "Tajweed",
      "price": 199.99,
      "status": "published",
      "enrollment_limit": 30,
      "starts_at": "2026-01-20T00:00:00Z",
      "ends_at": "2026-04-15T00:00:00Z",
      "enrollments": [{ "count": 25 }],
      "course_weeks": [{ "count": 12 }],
      "live_sessions": [{ "count": 8 }]
    }
  ]
}
```

---

### 2. Get Course Details

Get complete course structure with weeks, lessons, sessions, grading policy, and access settings.

**Endpoint**: `GET /api/teacher/my-courses/:courseId`

**Response**:
```json
{
  "course": {
    "id": "uuid",
    "title": "Advanced Quran Tajweed",
    ...
  },
  "weeks": [
    {
      "id": "uuid",
      "week_number": 1,
      "title": "Introduction to Makharij",
      "description": "Articulation points",
      "course_lessons": [
        {
          "id": "uuid",
          "title": "Video: The 17 Makharij Points",
          "content_type": "video",
          "content_url": "https://...",
          "video_duration_minutes": 25,
          "is_required": true,
          "is_preview": true
        }
      ]
    }
  ],
  "sessions": [
    {
      "id": "uuid",
      "title": "Live Q&A Session",
      "scheduled_at": "2026-01-25T18:00:00Z",
      "duration_minutes": 90,
      "meet_link": "https://meet.google.com/...",
      "status": "scheduled"
    }
  ],
  "grading_policy": {
    "assignments_weight": 20,
    "quizzes_weight": 30,
    "midterm_weight": 15,
    "final_exam_weight": 25,
    "attendance_weight": 10,
    "passing_grade": 60
  },
  "access_settings": {
    "is_public": true,
    "requires_approval": false,
    "allow_guest_preview": true,
    "drip_content": false
  }
}
```

---

### 3. Create Course

Create a new course with default grading policy and access settings.

**Endpoint**: `POST /api/teacher/my-courses`

**Request Body**:
```json
{
  "title": "Advanced Quran Tajweed",
  "description": "Master the rules of Tajweed with practical examples",
  "course_type": "hybrid",
  "duration_weeks": 12,
  "level": "intermediate",
  "category": "Tajweed",
  "price": 199.99,
  "course_image_url": "https://...",
  "enrollment_limit": 30,
  "starts_at": "2026-01-20T00:00:00Z",
  "ends_at": "2026-04-15T00:00:00Z"
}
```

**Field Details**:
- `course_type`: `pre-recorded`, `live`, or `hybrid`
- `level`: `beginner`, `intermediate`, or `advanced`
- `duration_weeks`: Default 8
- `price`: Default 0 (free)
- `status`: Always starts as `draft`

**Response**:
```json
{
  "course": {
    "id": "uuid",
    "teacher_id": "profile-id",
    "title": "Advanced Quran Tajweed",
    "status": "draft",
    "created_at": "2026-01-11T...",
    ...
  }
}
```

---

### 4. Update Course

Update course details (metadata only, not content structure).

**Endpoint**: `PUT /api/teacher/my-courses/:courseId`

**Request Body** (partial update supported):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "price": 249.99,
  "enrollment_limit": 40
}
```

**Response**:
```json
{
  "course": { ... }
}
```

---

### 5. Publish/Unpublish Course

Toggle course publication status.

**Endpoint**: `PUT /api/teacher/my-courses/:courseId/publish`

**Request Body**:
```json
{
  "status": "published"
}
```

**Status Values**:
- `draft` - Not visible to students
- `published` - Visible and enrollable

**Response**:
```json
{
  "course": {
    "id": "uuid",
    "status": "published",
    "published_at": "2026-01-11T12:00:00Z",
    ...
  }
}
```

---

### 6. Delete Course

Permanently delete a course and all related content (cascades to weeks, lessons, sessions, etc.).

**Endpoint**: `DELETE /api/teacher/my-courses/:courseId`

**Response**:
```json
{
  "message": "Course deleted successfully"
}
```

---

## Week Management Endpoints

### 7. Add Week

Add a week/module to organize course content.

**Endpoint**: `POST /api/teacher/my-courses/:courseId/weeks`

**Request Body**:
```json
{
  "week_number": 1,
  "title": "Introduction to Makharij",
  "description": "Learn the fundamental articulation points",
  "unlock_date": "2026-01-20T00:00:00Z"
}
```

**Response**:
```json
{
  "week": {
    "id": "uuid",
    "course_id": "uuid",
    "week_number": 1,
    "title": "Introduction to Makharij",
    "order_index": 0,
    "created_at": "2026-01-11T..."
  }
}
```

---

### 8. Update Week

Update week details.

**Endpoint**: `PUT /api/teacher/my-weeks/:weekId`

**Request Body**:
```json
{
  "title": "Updated Week Title",
  "description": "Updated description",
  "unlock_date": "2026-01-22T00:00:00Z"
}
```

**Response**:
```json
{
  "week": { ... }
}
```

---

### 9. Delete Week

Delete a week and all its lessons.

**Endpoint**: `DELETE /api/teacher/my-weeks/:weekId`

**Response**:
```json
{
  "message": "Week deleted successfully"
}
```

---

## Lesson Management Endpoints

### 10. Add Lesson

Add a lesson/content item to a week.

**Endpoint**: `POST /api/teacher/my-weeks/:weekId/lessons`

**Request Body**:
```json
{
  "title": "Video: The 17 Makharij Points",
  "description": "Detailed explanation of all articulation points",
  "content_type": "video",
  "content_url": "https://example.com/videos/makharij-intro.mp4",
  "video_duration_minutes": 25,
  "is_required": true,
  "is_preview": true
}
```

**Content Types**:
- `video` - Video lesson
- `document` - PDF, Word, etc.
- `link` - External resource
- `quiz` - Assessment (links to quiz system)
- `assignment` - Homework/project

**Response**:
```json
{
  "lesson": {
    "id": "uuid",
    "week_id": "uuid",
    "title": "Video: The 17 Makharij Points",
    "content_type": "video",
    "order_index": 0,
    ...
  }
}
```

---

### 11. Update Lesson

Update lesson details.

**Endpoint**: `PUT /api/teacher/my-lessons/:lessonId`

**Request Body**:
```json
{
  "title": "Updated Lesson Title",
  "video_duration_minutes": 30
}
```

**Response**:
```json
{
  "lesson": { ... }
}
```

---

### 12. Delete Lesson

Delete a lesson.

**Endpoint**: `DELETE /api/teacher/my-lessons/:lessonId`

**Response**:
```json
{
  "message": "Lesson deleted successfully"
}
```

---

## Live Session Scheduling

### 13. Schedule Live Session

Schedule a live class with Google Meet integration.

**Endpoint**: `POST /api/teacher/my-courses/:courseId/sessions`

**Request Body**:
```json
{
  "week_id": "uuid",
  "title": "Live Q&A Session - Makharij Practice",
  "description": "Interactive session to practice together",
  "scheduled_at": "2026-01-25T18:00:00Z",
  "duration_minutes": 90,
  "meet_link": "https://meet.google.com/abc-defg-hij",
  "max_participants": 30
}
```

**Response**:
```json
{
  "session": {
    "id": "uuid",
    "course_id": "uuid",
    "week_id": "uuid",
    "title": "Live Q&A Session",
    "scheduled_at": "2026-01-25T18:00:00Z",
    "duration_minutes": 90,
    "status": "scheduled",
    "meet_link": "https://meet.google.com/...",
    ...
  }
}
```

**Session Statuses**:
- `scheduled` - Upcoming session
- `live` - Currently in progress
- `completed` - Ended
- `cancelled` - Cancelled by teacher

---

### 14. Update Live Session

Update session details (reschedule, change link, etc.).

**Endpoint**: `PUT /api/teacher/my-sessions/:sessionId`

**Request Body**:
```json
{
  "scheduled_at": "2026-01-26T18:00:00Z",
  "duration_minutes": 120,
  "status": "cancelled"
}
```

**Response**:
```json
{
  "session": { ... }
}
```

---

### 15. Delete Live Session

Delete/cancel a live session.

**Endpoint**: `DELETE /api/teacher/my-sessions/:sessionId`

**Response**:
```json
{
  "message": "Live session deleted successfully"
}
```

---

## Announcements

### 16. Create Announcement

Post an announcement to all enrolled students.

**Endpoint**: `POST /api/teacher/my-courses/:courseId/announcements`

**Request Body**:
```json
{
  "title": "Welcome to the Course!",
  "content": "Assalamu alaikum! Welcome to Advanced Quran Tajweed...",
  "is_pinned": true
}
```

**Response**:
```json
{
  "announcement": {
    "id": "uuid",
    "course_id": "uuid",
    "title": "Welcome to the Course!",
    "content": "...",
    "is_pinned": true,
    "created_by": "clerk-user-id",
    "created_at": "2026-01-11T..."
  }
}
```

---

## Error Responses

All endpoints return standard error responses:

**401 Unauthorized**:
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden**:
```json
{
  "error": "Access denied"
}
```

**404 Not Found**:
```json
{
  "error": "Course not found"
}
```

**400 Bad Request**:
```json
{
  "error": "Course title is required"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

---

## Testing

Run the API test script:

```bash
cd backend

# Set your teacher auth token
export TEST_AUTH_TOKEN="your-clerk-jwt-token"

# Optional: Change API URL (defaults to localhost:5000)
export API_URL="http://localhost:5000"

# Run tests
node test-course-apis.mjs
```

The test script will:
1. Create a test course
2. Add a week/module
3. Add a video lesson
4. Schedule a live session
5. Create an announcement
6. Retrieve course details
7. Publish the course
8. Update lesson metadata

---

## Implementation Notes

### Supabase Query Pattern

When joining tables with inner joins, Supabase returns arrays even with `.single()`. Use helper function:

```typescript
const getCourseTeacherId = (courses: any): string | null => {
  if (!courses) return null;
  if (Array.isArray(courses)) {
    return courses[0]?.teacher_id || null;
  }
  return courses.teacher_id || null;
};
```

### Default Values

When creating a course:
- **Grading Policy**: Auto-created with default weights (20% assignments, 30% quizzes, etc.)
- **Access Settings**: Auto-created as public, no approval required
- **Status**: Always `draft` until explicitly published

### Cascade Deletes

Database schema includes `ON DELETE CASCADE`:
- Deleting a course removes: weeks, lessons, sessions, resources, announcements, etc.
- Deleting a week removes: all lessons in that week
- Student progress and enrollments are preserved for data integrity

---

## Next Steps

**Frontend Implementation**:
1. Teacher course creation wizard
2. Content management interface (drag-and-drop week/lesson organization)
3. Live session scheduler with calendar view
4. Student progress dashboard
5. Grade management interface

**Future Enhancements**:
1. Fill-in-blanks quiz auto-grading
2. Manual grade override with re-evaluation
3. Email notifications for live sessions
4. Google Calendar integration
5. Bulk content import/export
6. Course templates

---

## Related Documentation

- [LMS System Overview](./LMS_SYSTEM.md)
- [Quiz System](./LMS_ENHANCEMENT_SUMMARY.md)
- [Database Schema](../backend/database/migrations/001_create_course_management_system.sql)
- [Email Notifications](./EMAIL_NOTIFICATIONS_COMPLETE.md)
