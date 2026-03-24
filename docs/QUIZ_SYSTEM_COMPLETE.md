# Quiz System - Complete Implementation

## Overview

A comprehensive quiz system allowing teachers to create assessments and students to test their knowledge with automatic grading, timer functionality, and progress tracking.

## ✅ Implementation Status: 100% COMPLETE

All components have been implemented and tested:

- ✅ Database schema (3 tables, 8 indexes)
- ✅ Backend APIs (13 endpoints)
- ✅ Teacher pages (3 pages: list, create, edit)
- ✅ Student pages (3 pages: list, take quiz, results)
- ✅ Course integration (quizzes tab in learn page)
- ✅ Progress calculation (includes quiz completion)

---

## Database Schema

### Tables

#### 1. `quizzes`
Stores quiz configuration and metadata.

```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER DEFAULT 30,
  max_attempts INTEGER DEFAULT 3,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_quizzes_course_id` on `course_id`
- `idx_quizzes_published` on `is_published`

#### 2. `quiz_questions`
Stores individual questions for each quiz.

```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'true_false', 'short_answer'
  options JSONB, -- For multiple choice: ["Option 1", "Option 2", "Option 3", "Option 4"]
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_quiz_questions_quiz_id` on `quiz_id`
- `idx_quiz_questions_order` on `(quiz_id, order_index)`

#### 3. `quiz_attempts`
Tracks student quiz attempts and results.

```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  passed BOOLEAN DEFAULT false,
  answers JSONB NOT NULL, -- {"question_id": "student_answer"}
  time_taken_seconds INTEGER,
  started_at TIMESTAMP,
  submitted_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_quiz_attempts_quiz_student` on `(quiz_id, student_id)`
- `idx_quiz_attempts_student` on `student_id`
- `idx_quiz_attempts_submitted` on `submitted_at DESC`

---

## Backend API Endpoints

### Teacher Endpoints

#### 1. **GET** `/api/teacher/courses/:courseId/quizzes`
Get all quizzes for a course.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Week 1 Quiz",
    "description": "Test your knowledge",
    "passing_score": 70,
    "time_limit_minutes": 30,
    "max_attempts": 3,
    "is_published": true,
    "question_count": 10,
    "total_attempts": 25,
    "average_score": 78.5,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

#### 2. **POST** `/api/teacher/courses/:courseId/quizzes`
Create a new quiz.

**Request:**
```json
{
  "title": "Week 1 Quiz",
  "description": "Test your knowledge",
  "passing_score": 70,
  "time_limit_minutes": 30,
  "max_attempts": 3,
  "is_published": false
}
```

#### 3. **GET** `/api/teacher/quizzes/:quizId`
Get quiz details with questions.

**Response:**
```json
{
  "id": "uuid",
  "title": "Week 1 Quiz",
  "passing_score": 70,
  "questions": [
    {
      "id": "uuid",
      "question_text": "What is 2+2?",
      "question_type": "multiple_choice",
      "options": ["2", "3", "4", "5"],
      "correct_answer": "4",
      "points": 1,
      "explanation": "Basic addition",
      "order_index": 0
    }
  ]
}
```

#### 4. **PUT** `/api/teacher/quizzes/:quizId`
Update quiz details.

#### 5. **DELETE** `/api/teacher/quizzes/:quizId`
Delete a quiz.

#### 6. **POST** `/api/teacher/quizzes/:quizId/questions`
Add a question to quiz.

**Request:**
```json
{
  "question_text": "What is the capital of France?",
  "question_type": "multiple_choice",
  "options": ["London", "Berlin", "Paris", "Madrid"],
  "correct_answer": "Paris",
  "points": 1,
  "explanation": "Paris is the capital and largest city of France.",
  "order_index": 0
}
```

#### 7. **PUT** `/api/teacher/quizzes/:quizId/questions/:questionId`
Update a question.

#### 8. **DELETE** `/api/teacher/quizzes/:quizId/questions/:questionId`
Delete a question.

#### 9. **PUT** `/api/teacher/quizzes/:quizId/publish`
Publish/unpublish a quiz.

**Request:**
```json
{
  "is_published": true
}
```

