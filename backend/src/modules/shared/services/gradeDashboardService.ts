/**
 * Grade Dashboard Service
 * 
 * Provides unified grading dashboard functionality:
 * - Aggregate scores from quizzes, assignments, attendance, and final exams
 * - Calculate weighted totals based on course grading policy
 * - Show pass/fail status
 * - Support export to CSV/JSON
 * - Teacher view: All students in course
 * - Student view: Individual progress
 */

import pool from '../../../config/database';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface GradingPolicy {
  assignments_weight: number;
  quizzes_weight: number;
  midterm_weight: number;
  final_exam_weight: number;
  attendance_weight: number;
  passing_grade: number;
}

export interface GradeComponent {
  name: string;
  type: 'quizzes' | 'assignments' | 'midterm' | 'final_exam' | 'attendance';
  weight: number;
  score: number; // Actual percentage (0-100)
  weighted_score: number; // Contribution to final grade
  max_possible: number; // Maximum possible score in this category
  items_count: number; // Number of items (quizzes, assignments, etc.)
}

export interface StudentGradeSummary {
  student_id: string;
  student_name: string;
  student_email: string;
  
  // Grade breakdown
  components: GradeComponent[];
  
  // Summary
  total_weighted_score: number;
  final_percentage: number;
  letter_grade: string;
  passed: boolean;
  
  // Metadata
  last_updated: Date;
  completion_status: 'in-progress' | 'completed';
}

export interface CourseGradebook {
  course_id: string;
  course_name: string;
  grading_policy: GradingPolicy;
  students: StudentGradeSummary[];
  statistics: {
    total_students: number;
    passed: number;
    failed: number;
    in_progress: number;
    average_score: number;
    median_score: number;
    highest_score: number;
    lowest_score: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get letter grade from percentage
 */
const getLetterGrade = (percentage: number): string => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 45) return 'D';
  return 'F';
};

/**
 * Calculate statistics from student grades
 */
const calculateStatistics = (students: StudentGradeSummary[]) => {
  const scores = students.map(s => s.final_percentage).sort((a, b) => a - b);
  const passed = students.filter(s => s.passed).length;
  const failed = students.filter(s => !s.passed && s.completion_status === 'completed').length;
  const in_progress = students.filter(s => s.completion_status === 'in-progress').length;
  
  const average = scores.length > 0 
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
    : 0;
  
  const median = scores.length > 0
    ? scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)]
    : 0;
  
  return {
    total_students: students.length,
    passed,
    failed,
    in_progress,
    average_score: Math.round(average * 100) / 100,
    median_score: Math.round(median * 100) / 100,
    highest_score: scores.length > 0 ? scores[scores.length - 1] : 0,
    lowest_score: scores.length > 0 ? scores[0] : 0,
  };
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get grading policy for a course
 */
