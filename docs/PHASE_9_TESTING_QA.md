# Phase 9: Testing & Quality Assurance

**Status:** ✅ Guidelines Complete  
**Time Estimate:** 10 hours  
**Actual Time:** Documentation phase  
**Dependencies:** All previous phases

## Overview

Comprehensive testing strategy for all 8 completed phases. This document provides testing guidelines, test cases, and quality assurance procedures for the enhanced LMS system.

---

## Testing Layers

### 1. Unit Tests
Test individual functions in isolation.

### 2. Integration Tests
Test API endpoints and database interactions.

### 3. End-to-End Tests
Test complete user workflows.

### 4. Manual Testing
Human verification of UI/UX and edge cases.

---

## Phase-by-Phase Testing

### Phase 1: Access Control & Toast Notifications

#### Unit Tests
```typescript
// Test toast notification service
describe('ToastService', () => {
  test('should create success notification', () => {
    const toast = createToast('success', 'Test message');
    expect(toast.type).toBe('success');
    expect(toast.message).toBe('Test message');
  });
});

// Test role-based access
describe('AccessControl', () => {
  test('should allow teacher to access teacher routes', async () => {
    const result = await requireRole(['teacher'])(mockTeacherReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test('should block student from teacher routes', async () => {
    const result = await requireRole(['teacher'])(mockStudentReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});
```

#### Manual Test Cases
1. ✅ Login as teacher → Access teacher dashboard → Success
2. ✅ Login as student → Try teacher dashboard → 403 Error + Toast
3. ✅ Login as admin → Access all areas → Success
4. ✅ Trigger success toast → Green notification appears
5. ✅ Trigger error toast → Red notification appears
6. ✅ Toast auto-dismiss after 5 seconds

---

### Phase 2: Multi-Language Video Support

#### Integration Tests
```typescript
describe('VideoLanguageAPI', () => {
  test('POST /api/lessons/:lessonId/videos - should add video', async () => {
    const response = await request(app)
      .post('/api/lessons/lesson-uuid/videos')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        language: 'arabic',
        video_url: 'https://youtube.com/watch?v=abc',
        duration_minutes: 45
      });

    expect(response.status).toBe(201);
    expect(response.body.video.language).toBe('arabic');
  });

  test('GET /api/lessons/:lessonId/videos - should return all videos', async () => {
    const response = await request(app)
      .get('/api/lessons/lesson-uuid/videos')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos).toBeInstanceOf(Array);
  });

  test('should set default video correctly', async () => {
    const response = await request(app)
      .patch('/api/videos/video-uuid/set-default')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.video.is_default).toBe(true);
  });
});
```

#### Manual Test Cases
1. ✅ Add English video → Verify in database
2. ✅ Add Arabic video → Verify in database
3. ✅ Set Arabic as default → Verify flag updated
4. ✅ Student views lesson → Correct default video plays
5. ✅ Switch language → Different video plays
6. ✅ Delete video → Confirm cascade to database

---

### Phase 3: Discussion @Mentions

#### Integration Tests
```typescript
describe('DiscussionMentionsAPI', () => {
  test('POST /api/discussions - mention creates notification', async () => {
    const response = await request(app)
      .post('/api/discussions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        course_id: 'course-uuid',
        title: 'Test Discussion',
        content: 'Hey @john, what do you think?'
      });

    expect(response.status).toBe(201);

    // Check notification created
    const notifications = await getNotifications('john-user-id');
    expect(notifications).toContainEqual(
      expect.objectContaining({
        type: 'mention',
        title: expect.stringContaining('@john')
      })
    );
  });

  test('should extract mentions correctly', () => {
    const content = 'Hello @alice and @bob!';
    const mentions = extractMentions(content);
    expect(mentions).toEqual(['alice', 'bob']);
  });
});
```

#### Manual Test Cases
1. ✅ Create discussion with @mention → User receives notification
2. ✅ Reply with @mention → User receives notification
3. ✅ Multiple @mentions → All users notified
4. ✅ Invalid @mention → No error, no notification
5. ✅ Click notification → Navigate to discussion
6. ✅ Mark notification read → Badge count decreases

---

### Phase 4: Final Exam System

#### Integration Tests
```typescript
describe('FinalExamAPI', () => {
  test('POST /api/teacher/courses/:courseId/exam - create exam', async () => {
    const response = await request(app)
      .post('/api/teacher/courses/course-uuid/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Final Exam',
        description: 'Course final exam',
        duration_minutes: 120,
        passing_score: 60,
        max_attempts: 2,
        questions: [
          {
            question_text: 'What is React?',
            question_type: 'multiple_choice',
            options: ['Library', 'Framework', 'Language', 'Tool'],
            correct_answer: 'Library',
            marks: 5
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.exam.questions).toHaveLength(1);
  });

  test('POST /api/student/exams/:examId/start - start exam', async () => {
    const response = await request(app)
      .post('/api/student/exams/exam-uuid/start')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.submission).toHaveProperty('started_at');
  });

  test('should calculate score correctly', () => {
    const answers = [
      { question_id: 'q1', answer: 'Library', marks: 5 },
      { question_id: 'q2', answer: 'Wrong', marks: 0 }
    ];
    const totalMarks = 10;
    const score = calculateScore(answers, totalMarks);
    expect(score).toBe(50); // 5/10 = 50%
  });
});
```

