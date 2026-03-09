# Phase 5: Unified Grading Dashboard ✅

**Status:** Complete  
**Duration:** 2-3 hours  
**Priority:** High

---

## 📋 Overview

The Unified Grading Dashboard aggregates scores from multiple sources (quizzes, assignments, attendance, midterm, final exams) and calculates weighted final grades based on course grading policies. It provides both teacher and student views with export functionality.

---

## ✨ Features Implemented

### 1. **Grade Calculation Engine**
- ✅ Aggregate scores from 5 components:
  - **Quizzes**: Average of all quiz attempts
  - **Assignments**: Average of activity submissions
  - **Midterm Exam**: Average of exam session marks
  - **Final Exam**: Latest exam submission score (Phase 4)
  - **Attendance**: Percentage based on live class attendance
- ✅ Weighted scoring based on grading policy
- ✅ Letter grade assignment (A+ to F scale)
- ✅ Pass/fail determination

### 2. **Teacher View**
- ✅ Complete gradebook for course
- ✅ Individual student grade details
- ✅ Grade statistics (average, median, min, max)
- ✅ Pass/fail/in-progress counts
- ✅ Export to CSV

### 3. **Student View**
- ✅ View own grade for a course
- ✅ Grade breakdown by component
- ✅ Grade history across all enrolled courses
- ✅ View grading policy

### 4. **Grading Policy Support**
- ✅ Configurable weights per course
- ✅ Default policy if not configured
- ✅ Passing grade threshold
- ✅ Policy retrieval for both roles

---

## 🗄️ Database Tables Used

### Existing Tables (No Changes Required)

**Primary Tables:**
- `course_grading_policies` - Stores weight configuration
- `enrollments` - Links students to courses
- `quiz_attempts` - Quiz scores
- `activity_submissions` - Assignment scores
- `exam_sessions` + `exam_marks` - Midterm exam scores
- `exam_submissions` - Final exam scores (Phase 4)
- `live_class_attendance` - Attendance records
- `profiles` - Student information

