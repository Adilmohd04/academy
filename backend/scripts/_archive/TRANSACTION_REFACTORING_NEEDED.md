# Files Requiring Manual Transaction Refactoring

The following files use PostgreSQL transaction patterns (BEGIN/COMMIT/ROLLBACK) which are not directly supported by the Supabase JavaScript client. These files need to be refactored using one of these approaches:

## Approach 1: Create Supabase Database Functions (RPC)
Create PostgreSQL functions in the database that handle the transactional logic, then call them via Supabase RPC.

## Approach 2: Accept Eventual Consistency
For some operations, you can remove transactions and accept eventual consistency, handling failures with retry logic.

## Files Needing Refactoring:

### 1. `backend/src/modules/shared/services/courseArchivalService.ts`
- **Functions**: `archiveCourse`, `restoreCourse`, `permanentlyDeleteCourse`
- **Pattern**: Multi-step updates with transactions
- **Recommendation**: Create database functions for these operations

### 2. `backend/src/modules/shared/services/courseResourceService.ts`
- **Functions**: `createResource`, `getResourceById`, `listResources`, etc.
- **Pattern**: Some use pool.connect() for simple queries
- **Status**: ✅ Can be fixed with simple Supabase queries (lower priority)

### 3. `backend/src/modules/shared/services/discussionPortalService.ts`
- **Functions**: `createDiscussion`, `getCourseDiscussions`
- **Pattern**: Uses pool.connect() for complex queries with joins
- **Status**: ✅ Can be fixed with Supabase queries (lower priority)

### 4. `backend/src/modules/shared/services/gradeDashboardService.ts`
- **Functions**: `getCourseGradingPolicy`, `calculateQuizScore`, `calculateAssignmentScore`, etc.
- **Pattern**: Read-only queries using pool.connect()
- **Status**: ✅ Can be fixed with simple Supabase queries

### 5. `backend/src/modules/shared/services/notificationService.ts`
- **Functions**: `createNotification`, `createBulkNotifications`, `getUserNotifications`
- **Pattern**: Uses transactions for bulk operations
- **Recommendation**: Create database function for bulk operations

### 6. `backend/src/modules/student/services/assignmentService.ts`
- **Functions**: `getAssignmentByLesson`, `submitAssignment`, `gradeSubmission`
- **Pattern**: Complex transactions with multiple updates
- **Recommendation**: Create database functions

### 7. `backend/src/modules/student/services/courseProgressService.ts`
- **Functions**: `getCourseContentWithProgress`, `markLessonComplete`
- **Pattern**: Transactions for updating progress
- **Recommendation**: Create database functions

### 8. `backend/src/modules/student/services/studentExamService.ts`
- **Functions**: `startExamAttempt`, `saveAnswer`, `submitExam`
- **Pattern**: Complex transactions for exam submissions
- **Recommendation**: Create database functions

### 9. `backend/src/routes/studentGrades.ts`
- **Functions**: Route handlers using pool.connect()
- **Pattern**: Read-only queries
- **Status**: ✅ Can be fixed with simple Supabase queries

### 10. `backend/src/routes/teacherGrades.ts`
- **Functions**: Multiple route handlers
- **Pattern**: Complex queries and updates
- **Status**: ✅ Can be fixed with Supabase queries

### 11. `backend/src/routes/teacherStudents.ts`
- **Functions**: Multiple route handlers
- **Pattern**: Complex joins and queries
- **Status**: ✅ Can be fixed with Supabase queries

## Next Steps:

1. **Immediate**: Fix files marked with ✅ using simple Supabase queries
2. **Short-term**: Create database functions for critical transaction-heavy operations
3. **Long-term**: Evaluate if all transactions are necessary or if some can be removed

## Example Database Function Pattern:

```sql
-- Create function in Supabase SQL editor
CREATE OR REPLACE FUNCTION archive_course(
  p_course_id UUID,
  p_archived_by TEXT,
  p_reason TEXT DEFAULT 'No reason provided',
  p_notify_students BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update course status
  UPDATE courses 
  SET status = 'archived', updated_at = NOW()
  WHERE id = p_course_id;
  
  -- Log archive action
  INSERT INTO course_archive_log (course_id, archived_by, archive_reason, action, performed_at)
  VALUES (p_course_id, p_archived_by, p_reason, 'archived', NOW());
  
  -- Create notifications if needed
  IF p_notify_students THEN
    -- Insert notifications for students
    -- ... notification logic
  END IF;
END;
$$;
```

Then call from TypeScript:
```typescript
const { error } = await pool.rpc('archive_course', {
  p_course_id: courseId,
  p_archived_by: archivedBy,
  p_reason: options.reason,
  p_notify_students: options.notify_students
});

if (error) throw error;
```
