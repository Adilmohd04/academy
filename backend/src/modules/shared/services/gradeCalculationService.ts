/**
 * Grade Calculation Service
 * 
 * Handles final grade calculation:
 * - Internal Assessments (quizzes/activities) = 40%
 * - Final Exam = 60%
 * - Pass threshold = 40%
 * - Certificate eligibility
 */

import { supabase } from '../../../config/database';
import { issueCertificate as issueCertificateThroughLifecycle } from '../../certificate/services/issuanceService';

export interface StudentGrade {
  id: string;
  course_id: string;
  student_id: string;
  internal_assessment_average: number; // Average of all quizzes/activities
  internal_assessment_weighted: number; // Converted to 40%
  final_exam_score: number; // Out of 100
  final_exam_weighted: number; // Converted to 60%
  final_grade: number; // Total out of 100
  letter_grade: string;
  passed: boolean;
  assessment_count: number;
  last_calculated_at: string;
}

export interface GradeCalculationResult {
  internal_assessment_average: number;
  internal_assessment_weighted: number;
  final_exam_score: number;
  final_exam_weighted: number;
  final_grade: number;
  letter_grade: string;
  passed: boolean;
  assessment_count: number;
  final_exam_taken: boolean;
}

/**
 * Calculate and save final grade for a student in a course
 * 
 * Formula:
 * - Internal Assessment (quizzes/activities average) = 40% of final grade
 * - Final Exam = 60% of final grade
 * - Pass if total >= 40%
 */
export const calculateFinalGrade = async (
  courseId: string,
  studentId: string
): Promise<GradeCalculationResult> => {
  // Get course passing threshold (default 40%)
  const { data: course } = await supabase
    .from('courses')
    .select('passing_threshold')
    .eq('id', courseId)
    .single();

  const passingThreshold = course?.passing_threshold || 40;
  const internalWeight = 40; // 40% for internal assessments
  const finalExamWeight = 60; // 60% for final exam

  // Calculate internal assessment average (all quizzes)
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select(`
      percentage,
      quizzes!inner (
        is_graded,
        lesson_id,
        course_lessons!inner (
          course_weeks!inner (
            course_id
          )
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('quizzes.is_graded', true);

  // Filter quiz attempts for this course
  const courseQuizAttempts = (quizAttempts || []).filter((a: any) => 
    a.quizzes?.course_lessons?.course_weeks?.course_id === courseId
  );

  const internalScores = courseQuizAttempts.map((a: any) => a.percentage || 0);
  const internalAverage = internalScores.length > 0
    ? internalScores.reduce((sum: number, s: number) => sum + s, 0) / internalScores.length
    : 0;

  // Convert internal average to 50% weight
  const internalWeighted = (internalAverage * internalWeight) / 100;

  // Get final exam score
  const { data: finalExam } = await supabase
    .from('final_exams')
    .select('score')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .eq('status', 'graded')
    .single();

  const finalExamScore = finalExam?.score || 0;
  const finalExamTaken = !!finalExam;
  
  // Convert final exam to 50% weight
  const finalExamWeighted = (finalExamScore * finalExamWeight) / 100;

  // Calculate total final grade
  const finalGrade = internalWeighted + finalExamWeighted;
  const passed = finalGrade >= passingThreshold;
  const letterGrade = getLetterGrade(finalGrade);

  // Save or update grade record
  const { data: existingGrade } = await supabase
    .from('student_grades')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .single();

  const gradeData = {
    course_id: courseId,
    student_id: studentId,
    quiz_average: Math.round(internalAverage * 100) / 100,
    assignment_average: Math.round(internalWeighted * 100) / 100, // Using this field for internal weighted
    final_grade: Math.round(finalGrade * 100) / 100,
    letter_grade: letterGrade,
    passed,
    quiz_weight: internalWeight,
    assignment_weight: finalExamWeight,
    last_calculated_at: new Date().toISOString()
  };

  if (existingGrade) {
    await supabase
      .from('student_grades')
      .update(gradeData)
      .eq('id', existingGrade.id);
  } else {
    await supabase
      .from('student_grades')
      .insert([gradeData]);
  }

  return {
    internal_assessment_average: Math.round(internalAverage * 100) / 100,
    internal_assessment_weighted: Math.round(internalWeighted * 100) / 100,
    final_exam_score: finalExamScore,
    final_exam_weighted: Math.round(finalExamWeighted * 100) / 100,
    final_grade: Math.round(finalGrade * 100) / 100,
    letter_grade: letterGrade,
    passed,
    assessment_count: internalScores.length,
    final_exam_taken: finalExamTaken
  };
};

/**
 * Get letter grade from percentage
 */
const getLetterGrade = (percentage: number): string => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

/**
 * Get student's grade for a course
 */
export const getStudentGrade = async (
  courseId: string,
  studentId: string
): Promise<StudentGrade | null> => {
  const { data, error } = await supabase
    .from('student_grades')
    .select('*')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch grade: ${error.message}`);
  }

  return data;
};

