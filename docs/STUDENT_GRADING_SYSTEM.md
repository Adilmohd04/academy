# Student Grading System Implementation

## Overview
Comprehensive student grading and tracking system with week-wise quiz/assignment monitoring, teacher comments, internal score calculation, and certificate eligibility tracking.

## Features Implemented

### ✅ Database Schema
**Migration:** `backend/database/migrations/add_grading_system.sql`

**Courses Table - New Columns:**
- `quiz_weight` (INTEGER, default: 20) - Weight of quizzes in final grade (%)
- `assignment_weight` (INTEGER, default: 20) - Weight of assignments in final grade (%)
- `final_exam_weight` (INTEGER, default: 60) - Weight of final exam in final grade (%)
- `min_score_for_certificate` (INTEGER, default: 60) - Minimum total score required for certificate

**Enrollments Table - New Columns:**
- `internal_score` (DECIMAL(5,2)) - Calculated internal score (quiz + assignment average)
- `final_exam_score` (DECIMAL(5,2)) - Final exam score
- `total_score` (DECIMAL(5,2)) - Total weighted score
- `certificate_eligible` (BOOLEAN, default: false) - Whether student is eligible for certificate

**Quiz Attempts Table - New Columns:**
- `teacher_comment` (TEXT) - Teacher feedback on quiz attempt
- `graded_at` (TIMESTAMP) - When teacher graded the quiz

**Indexes Created:**
- `idx_quiz_attempts_student_quiz` - Fast lookup for quiz attempts by student
- `idx_assignment_submissions_student_lesson` - Fast lookup for assignments by student
- `idx_enrollments_course_student` - Fast lookup for enrollments

### ✅ Backend API
**File:** `backend/src/routes/teacherGrades.ts`

**Endpoints:**

1. **GET /api/teacher/courses/:courseId/students/grades**
   - Returns all enrolled students with week-wise grades
   - Includes: quiz scores, assignment scores, comments, averages
   - Calculates quiz_average and assignment_average per student
   - Response structure:
   ```json
   {
     "students": [
       {
         "student_id": "clerk_user_id",
         "student_name": "John Doe",
         "student_email": "john@example.com",
         "progress_percentage": 75.5,
         "internal_score": 85.2,
         "quiz_average": 87.5,
         "assignment_average": 82.9,
         "certificate_eligible": true,
         "weeks": [
           {
             "week_number": 1,
             "week_title": "Introduction",
             "quiz_score": 45,
             "quiz_max_score": 50,
             "quiz_submitted_at": "2026-01-15T10:30:00Z",
             "quiz_comment": "Great work!",
             "assignment_score": 18,
             "assignment_max_score": 20,
             "assignment_submitted_at": "2026-01-16T14:00:00Z",
             "assignment_comment": "Well done"
           }
         ]
       }
     ]
   }
   ```

2. **POST /api/teacher/courses/:courseId/students/:studentId/grades**
   - Save individual grade with comment
   - Body:
   ```json
   {
     "week_number": 1,
     "type": "quiz" | "assignment",
     "score": 45,
     "comment": "Great work! Keep it up."
   }
   ```
   - Updates quiz_attempts.teacher_comment or assignment_submissions.feedback
   - Sets graded_at timestamp

3. **POST /api/teacher/courses/:courseId/calculate-internal-scores**
   - Automatically calculates internal scores for all enrolled students
   - Formula: `(quiz_avg * quiz_weight%) + (assignment_avg * assignment_weight%)`
   - Mass update query for efficiency
   - Response: `{ "success": true, "message": "Internal scores calculated successfully" }`

4. **GET /api/teacher/courses/:courseId/grading-policy**
   - Returns current grading policy configuration
   - Response:
   ```json
   {
     "policy": {
       "quiz_weight": 20,
       "assignment_weight": 20,
       "final_exam_weight": 60,
       "min_score_for_certificate": 60
     }
   }
   ```