**Grading Policy Schema:**
```sql
CREATE TABLE course_grading_policies (
  id UUID PRIMARY KEY,
  course_id UUID UNIQUE REFERENCES courses(id),
  assignments_weight DECIMAL(5,2) DEFAULT 20.00,
  quizzes_weight DECIMAL(5,2) DEFAULT 30.00,
  midterm_weight DECIMAL(5,2) DEFAULT 15.00,
  final_exam_weight DECIMAL(5,2) DEFAULT 25.00,
  attendance_weight DECIMAL(5,2) DEFAULT 10.00,
  passing_grade DECIMAL(5,2) DEFAULT 60.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 API Endpoints

### Teacher Endpoints

#### 1. Get Complete Gradebook
```http
GET /api/teacher/courses/:courseId/gradebook
```

**Authentication:** Teacher role required

**Response:**
```json
{
  "success": true,
  "data": {
    "course_id": "uuid",
    "course_name": "Introduction to Islam",
    "grading_policy": {
      "quizzes_weight": 30,
      "assignments_weight": 20,
      "midterm_weight": 15,
      "final_exam_weight": 25,
      "attendance_weight": 10,
      "passing_grade": 60
    },
    "students": [
      {
        "student_id": "clerk_user_123",
        "student_name": "Ahmed Hassan",
        "student_email": "ahmed@example.com",
        "components": [
          {
            "name": "Quizzes",
            "type": "quizzes",
            "weight": 30,
            "score": 85.5,
            "weighted_score": 25.65,
            "items_count": 5
          },
          {
            "name": "Assignments",
            "type": "assignments",
            "weight": 20,
            "score": 90.0,
            "weighted_score": 18.0,
            "items_count": 3
          },
          {
            "name": "Midterm Exam",
            "type": "midterm",
            "weight": 15,
            "score": 78.0,
            "weighted_score": 11.7,
            "items_count": 1
          },
          {
            "name": "Final Exam",
            "type": "final_exam",
            "weight": 25,
            "score": 82.0,
            "weighted_score": 20.5,
            "items_count": 1
          },
          {
            "name": "Attendance",
            "type": "attendance",
            "weight": 10,
            "score": 95.0,
            "weighted_score": 9.5,
            "items_count": 10
          }
        ],
        "total_weighted_score": 85.35,
        "final_percentage": 85.35,
        "letter_grade": "A",
        "passed": true,
        "completion_status": "completed"
      }
    ],
    "statistics": {
      "total_students": 25,
      "passed": 20,
      "failed": 3,
      "in_progress": 2,
      "average_score": 78.45,
      "median_score": 80.0,
      "highest_score": 95.2,
      "lowest_score": 45.8
    }
  }
}
```

#### 2. Get Student Grade Detail
```http
GET /api/teacher/courses/:courseId/students/:studentId/grade
```

**Authentication:** Teacher role required

**Response:** Same structure as single student object from gradebook

#### 3. Export Gradebook to CSV
```http
GET /api/teacher/courses/:courseId/gradebook/export
```

**Authentication:** Teacher role required

**Response:** CSV file download
```csv
Student ID,Student Name,Student Email,Quizzes (%),Assignments (%),Midterm (%),Final Exam (%),Attendance (%),Total Weighted (%),Letter Grade,Status
clerk_user_123,Ahmed Hassan,ahmed@example.com,85.50,90.00,78.00,82.00,95.00,85.35,A,PASS
clerk_user_456,Fatima Ali,fatima@example.com,92.00,88.00,85.00,90.00,98.00,90.20,A+,PASS
```

#### 4. Get Grading Policy
```http
GET /api/teacher/courses/:courseId/grading-policy
```

**Authentication:** Teacher role required

**Response:**
```json
{
  "success": true,
  "data": {
    "assignments_weight": 20,
    "quizzes_weight": 30,
    "midterm_weight": 15,
    "final_exam_weight": 25,
    "attendance_weight": 10,
    "passing_grade": 60
  }
}
```

---

### Student Endpoints

#### 1. Get My Grade
```http
GET /api/student/courses/:courseId/grade
```

**Authentication:** Student role required

**Response:**
```json
{
  "success": true,
  "data": {
    "student_id": "clerk_user_123",
    "student_name": "Ahmed Hassan",
    "student_email": "ahmed@example.com",
    "components": [
      {
        "name": "Quizzes",
        "type": "quizzes",
        "weight": 30,
        "score": 85.5,
        "weighted_score": 25.65,
        "items_count": 5
      }
      // ... other components
    ],
    "total_weighted_score": 85.35,
    "final_percentage": 85.35,
    "letter_grade": "A",
    "passed": true,
    "completion_status": "completed"
  }
}
```

#### 2. Get Grade History
```http
GET /api/student/grade-history
```

**Authentication:** Student role required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "student_id": "clerk_user_123",
      "student_name": "Ahmed Hassan",
      "components": [...],
      "final_percentage": 85.35,
      "letter_grade": "A",
      "passed": true
    }
    // ... grades for other enrolled courses
  ]
}
```

#### 3. Get Grading Policy
```http
GET /api/student/courses/:courseId/grading-policy
```

**Authentication:** Student role required

**Response:** Same as teacher grading policy endpoint

---

## 🔧 Implementation Details

### File Structure

```
backend/src/
├── modules/
│   ├── shared/
│   │   └── services/
│   │       └── gradeDashboardService.ts (NEW - 680 lines)
│   ├── teacher/
│   │   └── controllers/
│   │       └── gradeDashboardController.ts (NEW - 130 lines)
│   └── student/
│       └── controllers/
│           └── studentGradeDashboardController.ts (NEW - 100 lines)
└── routes/
    ├── teacherCourseManagement.ts (MODIFIED - added 4 grade routes)
    └── studentExam.ts (MODIFIED - added 3 grade routes)
```

### Key Service Functions

**gradeDashboardService.ts:**

```typescript
// Calculate grade for a single student
export const calculateStudentGrade = async (
  courseId: string, 
  studentId: string
): Promise<StudentGradeSummary>

// Get complete gradebook for a course
export const getCourseGradebook = async (
  courseId: string
): Promise<CourseGradebook>

// Get grading policy
export const getCourseGradingPolicy = async (
  courseId: string
): Promise<GradingPolicy>

// Export to CSV
export const exportGradebookToCSV = (
  gradebook: CourseGradebook
): string

// Get grade history for student
export const getStudentGradeHistory = async (
  studentId: string
): Promise<StudentGradeSummary[]>
```

### Grade Calculation Logic

**Formula:**
```
Final Grade = (Quiz Score × Quiz Weight) + 
              (Assignment Score × Assignment Weight) +
              (Midterm Score × Midterm Weight) +
              (Final Exam Score × Final Exam Weight) +
              (Attendance % × Attendance Weight)
```