/**
 * Get all student grades for a course (teacher view)
 */
export const getCourseGrades = async (courseId: string): Promise<StudentGrade[]> => {
  const { data, error } = await supabase
    .from('student_grades')
    .select('*')
    .eq('course_id', courseId)
    .order('final_grade', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch grades: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // Enrich with student info from profiles
  const studentIds = [...new Set(data.map(g => g.student_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('clerk_user_id, full_name, email')
    .in('clerk_user_id', studentIds);

  const profileMap = new Map((profiles || []).map(p => [p.clerk_user_id, p]));

  return data.map(grade => ({
    ...grade,
    student_name: profileMap.get(grade.student_id)?.full_name || null,
    student_email: profileMap.get(grade.student_id)?.email || null,
  }));
};

/**
 * Check if student is eligible for certificate
 */
export const checkCertificateEligibility = async (
  courseId: string,
  studentId: string
): Promise<{
  eligible: boolean;
  reason: string;
  final_grade?: number;
}> => {
  // Recalculate to get latest grade
  const result = await calculateFinalGrade(courseId, studentId);

  if (result.passed) {
    return {
      eligible: true,
      reason: 'Student has passed the course',
      final_grade: result.final_grade
    };
  }

  return {
    eligible: false,
    reason: `Student did not meet passing threshold. Final grade: ${result.final_grade}%`,
    final_grade: result.final_grade
  };
};

/**
 * Compatibility adapter for the legacy teacher grade screen.
 *
 * Issuance is intentionally delegated to the certificate lifecycle.  The old
 * implementation inserted a lightweight certificate_url row, which skipped
 * secure verification code/QR creation and could not be verified publicly.
 */
export const issueCertificate = async (
  courseId: string,
  studentId: string,
  options?: {
    isManualOverride?: boolean;
    overrideBy?: string;
    overrideReason?: string;
  }
): Promise<{ id: string; certificate_url: string }> => {
  const override = options?.isManualOverride
    ? {
        reason: String(options.overrideReason || '').trim(),
        by: String(options.overrideBy || '').trim(),
      }
    : undefined;

  if (options?.isManualOverride && (!override?.reason || !override.by)) {
    throw new Error('A manual certificate override requires an approver and reason');
  }

  const result = await issueCertificateThroughLifecycle(courseId, studentId, { override });
  if (result.ok === false) {
    const unmet = result.unmet?.length ? ` (${result.unmet.join(', ')})` : '';
    throw new Error(`Certificate issuance failed: ${result.error}${unmet}`);
  }

  const certificate = result.certificate;
  if (String(certificate?.status || '').toLowerCase() === 'revoked') {
    throw new Error('Certificate is revoked. Use the approved reissue workflow instead.');
  }

  return {
    id: certificate.id,
    // Retain the legacy response field without inventing an unverified URL.
    // The canonical service supplies a QR-backed verification code; a PDF URL
    // is present only after the renderer has generated the certificate.
    certificate_url: certificate.pdf_url || certificate.certificate_url || '',
  };
};

/**
 * Admin: Force issue certificate for failed student
 */
export const adminOverrideCertificate = async (
  courseId: string,
  studentId: string,
  adminId: string,
  reason: string
): Promise<{ id: string; certificate_url: string }> => {
  return issueCertificate(courseId, studentId, {
    isManualOverride: true,
    overrideBy: adminId,
    overrideReason: reason
  });
};