### Student Endpoints

#### 1. **GET** `/api/student/courses/:courseId/quizzes`
Get all published quizzes for a course with student's progress.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Week 1 Quiz",
    "description": "Test your knowledge",
    "passing_score": 70,
    "time_limit_minutes": 30,
    "max_attempts": 3,
    "attempts_taken": 2,
    "can_attempt": true,
    "best_score": 85,
    "has_passed": true,
    "recent_attempts": [
      {
        "id": "uuid",
        "score": 85,
        "percentage": 85,
        "passed": true,
        "submitted_at": "2024-01-15T14:30:00Z"
      }
    ]
  }
]
```

#### 2. **POST** `/api/student/quizzes/:quizId/start`
Start a quiz attempt (returns questions WITHOUT correct answers).

**Response:**
```json
{
  "quiz": {
    "id": "uuid",
    "title": "Week 1 Quiz",
    "description": "Test your knowledge",
    "passing_score": 70,
    "time_limit_minutes": 30,
    "questions": [
      {
        "id": "uuid",
        "question_text": "What is 2+2?",
        "question_type": "multiple_choice",
        "options": ["2", "3", "4", "5"],
        "points": 1,
        "order_index": 0
      }
    ]
  },
  "started_at": "2024-01-15T15:00:00Z"
}
```

#### 3. **POST** `/api/student/quizzes/:quizId/submit`
Submit quiz answers for grading.

**Request:**
```json
{
  "answers": {
    "question-uuid-1": "4",
    "question-uuid-2": "true",
    "question-uuid-3": "Paris"
  },
  "time_taken_seconds": 1200,
  "started_at": "2024-01-15T15:00:00Z"
}
```

**Response:**
```json
{
  "attempt_id": "uuid",
  "score": 8,
  "total_points": 10,
  "percentage": 80,
  "passed": true,
  "passing_score": 70,
  "results": [
    {
      "question_id": "uuid",
      "question_text": "What is 2+2?",
      "question_type": "multiple_choice",
      "student_answer": "4",
      "correct_answer": "4",
      "is_correct": true,
      "points_earned": 1,
      "points_possible": 1,
      "explanation": "Basic addition"
    }
  ],
  "message": "Congratulations! You passed the quiz!"
}
```

#### 4. **GET** `/api/student/quiz-attempts/:attemptId`
Get detailed results for a specific attempt.

#### 5. **GET** `/api/student/quizzes/:quizId/attempts`
Get all attempts for a quiz by the student.

---

## Frontend Pages

### Teacher Pages

#### 1. Quiz List Page
**Path:** `/teacher/courses/:courseId/quizzes`

**Features:**
- View all quizzes for a course
- See quiz statistics (attempts, average score)
- Create new quiz button
- Edit/delete quiz actions
- Publish/unpublish toggle
- Empty state for no quizzes

#### 2. Quiz Create Page
**Path:** `/teacher/courses/:courseId/quizzes/new`

**Features:**
- Quiz title and description
- Passing score (0-100%)
- Time limit (minutes)
- Max attempts allowed
- Add/edit/delete questions
- Three question types:
  - Multiple Choice (2-4 options)
  - True/False
  - Short Answer
- Question points configuration
- Question explanations
- Drag-and-drop reordering
- Save as draft or publish immediately

#### 3. Quiz Edit Page
**Path:** `/teacher/quizzes/:quizId/edit`

**Features:**
- Same as create page
- Update existing quiz
- Modify questions
- Change publish status

### Student Pages

#### 1. Quiz List Page
**Path:** `/student/courses/:courseId/quizzes`

**Features:**
- View all published quizzes
- See quiz details (passing score, time limit, attempts)
- Display best score and pass status
- Show attempts taken / max attempts
- "Start Quiz" button (if attempts available)
- "Retry Quiz" button (if failed)
- "Max Attempts Reached" status
- Recent attempts history with view details
- Empty state for no quizzes

**UI Components:**
```tsx
// Quiz card showing:
- Title and description
- Passing score badge
- Time limit display
- Attempts counter
- Best score (highlighted in green if passed)
- Recent attempts list
- Action buttons (Start/Retry/View Results)
```

#### 2. Quiz Taking Interface
**Path:** `/student/quizzes/:quizId/attempt`

**Features:**
- **Timer System:**
  - Countdown timer (MM:SS format)
  - Visual warning at 5 minutes remaining (red color)
  - Auto-submit when timer reaches 0
  - Time tracking from start

- **Question Navigation:**
  - Current question indicator (1/10)
  - Progress bar showing answered questions
  - Previous/Next buttons
  - Submit button on last question

- **Question Types:**
  - **Multiple Choice:** Radio buttons, 2-4 options
  - **True/False:** Two large toggle buttons
  - **Short Answer:** Multi-line textarea

- **Safety Features:**
  - Before-unload warning (prevents accidental exit)
  - Confirmation dialog if unanswered questions
  - Submit confirmation dialog
  - Auto-submit on timeout

**State Management:**
```tsx
const [quiz, setQuiz] = useState<Quiz | null>(null)
const [answers, setAnswers] = useState<{ [key: string]: string }>({})
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
const [startedAt, setStartedAt] = useState<string>('')
```

#### 3. Quiz Results Page
**Path:** `/student/quiz-attempts/:attemptId/results`

**Features:**
- **Hero Section:**
  - Pass/fail status with icon
  - Large percentage display
  - Congratulations or encouragement message
  - Stats cards:
    - Required score
    - Correct count
    - Incorrect count
    - Time taken

- **Quiz Information:**
  - Quiz title and description
  - Submission timestamp
  - Time taken display

- **Action Buttons:**
  - Back to Course
  - Retry Quiz (navigates to attempt page)

- **Detailed Question Review:**
  - Question number badge
  - Points earned / points possible
  - Question text
  - For Multiple Choice:
    - All options displayed
    - Green highlighting for correct answer
    - Red highlighting for wrong student answer
    - Check/X icons
  - For Other Types:
    - Student answer (color-coded)
    - Correct answer shown if wrong
  - Explanation (blue info box with lightbulb icon)

- **Animations:**
  - Framer Motion stagger effect (0.1s delay per question)

---

## Auto-Grading System

### Grading Logic

```typescript
// Multiple Choice & True/False
const isCorrect = studentAnswer.toLowerCase() === correctAnswer.toLowerCase()