**Example:**
```
Policy: Q=30%, A=20%, M=15%, F=25%, At=10%
Scores: Q=85.5%, A=90%, M=78%, F=82%, At=95%

Weighted = (85.5 × 0.30) + (90 × 0.20) + (78 × 0.15) + (82 × 0.25) + (95 × 0.10)
         = 25.65 + 18.0 + 11.7 + 20.5 + 9.5
         = 85.35%

Letter Grade: A (80-85 range)
Status: PASS (≥60%)
```

### Letter Grade Scale

```typescript
A+: 90-100%
A:  85-89%
A-: 80-84%
B+: 75-79%
B:  70-74%
B-: 65-69%
C+: 60-64%
C:  55-59%
C-: 50-54%
D:  45-49%
F:  0-44%
```

---

## 🧪 Testing Guide

### Manual Testing

**1. Teacher Gradebook View**
```bash
# Get complete gradebook
curl -X GET "http://localhost:5000/api/teacher/courses/{courseId}/gradebook" \
  -H "Authorization: Bearer {teacher_jwt}"

# Expected: List of all students with grades
```

**2. Teacher CSV Export**
```bash
# Export gradebook
curl -X GET "http://localhost:5000/api/teacher/courses/{courseId}/gradebook/export" \
  -H "Authorization: Bearer {teacher_jwt}" \
  --output gradebook.csv

# Expected: CSV file downloaded
```

**3. Student Grade View**
```bash
# Get my grade
curl -X GET "http://localhost:5000/api/student/courses/{courseId}/grade" \
  -H "Authorization: Bearer {student_jwt}"

# Expected: Own grade breakdown
```

**4. Student Grade History**
```bash
# Get grade history
curl -X GET "http://localhost:5000/api/student/grade-history" \
  -H "Authorization: Bearer {student_jwt}"

# Expected: Grades for all enrolled courses
```

### Test Scenarios

**Scenario 1: Complete Course**
- Student: Has completed all quizzes, assignments, midterm, final exam
- Expected: `completion_status: "completed"`, accurate grade

**Scenario 2: In-Progress Course**
- Student: Has quizzes and assignments, no final exam yet
- Expected: `completion_status: "in-progress"`, partial grade

**Scenario 3: Perfect Attendance**
- Student: Attended all 10 live classes
- Expected: `attendance.score: 100%`, `attendance.weighted_score: 10%`

**Scenario 4: Zero Attendance**
- Student: Attended 0 live classes
- Expected: `attendance.score: 0%`, `attendance.weighted_score: 0%`

**Scenario 5: Default Policy**
- Course: No grading policy configured
- Expected: Default weights (Q=30, A=20, M=15, F=25, At=10)

**Scenario 6: Custom Policy**
- Course: Custom policy (Q=25, A=25, M=20, F=20, At=10)
- Expected: Grades calculated with custom weights

---

## 📊 Performance Considerations

### Database Queries

**Per Student (5 queries):**
1. Quiz attempts: AVG + COUNT
2. Assignment submissions: AVG + COUNT
3. Midterm exam marks: AVG + COUNT
4. Final exam submissions: Latest score
5. Live class attendance: Percentage calculation

**Optimization:**
- Connection pooling (already implemented)
- Indexed columns: `course_id`, `student_id`, `is_published`, `verified`
- Calculated fields cached in memory during request
- Statistics calculated once per gradebook request

### Expected Performance

**Gradebook (25 students):**
- Database queries: ~125 (5 per student)
- Response time: ~2-3 seconds
- CSV export: Additional ~200ms

**Single Student Grade:**
- Database queries: 5-6
- Response time: ~300-500ms

---

## 🎨 Frontend Integration Guide

### Teacher Gradebook Component