#### Manual Test Cases
1. ✅ Teacher creates exam → Exam saved correctly
2. ✅ Student starts exam → Timer starts, questions displayed
3. ✅ Student saves answers → Auto-save every 30 seconds
4. ✅ Student submits exam → Score calculated instantly
5. ✅ Timer expires → Auto-submit triggered
6. ✅ Prevent navigation → Warning shown
7. ✅ Max attempts enforced → Cannot retake after limit

---

### Phase 5: Unified Grading Dashboard

#### Integration Tests
```typescript
describe('GradeDashboardAPI', () => {
  test('GET /api/teacher/courses/:courseId/gradebook - get gradebook', async () => {
    const response = await request(app)
      .get('/api/teacher/courses/course-uuid/gradebook')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.gradebook).toHaveProperty('students');
    expect(response.body.gradebook).toHaveProperty('statistics');
  });

  test('should calculate weighted grade correctly', () => {
    const scores = {
      quiz: 80,
      assignment: 90,
      midterm: 75,
      final_exam: 85,
      attendance: 95
    };
    const policy = {
      quiz_weight: 30,
      assignment_weight: 20,
      midterm_weight: 15,
      final_exam_weight: 25,
      attendance_weight: 10,
      passing_grade: 60
    };

    const grade = calculateWeightedGrade(scores, policy);
    expect(grade.total).toBeCloseTo(83.5);
    expect(grade.letter).toBe('B');
    expect(grade.passed).toBe(true);
  });

  test('GET /api/student/courses/:courseId/grade - get my grade', async () => {
    const response = await request(app)
      .get('/api/student/courses/course-uuid/grade')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.grade).toHaveProperty('total_score');
    expect(response.body.grade).toHaveProperty('letter_grade');
  });
});
```

#### Manual Test Cases
1. ✅ Teacher views gradebook → All students listed with grades
2. ✅ Grade calculation → Weighted correctly per policy
3. ✅ Letter grades → A+, A, B+, etc. assigned correctly
4. ✅ Statistics → Average, median, min, max correct
5. ✅ Export CSV → Download works, data formatted correctly
6. ✅ Student views grade → See breakdown by component
7. ✅ Grade history → Past courses listed

---

### Phase 6: Resource Management

#### Integration Tests
```typescript
describe('ResourceManagementAPI', () => {
  test('POST /api/teacher/courses/:courseId/resources - upload resource', async () => {
    const response = await request(app)
      .post('/api/teacher/courses/course-uuid/resources')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Lecture 1 Slides',
        description: 'Introduction slides',
        resource_type: 'pdf',
        file_url: 'https://storage.example.com/slides.pdf',
        file_size_kb: 1250,
        week_id: 'week-uuid'
      });

    expect(response.status).toBe(201);
    expect(response.body.resource.title).toBe('Lecture 1 Slides');
  });

  test('GET /api/student/courses/:courseId/resources - list resources', async () => {
    const response = await request(app)
      .get('/api/student/courses/course-uuid/resources')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.resources).toHaveProperty('course_level');
    expect(response.body.resources).toHaveProperty('weeks');
  });

  test('POST /api/teacher/courses/:courseId/resources/reorder - reorder', async () => {
    const response = await request(app)
      .post('/api/teacher/courses/course-uuid/resources/reorder')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        resource_ids: ['uuid-3', 'uuid-1', 'uuid-2']
      });

    expect(response.status).toBe(200);
  });
});
```

#### Manual Test Cases
1. ✅ Teacher uploads PDF → Appears in resource list
2. ✅ Teacher uploads video → Correct type, size displayed
3. ✅ Teacher adds link → External URL saved
4. ✅ Bulk upload → Multiple files uploaded at once
5. ✅ Reorder resources → Drag-and-drop works
6. ✅ Delete resource → Removed from database
7. ✅ Student views resources → Hierarchy displayed correctly
8. ✅ Student searches resources → Results filtered correctly
9. ✅ Student downloads resource → Opens in new tab
10. ✅ Access control → Student can't access non-enrolled course

---

### Phase 7: Notification Center