// Short Answer
const normalizedStudent = studentAnswer.trim().toLowerCase()
const normalizedCorrect = correctAnswer.trim().toLowerCase()
const isCorrect = normalizedStudent === normalizedCorrect

// Scoring
const score = questions.reduce((total, q) => {
  if (isCorrect) return total + q.points
  return total
}, 0)

const percentage = (score / total_points) * 100
const passed = percentage >= passing_score
```

### Grading Features
- Instant grading on submission
- Case-insensitive comparison
- Whitespace trimming for short answers
- Points-based scoring
- Percentage calculation
- Pass/fail determination
- Detailed feedback for each question

---

## Course Integration

### Quizzes Tab

Added to the course learning page (`/student/courses/:courseId/learn`):

```tsx
const tabs = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'quizzes', label: 'Quizzes', icon: ClipboardList }, // NEW
  { id: 'grades', label: 'Grades', icon: Award },
];
```

**Tab Content:**
- Hero section with trophy icon
- Call-to-action to browse quizzes
- "View All Quizzes" button
- Links to quiz list page

---

## Progress Calculation

### Updated Formula

Course progress now includes quiz completion:

```typescript
const total_items = total_lessons + total_quizzes
const completed_items = completed_lessons + passed_quizzes
const progress_percentage = (completed_items / total_items) * 100
```

### Database Function

```sql
CREATE FUNCTION calculate_course_progress(p_course_id UUID, p_student_id UUID)
RETURNS TABLE(
  total_lessons BIGINT,
  completed_lessons BIGINT,
  total_quizzes BIGINT,
  passed_quizzes BIGINT,
  progress_percentage INTEGER
)
```

**Features:**
- Counts all course lessons
- Counts completed lessons
- Counts published quizzes
- Counts passed quizzes (best attempt)
- Calculates combined progress percentage

### Progress Update Triggers

Progress is automatically updated when:
1. Student completes a lesson
2. Student passes a quiz (on submission)

**Update Logic:**
```typescript
// After quiz submission (if passed)
const progressData = await supabase.rpc('calculate_course_progress', {
  p_course_id: quiz.course_id,
  p_student_id: profile.id
})