```tsx
'use client';

import { useEffect, useState } from 'react';

interface GradeComponent {
  name: string;
  type: string;
  weight: number;
  score: number;
  weighted_score: number;
  items_count: number;
}

interface StudentGrade {
  student_name: string;
  components: GradeComponent[];
  final_percentage: number;
  letter_grade: string;
  passed: boolean;
}

export default function TeacherGradebook({ courseId }: { courseId: string }) {
  const [gradebook, setGradebook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/courses/${courseId}/gradebook`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setGradebook(data.data);
        setLoading(false);
      });
  }, [courseId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1>{gradebook.course_name} - Gradebook</h1>
      
      {/* Statistics */}
      <div className="stats">
        <div>Average: {gradebook.statistics.average_score}%</div>
        <div>Passed: {gradebook.statistics.passed}/{gradebook.statistics.total_students}</div>
      </div>

      {/* Student List */}
      <table className="w-full mt-4">
        <thead>
          <tr>
            <th>Student</th>
            <th>Quizzes</th>
            <th>Assignments</th>
            <th>Final Exam</th>
            <th>Total</th>
            <th>Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {gradebook.students.map((student: StudentGrade) => (
            <tr key={student.student_name}>
              <td>{student.student_name}</td>
              <td>{student.components.find(c => c.type === 'quizzes')?.score.toFixed(1)}%</td>
              <td>{student.components.find(c => c.type === 'assignments')?.score.toFixed(1)}%</td>
              <td>{student.components.find(c => c.type === 'final_exam')?.score.toFixed(1)}%</td>
              <td>{student.final_percentage.toFixed(1)}%</td>
              <td>{student.letter_grade}</td>
              <td>{student.passed ? '✅ PASS' : '❌ FAIL'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Export Button */}
      <button 
        onClick={() => window.location.href = `/api/teacher/courses/${courseId}/gradebook/export`}
        className="mt-4 btn btn-primary"
      >
        Export to CSV
      </button>
    </div>
  );
}
```

### Student Grade Component

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function StudentGradeView({ courseId }: { courseId: string }) {
  const [grade, setGrade] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/student/courses/${courseId}/grade`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setGrade(data.data));
  }, [courseId]);

  if (!grade) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h2>Your Grade</h2>
      <div className="grade-summary">
        <div className="text-4xl">{grade.letter_grade}</div>
        <div>{grade.final_percentage.toFixed(1)}%</div>
        <div>{grade.passed ? '✅ PASSING' : '❌ FAILING'}</div>
      </div>

      <div className="mt-6">
        <h3>Breakdown</h3>
        {grade.components.map((component: any) => (
          <div key={component.type} className="flex justify-between p-3 border-b">
            <span>{component.name} ({component.weight}%)</span>
            <span>{component.score.toFixed(1)}% → {component.weighted_score.toFixed(2)} pts</span>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded">
        <strong>How It's Calculated:</strong>
        <p>Your final grade is the sum of weighted scores from all components.</p>
        <p>Passing grade: {grade.policy?.passing_grade || 60}%</p>
      </div>
    </div>
  );
}
```

---

## 🔄 Integration with Existing Systems

### Phase 1: Access Control
✅ **Already integrated** - Uses `requireAuth` and `requireRole` middleware

### Phase 4: Final Exam System
✅ **Already integrated** - Reads from `exam_submissions` table

### Existing Quiz System
✅ **Already integrated** - Reads from `quiz_attempts` table

### Existing Assignment System
✅ **Already integrated** - Reads from `activity_submissions` table

### Existing Attendance System
✅ **Already integrated** - Reads from `live_class_attendance` table

---

## 🚀 Deployment Notes

### No Database Migrations Required
All functionality uses existing tables. No schema changes needed.

### Environment Variables
None required beyond existing database connection.

### Backwards Compatibility
- ✅ Does not modify existing grade calculation service
- ✅ Adds new endpoints without breaking old ones
- ✅ Uses default policy if not configured

---

## ⏭️ Future Enhancements

### Phase 6: Resource Management (Next Phase)
- Resource library organization
- File upload and categorization
- Student access control

### Optional Enhancements:
1. **Grade Weighting Presets**
   - Save common grading policies as templates
   - Quick-apply to new courses

2. **Grade Analytics**
   - Trend analysis over multiple semesters
   - Identify at-risk students early

3. **Automated Notifications**
   - Email students when grades are updated
   - Alert teachers when student falls below passing

4. **Grade Appeals**
   - Students can request grade reviews
   - Teachers can review and respond

5. **Custom Grade Scales**
   - Institution-specific letter grades
   - GPA calculation

---

## 📝 Summary

✅ **Phase 5 Complete:**
- Unified grading dashboard with 5 component types
- Teacher gradebook with CSV export
- Student grade view with breakdown
- Grade history across courses
- Configurable grading policies
- Pass/fail determination
- Comprehensive statistics

**Total Implementation:**
- 3 new files created (910 lines)
- 2 existing files modified (added routes)
- 7 new API endpoints
- 0 database migrations required

**Ready for:** Frontend implementation and Phase 6 (Resource Management)