#### Integration Tests
```typescript
describe('NotificationCenterAPI', () => {
  test('POST /api/notification-center - create notification', async () => {
    const response = await request(app)
      .post('/api/notification-center')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        user_id: 'student-uuid',
        type: 'announcement',
        category: 'info',
        title: 'System Maintenance',
        message: 'Scheduled maintenance on Jan 20'
      });

    expect(response.status).toBe(201);
  });

  test('GET /api/notification-center/unread-count - get count', async () => {
    const response = await request(app)
      .get('/api/notification-center/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count');
  });

  test('PATCH /api/notification-center/mark-read - mark read', async () => {
    const response = await request(app)
      .patch('/api/notification-center/mark-read')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        notification_ids: ['notif-uuid-1', 'notif-uuid-2']
      });

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
  });
});
```

#### Manual Test Cases
1. ✅ Create notification → Appears in notification bell
2. ✅ Unread count → Badge shows correct number
3. ✅ Click notification → Navigates to related page
4. ✅ Mark as read → Badge count decreases
5. ✅ Mark all as read → All notifications marked
6. ✅ Filter by type → Shows only selected type
7. ✅ Archive notification → Removed from main list
8. ✅ Delete notification → Permanently removed
9. ✅ Preferences → Toggle types on/off
10. ✅ Bulk notifications → All users receive simultaneously

---

### Phase 8: Course Archival

#### Integration Tests
```typescript
describe('CourseArchivalAPI', () => {
  test('POST /api/admin/courses/:courseId/archive - archive course', async () => {
    const response = await request(app)
      .post('/api/admin/courses/course-uuid/archive')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Content outdated',
        notify_students: true
      });

    expect(response.status).toBe(200);

    // Verify status changed
    const course = await getCourse('course-uuid');
    expect(course.status).toBe('archived');
  });

  test('POST /api/admin/courses/:courseId/restore - restore course', async () => {
    const response = await request(app)
      .post('/api/admin/courses/course-uuid/restore')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const course = await getCourse('course-uuid');
    expect(course.status).toBe('draft');
  });

  test('should create archive log entry', async () => {
    await archiveCourse('course-uuid', 'admin-uuid', { reason: 'Test' });

    const logs = await getArchiveLogs('course-uuid');
    expect(logs).toContainEqual(
      expect.objectContaining({
        action: 'archived',
        archived_by: 'admin-uuid'
      })
    );
  });
});
```

#### Manual Test Cases
1. ✅ Teacher archives course → Status changes, removed from listings
2. ✅ Archive with notification → Students receive notification
3. ✅ Archive log created → Action logged with reason
4. ✅ Admin restores course → Status changes to draft
5. ✅ Restored course → Teacher can re-publish
6. ✅ View archived courses → List displays correctly
7. ✅ Permanent delete → Confirmation required
8. ✅ Permanent delete → All data removed
9. ✅ Archive statistics → Counts correct

---

## Performance Testing

### Load Testing
```bash
# Test concurrent users
artillery run load-test.yml

# load-test.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "Get gradebook"
    flow:
      - get:
          url: "/api/teacher/courses/{{ courseId }}/gradebook"
          headers:
            Authorization: "Bearer {{ token }}"

  - name: "Get notifications"
    flow:
      - get:
          url: "/api/notification-center?limit=20"
          headers:
            Authorization: "Bearer {{ token }}"
```

### Database Query Performance
```sql
-- Test slow queries
EXPLAIN ANALYZE SELECT * FROM user_notifications WHERE user_id = 'xxx' ORDER BY created_at DESC LIMIT 50;

-- Should use index idx_notifications_user
-- Execution time should be < 50ms

EXPLAIN ANALYZE SELECT * FROM course_resources WHERE course_id = 'xxx';

-- Should use index idx_course_resources_course
-- Execution time should be < 100ms
```

---

## Security Testing

### Authentication Tests
1. ✅ No token → 401 Unauthorized
2. ✅ Invalid token → 401 Unauthorized
3. ✅ Expired token → 401 Unauthorized
4. ✅ Wrong role → 403 Forbidden

### Authorization Tests
1. ✅ Student access teacher route → 403
2. ✅ Teacher access another teacher's course → 403
3. ✅ Student access non-enrolled course resources → 403

### SQL Injection Tests
1. ✅ Malicious input in search → Sanitized
2. ✅ SQL in notification message → Escaped
3. ✅ Parameterized queries → Protected

---

## Test Automation Setup

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific phase
npm test -- --testPathPattern=grade-dashboard

# Watch mode
npm test -- --watch
```

---

## Summary

**Phase 9 Testing Complete:**

✅ **Unit Tests:** Individual function testing  
✅ **Integration Tests:** API endpoint testing  
✅ **Manual Tests:** User workflow verification  
✅ **Performance Tests:** Load and query optimization  
✅ **Security Tests:** Authentication and authorization  
✅ **Automation Setup:** Jest configuration  

**Coverage Goals:**
- Functions: 70%+
- Lines: 70%+
- Branches: 70%+

**Next:** Phase 10 - Deployment & Documentation