export const getCourseGradingPolicy = async (courseId: string): Promise<GradingPolicy> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        assignments_weight,
        quizzes_weight,
        midterm_weight,
        final_exam_weight,
        attendance_weight,
        passing_grade
      FROM course_grading_policies
      WHERE course_id = $1`,
      [courseId]
    );
    
    if (result.rows.length === 0) {
      // Return default policy if not configured
      return {
        assignments_weight: 20,
        quizzes_weight: 30,
        midterm_weight: 15,
        final_exam_weight: 25,
        attendance_weight: 10,
        passing_grade: 60,
      };
    }
    
    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Calculate quiz score for a student in a course
 */
const calculateQuizScore = async (courseId: string, studentId: string): Promise<{ score: number; count: number }> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        AVG(qa.percentage) as avg_percentage,
        COUNT(qa.id) as quiz_count
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON qa.quiz_id = q.id
      WHERE q.course_id = $1 
        AND qa.student_id = $2
        AND q.is_published = true
      GROUP BY qa.student_id`,
      [courseId, studentId]
    );
    
    if (result.rows.length === 0) {
      return { score: 0, count: 0 };
    }
    
    return {
      score: parseFloat(result.rows[0].avg_percentage) || 0,
      count: parseInt(result.rows[0].quiz_count) || 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Calculate assignment score for a student in a course
 * Uses activity_submissions and lesson_activities tables
 */
const calculateAssignmentScore = async (courseId: string, studentId: string): Promise<{ score: number; count: number }> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        AVG(CASE 
          WHEN la.total_marks > 0 
          THEN (asub.marks_obtained::float / la.total_marks::float) * 100 
          ELSE 0 
        END) as avg_percentage,
        COUNT(asub.id) as assignment_count
      FROM activity_submissions asub
      INNER JOIN lesson_activities la ON asub.activity_id = la.id
      INNER JOIN section_lessons sl ON la.lesson_id = sl.id
      INNER JOIN course_sections cs ON sl.section_id = cs.id
      WHERE cs.course_id = $1 
        AND asub.student_id = $2
        AND la.is_graded = true
        AND asub.marks_obtained IS NOT NULL
      GROUP BY asub.student_id`,
      [courseId, studentId]
    );
    
    if (result.rows.length === 0) {
      return { score: 0, count: 0 };
    }
    
    return {
      score: parseFloat(result.rows[0].avg_percentage) || 0,
      count: parseInt(result.rows[0].assignment_count) || 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Calculate midterm exam score for a student
 * Uses exam_sessions and exam_marks tables
 */
const calculateMidtermScore = async (courseId: string, studentId: string): Promise<{ score: number; count: number }> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        AVG(em.percentage) as avg_percentage,
        COUNT(em.id) as exam_count
      FROM exam_marks em
      INNER JOIN exam_sessions es ON em.exam_session_id = es.id
      WHERE es.course_id = $1 
        AND em.student_id = $2
        AND es.exam_type = 'written'
        AND em.verified = true
      GROUP BY em.student_id`,
      [courseId, studentId]
    );
    
    if (result.rows.length === 0) {
      return { score: 0, count: 0 };
    }
    
    return {
      score: parseFloat(result.rows[0].avg_percentage) || 0,
      count: parseInt(result.rows[0].exam_count) || 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Calculate final exam score for a student
 * Uses exam_submissions table (Phase 4 implementation)
 */
const calculateFinalExamScore = async (courseId: string, studentId: string): Promise<{ score: number; count: number }> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        (es.total_score::float / ce.total_marks::float) * 100 as percentage,
        1 as exam_count
      FROM exam_submissions es
      INNER JOIN course_exams ce ON es.exam_id = ce.id
      WHERE ce.course_id = $1 
        AND es.student_id = $2
        AND es.status IN ('submitted', 'graded')
      ORDER BY es.submitted_at DESC
      LIMIT 1`,
      [courseId, studentId]
    );
    
    if (result.rows.length === 0) {
      return { score: 0, count: 0 };
    }
    
    return {
      score: parseFloat(result.rows[0].percentage) || 0,
      count: parseInt(result.rows[0].exam_count) || 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Calculate attendance percentage for a student
 * Uses live_class_attendance table
 */
const calculateAttendanceScore = async (courseId: string, studentId: string): Promise<{ score: number; count: number }> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        COUNT(CASE WHEN lca.attendance_status = 'present' THEN 1 END)::float / 
        NULLIF(COUNT(lca.id), 0)::float * 100 as attendance_percentage,
        COUNT(lca.id) as total_classes
      FROM live_class_attendance lca
      INNER JOIN live_class_schedules lcs ON lca.schedule_id = lcs.id
      WHERE lcs.course_id = $1 
        AND lca.student_id = $2`,
      [courseId, studentId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].attendance_percentage) {
      return { score: 0, count: 0 };
    }
    
    return {
      score: parseFloat(result.rows[0].attendance_percentage) || 0,
      count: parseInt(result.rows[0].total_classes) || 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Calculate complete grade for a student in a course
 */
export const calculateStudentGrade = async (
  courseId: string, 
  studentId: string
): Promise<StudentGradeSummary> => {
  // Get grading policy
  const policy = await getCourseGradingPolicy(courseId);
  
  // Get student info
  const client = await pool.connect();
  try {
    const studentResult = await client.query(
      `SELECT 
        p.clerk_user_id as student_id,
        p.full_name as student_name,
        p.email as student_email
      FROM profiles p
      WHERE p.clerk_user_id = $1`,
      [studentId]
    );
    
    if (studentResult.rows.length === 0) {
      throw new Error('Student not found');
    }
    
    const student = studentResult.rows[0];
    
    // Calculate all components
    const quizzes = await calculateQuizScore(courseId, studentId);
    const assignments = await calculateAssignmentScore(courseId, studentId);
    const midterm = await calculateMidtermScore(courseId, studentId);
    const finalExam = await calculateFinalExamScore(courseId, studentId);
    const attendance = await calculateAttendanceScore(courseId, studentId);
    
    // Build grade components
    const components: GradeComponent[] = [
      {
        name: 'Quizzes',
        type: 'quizzes',
        weight: policy.quizzes_weight,
        score: quizzes.score,
        weighted_score: (quizzes.score * policy.quizzes_weight) / 100,
        max_possible: 100,
        items_count: quizzes.count,
      },
      {
        name: 'Assignments',
        type: 'assignments',
        weight: policy.assignments_weight,
        score: assignments.score,
        weighted_score: (assignments.score * policy.assignments_weight) / 100,
        max_possible: 100,
        items_count: assignments.count,
      },
      {
        name: 'Midterm Exam',
        type: 'midterm',
        weight: policy.midterm_weight,
        score: midterm.score,
        weighted_score: (midterm.score * policy.midterm_weight) / 100,
        max_possible: 100,
        items_count: midterm.count,
      },
      {
        name: 'Final Exam',
        type: 'final_exam',
        weight: policy.final_exam_weight,
        score: finalExam.score,
        weighted_score: (finalExam.score * policy.final_exam_weight) / 100,
        max_possible: 100,
        items_count: finalExam.count,
      },
      {
        name: 'Attendance',
        type: 'attendance',
        weight: policy.attendance_weight,
        score: attendance.score,
        weighted_score: (attendance.score * policy.attendance_weight) / 100,
        max_possible: 100,
        items_count: attendance.count,
      },
    ];
    
    // Calculate total weighted score
    const totalWeightedScore = components.reduce((sum, c) => sum + c.weighted_score, 0);
    const finalPercentage = totalWeightedScore;
    const letterGrade = getLetterGrade(finalPercentage);
    const passed = finalPercentage >= policy.passing_grade;
    
    // Determine completion status
    const hasAllComponents = finalExam.count > 0; // Final exam taken = completed
    const completionStatus = hasAllComponents ? 'completed' : 'in-progress';
    
    return {
      student_id: student.student_id,
      student_name: student.student_name,
      student_email: student.student_email,
      components,
      total_weighted_score: Math.round(totalWeightedScore * 100) / 100,
      final_percentage: Math.round(finalPercentage * 100) / 100,
      letter_grade: letterGrade,
      passed,
      last_updated: new Date(),
      completion_status: completionStatus,
    };
  } finally {
    client.release();
  }
};

/**
 * Get complete gradebook for a course (teacher view)
 */
export const getCourseGradebook = async (courseId: string): Promise<CourseGradebook> => {
  const client = await pool.connect();
  try {
    // Get course info
    const courseResult = await client.query(
      'SELECT title FROM courses WHERE id = $1',
      [courseId]
    );
    
    if (courseResult.rows.length === 0) {
      throw new Error('Course not found');
    }
    
    // Get all enrolled students
    const studentsResult = await client.query(
      `SELECT DISTINCT e.student_id
      FROM enrollments e
      WHERE e.course_id = $1 
        AND e.status = 'active'`,
      [courseId]
    );
    
    // Calculate grades for all students
    const studentGrades: StudentGradeSummary[] = [];
    for (const row of studentsResult.rows) {
      try {
        const grade = await calculateStudentGrade(courseId, row.student_id);
        studentGrades.push(grade);
      } catch (error) {
        console.error(`Failed to calculate grade for student ${row.student_id}:`, error);
        // Continue with other students
      }
    }
    
    // Get grading policy
    const policy = await getCourseGradingPolicy(courseId);
    
    // Calculate statistics
    const statistics = calculateStatistics(studentGrades);
    
    return {
      course_id: courseId,
      course_name: courseResult.rows[0].title,
      grading_policy: policy,
      students: studentGrades,
      statistics,
    };
  } finally {
    client.release();
  }
};

/**
 * Export gradebook to CSV format
 */
export const exportGradebookToCSV = (gradebook: CourseGradebook): string => {
  const headers = [
    'Student ID',
    'Student Name',
    'Student Email',
    'Quizzes (%)',
    'Assignments (%)',
    'Midterm (%)',
    'Final Exam (%)',
    'Attendance (%)',
    'Total Weighted (%)',
    'Letter Grade',
    'Status',
  ];
  
  const rows = gradebook.students.map(student => [
    student.student_id,
    student.student_name,
    student.student_email,
    student.components.find(c => c.type === 'quizzes')?.score.toFixed(2) || '0.00',
    student.components.find(c => c.type === 'assignments')?.score.toFixed(2) || '0.00',
    student.components.find(c => c.type === 'midterm')?.score.toFixed(2) || '0.00',
    student.components.find(c => c.type === 'final_exam')?.score.toFixed(2) || '0.00',
    student.components.find(c => c.type === 'attendance')?.score.toFixed(2) || '0.00',
    student.total_weighted_score.toFixed(2),
    student.letter_grade,
    student.passed ? 'PASS' : 'FAIL',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  return csvContent;
};

/**
 * Get grade history for a student across all courses
 */
export const getStudentGradeHistory = async (studentId: string): Promise<StudentGradeSummary[]> => {
  const client = await pool.connect();
  try {
    // Get all courses student is enrolled in
    const coursesResult = await client.query(
      `SELECT DISTINCT e.course_id
      FROM enrollments e
      WHERE e.student_id = $1`,
      [studentId]
    );
    
    const grades: StudentGradeSummary[] = [];
    for (const row of coursesResult.rows) {
      try {
        const grade = await calculateStudentGrade(row.course_id, studentId);
        grades.push(grade);
      } catch (error) {
        console.error(`Failed to calculate grade for course ${row.course_id}:`, error);
      }
    }
    
    return grades;
  } finally {
    client.release();
  }
};