await supabase
  .from('enrollments')
  .update({ progress_percentage: progressData.progress_percentage })
  .eq('course_id', quiz.course_id)
  .eq('student_id', profile.id)
```

---

## Timer System

### Implementation

```typescript
useEffect(() => {
  if (timeRemaining === null || timeRemaining <= 0) return

  const interval = setInterval(() => {
    setTimeRemaining(prev => {
      if (prev === null || prev <= 1) {
        handleAutoSubmit() // Auto-submit when time runs out
        return 0
      }
      return prev - 1
    })
  }, 1000) // Update every second

  return () => clearInterval(interval)
}, [timeRemaining])
```

### Features
- Countdown from `time_limit_minutes * 60` seconds
- Visual display: `MM:SS` format
- Warning state: Red color when < 5 minutes
- Auto-submit: Triggers submission at 0 seconds
- Time tracking: Calculates `time_taken_seconds` for submission

### Display

```tsx
const minutes = Math.floor(timeRemaining / 60)
const seconds = timeRemaining % 60
const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

const isWarning = timeRemaining < 300 // 5 minutes

<div className={isWarning ? 'text-red-600' : 'text-slate-600'}>
  <Clock className="h-5 w-5" />
  {timeString}
</div>
```

---

## Security Features

### API Protection
- All endpoints protected by Clerk authentication
- Student profile verification
- Access control: Students can only view their own attempts
- Course enrollment verification

### Data Validation
- Question count validation (min 1 question)
- Time limit validation (min 1 minute)
- Max attempts validation (min 1)
- Answer format validation
- Points validation (min 1 point per question)

### Quiz Taking Security
- Questions served WITHOUT correct answers
- Answers only revealed after submission
- Attempt tracking prevents excessive retries
- Timer enforcement (auto-submit)
- Browser unload warning prevents data loss

---

## Testing Checklist

### Teacher Functionality
- ✅ Create quiz with all question types
- ✅ Edit quiz details
- ✅ Add/edit/delete questions
- ✅ Publish/unpublish quiz
- ✅ Delete quiz
- ✅ View quiz statistics

### Student Functionality
- ✅ View available quizzes
- ✅ Start quiz attempt
- ✅ Answer all question types
- ✅ Navigate between questions
- ✅ Submit quiz
- ✅ View results with detailed feedback
- ✅ Retry failed quiz
- ✅ Respect max attempts limit

### Timer Functionality
- ✅ Timer counts down correctly
- ✅ Warning displays at 5 minutes
- ✅ Auto-submit at 0 seconds
- ✅ Time tracking accuracy

### Grading System
- ✅ Multiple choice grading (exact match)
- ✅ True/false grading
- ✅ Short answer grading (normalized)
- ✅ Points calculation
- ✅ Percentage calculation
- ✅ Pass/fail determination

### Progress Calculation
- ✅ Progress includes lessons and quizzes
- ✅ Progress updates on lesson completion
- ✅ Progress updates on quiz pass
- ✅ Only best quiz attempt counts
- ✅ Only published quizzes count

### Integration
- ✅ Quizzes tab in course page
- ✅ Navigation to quiz list
- ✅ Navigation to attempt page
- ✅ Navigation to results page
- ✅ Back to course navigation

---

## File Structure

```
backend/
  src/
    modules/
      teacher/
        controllers/
          teacherQuizController.ts     # Teacher quiz endpoints
      student/
        controllers/
          studentQuizController.ts     # Student quiz endpoints
        services/
          courseProgressService.ts     # Updated with quiz progress
    routes/
      quizRoutes.ts                    # Quiz API routes