5. **PUT /api/teacher/courses/:courseId/grading-policy**
   - Update grading policy configuration
   - Body:
   ```json
   {
     "quiz_weight": 30,
     "assignment_weight": 40,
     "final_exam_weight": 30,
     "min_score_for_certificate": 70
   }
   ```

**Authorization:**
- All endpoints require authentication via `requireAuth` middleware
- Teacher ownership verified before any operation
- Students can only access their own grades (to be implemented in student view)

### ✅ Frontend UI
**File:** `frontend/app/teacher/courses/[courseId]/students/page.tsx`

**Features:**

1. **Grading Policy Panel**
   - Configure quiz/assignment/final exam weights (%)
   - Set minimum score for certificate eligibility
   - Warning if weights don't add to 100%
   - "Save Policy" button to update configuration
   - "Calculate Internal Scores" button to trigger auto-calculation

2. **Student Search & Filtering**
   - Search bar to filter by name or email
   - Live filtering as user types
   - Shows total students and eligible count

3. **Student Cards (Expandable)**
   - Header shows: Name, Email, Progress %, Quiz Avg, Assignment Avg, Internal Score
   - Certificate eligibility indicator (green ✓ or red ✗)
   - Click to expand and see week-wise breakdown

4. **Week-wise Grade Display**
   - Grid layout: Quiz (blue) + Assignment (purple) per week
   - Each shows:
     * Score/Max Score (e.g., "85/100")
     * Submission date
     * Teacher comment
     * "Edit Grade" button for inline editing
   - Color-coded badges:
     * Blue (ClipboardCheck icon) - Quizzes
     * Purple (FileText icon) - Assignments

5. **Inline Grade Editing**
   - Click "Edit Grade" → opens inline form
   - Score input field
   - Comment textarea
   - "Save" and "Cancel" buttons
   - Updates backend on save

6. **Summary Statistics**
   - Per student: Quiz average, assignment average, internal score
   - Certificate status: "Eligible for Certificate" (green) or "Needs X% for Certificate" (orange)
   - Total enrolled students count

**UI Design:**
- Gradient header: `from-blue-50 to-purple-50`
- Responsive grid: 1 column (mobile), 2 columns (desktop)
- Tailwind CSS styling throughout
- Lucide React icons (Search, ClipboardCheck, FileText, Check, X, Edit2, Save, XCircle)

## Database Schema Details

### Table Relationships
```
courses
  ├── course_weeks
  │   ├── quizzes
  │   │   └── quiz_attempts (has teacher_comment, graded_at)
  │   ├── assignments
  │   └── course_lessons
  │       └── assignment_submissions (has grade, feedback, graded_at)
  └── enrollments (has internal_score, total_score, certificate_eligible)
```

### Key Notes:
- **Quiz Attempts**: Uses `total_points` (not max_score), stores scores per attempt
- **Assignment Submissions**: Linked to `lesson_id` (not assignment_id), uses `grade` column
- **Enrollments**: Uses `student_id` (Clerk user ID), not profiles.id

## Testing Checklist

### Backend Testing
1. ✅ Migration runs successfully (completed)
2. ✅ Routes registered in app.ts (completed)
3. ✅ TypeScript compilation successful (completed)
4. ⏳ Test GET /api/teacher/courses/:courseId/students/grades
5. ⏳ Test POST grade saving endpoint
6. ⏳ Test internal score calculation endpoint
7. ⏳ Test grading policy GET/PUT endpoints

### Frontend Testing
1. ⏳ Navigate to /teacher/courses/[courseId]/students
2. ⏳ Verify student list loads correctly
3. ⏳ Test search/filtering functionality
4. ⏳ Expand student card and verify week-wise data
5. ⏳ Test inline grade editing (save/cancel)
6. ⏳ Test grading policy configuration
7. ⏳ Test "Calculate Internal Scores" button
8. ⏳ Verify certificate eligibility indicators

### Integration Testing
1. ⏳ Create test course with weeks, quizzes, assignments
2. ⏳ Enroll test students
3. ⏳ Submit quiz attempts and assignments
4. ⏳ Grade submissions as teacher
5. ⏳ Verify averages calculate correctly
6. ⏳ Test internal score calculation
7. ⏳ Verify certificate eligibility logic

## Usage Guide

### For Teachers

1. **Access Student Grades:**
   - Navigate to your course → "Students" tab (or `/teacher/courses/[courseId]/students`)
   - See all enrolled students with their progress

2. **Configure Grading Policy:**
   - Set quiz weight (e.g., 30%)
   - Set assignment weight (e.g., 40%)
   - Set final exam weight (e.g., 30%)
   - Set minimum score for certificate (e.g., 70%)
   - Click "Save Policy"

3. **Grade Submissions:**
   - Click on a student to expand week-wise details
   - Find the quiz or assignment you want to grade
   - Click "Edit Grade"
   - Enter score (out of max score shown)
   - Add comment/feedback
   - Click "Save"

4. **Calculate Internal Scores:**
   - After grading all weeks
   - Click "Calculate Internal Scores" button
   - System auto-calculates weighted average for all students
   - Internal score = (quiz_avg × quiz_weight) + (assignment_avg × assignment_weight)

5. **Monitor Certificate Eligibility:**
   - Green checkmark = Student meets minimum score requirement
   - Red X = Student needs more points
   - Orange badge shows exactly how many points needed

### For Students (To Be Implemented)
- View own grades at `/student/courses/[courseId]/grades`
- See week-wise quiz and assignment scores
- Read teacher comments
- Track progress toward certificate eligibility

## Future Enhancements

1. **Final Exam Integration:**
   - Add final exam submission and grading
   - Calculate total_score = (internal_score × (quiz_weight + assignment_weight)) + (final_exam_score × final_exam_weight)
   - Update certificate_eligible based on total_score

2. **Student Grade View:**
   - Read-only grade view for students
   - Show progress toward certificate
   - Display teacher feedback

3. **Grade Analytics:**
   - Class average comparisons
   - Grade distribution charts
   - Progress tracking over time

4. **Bulk Grading:**
   - Grade multiple students at once
   - Import grades from CSV
   - Auto-grading for objective quizzes

5. **Notifications:**
   - Notify students when grades are posted
   - Notify students if falling behind minimum score
   - Email summaries of grade updates

## API Route Registration
**File:** `backend/src/app.ts`

Added import:
```typescript
import teacherGradesRoutes from './routes/teacherGrades';
```

Added route:
```typescript
this.app.use('/api/teacher', teacherGradesRoutes);
```

## Technical Notes

### Performance Optimizations
- Indexed queries for fast student/grade lookups
- Batch calculation for internal scores (single UPDATE query)
- Promise.all() for parallel week grade fetching
- Connection pooling with pg Pool

### Security
- Teacher authorization on all endpoints
- Clerk JWT authentication required
- SQL injection prevention via parameterized queries
- Input validation on grade submissions

### Error Handling
- Try-catch blocks on all async operations
- Proper HTTP status codes (403 Unauthorized, 404 Not Found, 500 Server Error)
- Client connection release in finally blocks
- Descriptive error messages

## Migration Status
✅ **COMPLETED** - Migration run successfully on February 1, 2026

All columns added:
- courses: quiz_weight, assignment_weight, final_exam_weight, min_score_for_certificate
- enrollments: internal_score, final_exam_score, total_score, certificate_eligible
- quiz_attempts: teacher_comment, graded_at
- Indexes created for performance

## Next Steps
1. ✅ Complete backend implementation
2. ✅ Complete frontend UI
3. ✅ Run database migration
4. ✅ Register routes in app.ts
5. ⏳ Test all API endpoints
6. ⏳ Test frontend UI with real data
7. ⏳ Create student-facing grade view page
8. ⏳ Implement final exam integration
9. ⏳ Add email notifications for grade updates
10. ⏳ Deploy to production

---

**Created:** February 1, 2026  
**Status:** Backend & Frontend Complete, Migration Applied, Ready for Testing