frontend/
  app/
    teacher/
      courses/
        [courseId]/
          quizzes/
            page.tsx                   # Teacher quiz list
            new/
              page.tsx                 # Teacher quiz create
      quizzes/
        [quizId]/
          edit/
            page.tsx                   # Teacher quiz edit
    student/
      courses/
        [courseId]/
          quizzes/
            page.tsx                   # Student quiz list
          learn/
            page.tsx                   # Updated with quizzes tab
      quizzes/
        [quizId]/
          attempt/
            page.tsx                   # Student quiz taking
      quiz-attempts/
        [attemptId]/
          results/
            page.tsx                   # Student quiz results

docs/
  QUIZ_SYSTEM_COMPLETE.md              # This documentation
```

---

## Usage Examples

### Teacher: Create a Quiz

1. Navigate to course quizzes page
2. Click "Create New Quiz"
3. Enter quiz details:
   - Title: "Week 1 Assessment"
   - Passing Score: 70%
   - Time Limit: 30 minutes
   - Max Attempts: 3
4. Add questions:
   - Question 1: Multiple choice (4 options)
   - Question 2: True/False
   - Question 3: Short answer
5. Add explanations for each question
6. Save as draft or publish immediately

### Student: Take a Quiz

1. Navigate to course page
2. Click "Quizzes" tab
3. View available quizzes
4. Click "Start Quiz" on a quiz
5. Answer questions (timer is running)
6. Navigate using Previous/Next
7. Submit when done
8. View results with detailed feedback
9. Retry if failed (if attempts remaining)

---

## Performance Optimizations

### Database
- Indexed foreign keys for fast lookups
- Composite indexes for quiz-student queries
- Efficient progress calculation function
- Single query for attempt results

### Frontend
- Lazy loading of quiz pages
- Optimistic UI updates
- Debounced answer inputs
- Memoized question rendering
- Pagination for large quiz lists

### API
- Batch question loading
- Single endpoint for submission
- Efficient grading algorithm
- Progress calculation on-demand

---

## Known Limitations

1. **Short Answer Grading:** Exact match only (no fuzzy matching)
2. **Question Order:** Fixed order (no randomization yet)
3. **Media Support:** Text-only questions (no images/videos yet)
4. **Partial Credit:** All-or-nothing grading (no partial points)
5. **Question Bank:** No reusable question library yet

---

## Future Enhancements

### Planned Features
- [ ] Question randomization
- [ ] Image/video support in questions
- [ ] Fuzzy matching for short answers
- [ ] Partial credit for multiple choice
- [ ] Question bank/library
- [ ] Quiz categories/tags
- [ ] Export results to CSV
- [ ] Quiz analytics dashboard
- [ ] Timed questions (per-question timer)
- [ ] Question explanations with rich media
- [ ] Peer review for short answers
- [ ] Adaptive difficulty

---

## Troubleshooting

### Common Issues

**Issue:** Timer not counting down
- **Cause:** `timeRemaining` is null
- **Solution:** Ensure quiz start API returns valid time_limit_minutes

**Issue:** Auto-submit not working
- **Cause:** setInterval not cleared
- **Solution:** Check cleanup in useEffect

**Issue:** Progress not updating
- **Cause:** RPC function not found
- **Solution:** Run migration to create `calculate_course_progress` function

**Issue:** Can't submit quiz
- **Cause:** Unanswered required questions
- **Solution:** Answer all questions or allow partial submission

**Issue:** Wrong score calculation
- **Cause:** Incorrect answer normalization
- **Solution:** Verify toLowerCase() and trim() are applied

---

## Migration History

1. **create_quiz_tables** - Initial schema
2. **add_quiz_indexes** - Performance indexes
3. **add_course_progress_function** - Progress calculation with quizzes

---

## API Error Codes

- `400` - Bad request (invalid data)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (access denied)
- `404` - Not found (quiz/question/attempt)
- `409` - Conflict (max attempts reached)
- `500` - Internal server error

---

## Conclusion

The quiz system is now fully implemented with:
- Complete database schema
- Full backend API
- Teacher management interface
- Student taking interface
- Auto-grading system
- Timer functionality
- Course integration
- Progress tracking

All planned features have been completed and tested. The system is ready for production use.

---

**Last Updated:** January 2024
**Version:** 1.0.0
**Status:** ✅ Production Ready
