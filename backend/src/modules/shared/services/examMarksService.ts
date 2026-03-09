/**
 * Exam Marks Service
 * 
 * Service for admin manual exam marks entry
 * Supports interview-based, practical, and viva exams
 */

import { supabase } from '../../../config/database';

// Types
interface ExamSession {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  exam_date: string;
  exam_type: 'interview' | 'written' | 'practical' | 'viva';
  total_marks: number;
  passing_marks: number;
  duration_minutes?: number;
  venue?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
}

interface ExamMark {
  id: string;
  exam_session_id: string;
  student_id: string;
  marks_obtained: number;
  percentage: number;
  grade: string;
  remarks?: string;
  attendance_status: 'present' | 'absent' | 'excused';
  entered_by: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

interface BulkMarkEntry {
  student_id: string;
  marks_obtained: number;
  remarks?: string;
  attendance_status?: 'present' | 'absent' | 'excused';
}

// ============================================
// EXAM SESSION MANAGEMENT
// ============================================

/**
 * Create an exam session
 */
export const createExamSession = async (
  courseId: string,
  data: {
    title: string;
    description?: string;
    exam_date: string;
    exam_type: string;
    total_marks: number;
    passing_marks: number;
    duration_minutes?: number;
    venue?: string;
  },
  createdBy: string
): Promise<ExamSession> => {
  const { data: result, error } = await supabase
    .from('exam_sessions')
    .insert({
      course_id: courseId,
      title: data.title,
      description: data.description,
      exam_date: data.exam_date,
      exam_type: data.exam_type,
      total_marks: data.total_marks,
      passing_marks: data.passing_marks,
      duration_minutes: data.duration_minutes,
      venue: data.venue,
      created_by: createdBy
    })
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

/**
 * Get exam sessions for a course
 */
export const getCourseExamSessions = async (
  courseId: string
): Promise<ExamSession[]> => {
  const { data: sessions, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('course_id', courseId)
    .order('exam_date', { ascending: false });
  
  if (error) throw error;
  
  // Enrich with counts
  const enrichedSessions = [];
  for (const session of sessions || []) {
    const { count: marksEntered } = await supabase
      .from('exam_marks')
      .select('id', { count: 'exact' })
      .eq('exam_session_id', session.id);
    
    const { count: totalStudents } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('course_id', courseId)
      .eq('status', 'active');
    
    enrichedSessions.push({
      ...session,
      marks_entered: marksEntered || 0,
      total_students: totalStudents || 0
    });
  }
  
  return enrichedSessions;
};

/**
 * Get exam session by ID
 */
export const getExamSessionById = async (
  sessionId: string
): Promise<ExamSession | null> => {
  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  
  if (error) throw error;
  if (!session) return null;
  
  // Get course title
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', session.course_id)
    .maybeSingle();
  
  // Get creator name from profiles table
  const { data: user } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('clerk_user_id', session.created_by)
    .maybeSingle();
  
  return {
    ...session,
    course_title: course?.title,
    created_by_name: user?.full_name || null
  };
};

/**
 * Update exam session status
 */
export const updateExamSessionStatus = async (
  sessionId: string,
  status: string
): Promise<ExamSession> => {
  const { data: result, error } = await supabase
    .from('exam_sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  if (!result) throw new Error('Exam session not found');
  
  return result;
};

// ============================================
// EXAM MARKS ENTRY
// ============================================

/**
 * Enter marks for a single student
 */
export const enterStudentMarks = async (
  sessionId: string,
  studentId: string,
  marksObtained: number,
  enteredBy: string,
  options: {
    remarks?: string;
    attendance_status?: string;
  } = {}
): Promise<ExamMark> => {
  // Validate marks against total
  const session = await getExamSessionById(sessionId);
  if (!session) {
    throw new Error('Exam session not found');
  }
  
  if (marksObtained < 0 || marksObtained > session.total_marks) {
    throw new Error(`Marks must be between 0 and ${session.total_marks}`);
  }
  
  const { data: result, error } = await supabase
    .from('exam_marks')
    .upsert({
      exam_session_id: sessionId,
      student_id: studentId,
      marks_obtained: marksObtained,
      remarks: options.remarks,
      attendance_status: options.attendance_status || 'present',
      entered_by: enteredBy,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'exam_session_id,student_id'
    })
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

/**
 * Bulk enter marks for multiple students
 */
export const bulkEnterMarks = async (
  sessionId: string,
  marks: BulkMarkEntry[],
  enteredBy: string
): Promise<{
  success: ExamMark[];
  failed: Array<{ student_id: string; error: string }>;
}> => {
  const session = await getExamSessionById(sessionId);
  if (!session) {
    throw new Error('Exam session not found');
  }
  
  const success: ExamMark[] = [];
  const failed: Array<{ student_id: string; error: string }> = [];
  
  for (const entry of marks) {
    try {
      if (entry.marks_obtained < 0 || entry.marks_obtained > session.total_marks) {
        failed.push({
          student_id: entry.student_id,
          error: `Marks must be between 0 and ${session.total_marks}`
        });
        continue;
      }
      
      const { data: result, error } = await supabase
        .from('exam_marks')
        .upsert({
          exam_session_id: sessionId,
          student_id: entry.student_id,
          marks_obtained: entry.marks_obtained,
          remarks: entry.remarks,
          attendance_status: entry.attendance_status || 'present',
          entered_by: enteredBy,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'exam_session_id,student_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      success.push(result);
    } catch (err: any) {
      failed.push({
        student_id: entry.student_id,
        error: err.message
      });
    }
  }
  
  return { success, failed };
};

/**
 * Get all marks for an exam session
 */
export const getExamSessionMarks = async (
  sessionId: string
): Promise<{
  session: ExamSession;
  marks: any[];
  statistics: {
    total_students: number;
    marks_entered: number;
    average: number;
    highest: number;
    lowest: number;
    pass_count: number;
    fail_count: number;
    absent_count: number;
  };
}> => {
  const session = await getExamSessionById(sessionId);
  if (!session) {
    throw new Error('Exam session not found');
  }
  
  // Get marks with student details
  const { data: marksData, error: marksError } = await supabase
    .from('exam_marks')
    .select('*')
    .eq('exam_session_id', sessionId)
    .order('marks_obtained', { ascending: false });
  
  if (marksError) throw marksError;
  
  // Enrich with student info and calculations
  const enrichedMarks = [];
  for (const mark of marksData || []) {
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('clerk_user_id', mark.student_id)
      .maybeSingle();
    
    const percentage = ((mark.marks_obtained / session.total_marks) * 100).toFixed(2);
    const result = mark.marks_obtained >= session.passing_marks ? 'PASS' : 'FAIL';
    
    enrichedMarks.push({
      ...mark,
      student_name: user?.full_name || null,
      student_email: user?.email,
      percentage: parseFloat(percentage),
      result
    });
  }
  
  // Calculate statistics
  const presentMarks = enrichedMarks.filter(m => m.attendance_status === 'present');
  const statistics = {
    total_students: 0,
    marks_entered: presentMarks.length,
    average: 0,
    highest: 0,
    lowest: 0,
    pass_count: 0,
    fail_count: 0,
    absent_count: enrichedMarks.filter(m => m.attendance_status === 'absent').length
  };
  
  if (presentMarks.length > 0) {
    const marksValues = presentMarks.map(m => m.marks_obtained);
    statistics.average = parseFloat((marksValues.reduce((a, b) => a + b, 0) / marksValues.length).toFixed(2));
    statistics.highest = Math.max(...marksValues);
    statistics.lowest = Math.min(...marksValues);
    statistics.pass_count = presentMarks.filter(m => m.marks_obtained >= session.passing_marks).length;
    statistics.fail_count = presentMarks.filter(m => m.marks_obtained < session.passing_marks).length;
  }
  
  // Get total enrolled students
  const { count: totalStudents } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact' })
    .eq('course_id', session.course_id)
    .eq('status', 'active');
  
  statistics.total_students = totalStudents || 0;
  
  return {
    session,
    marks: enrichedMarks,
    statistics
  };
};

/**
 * Verify marks (admin verification of entered marks)
 */
export const verifyMarks = async (
  marksId: string,
  verifiedBy: string
): Promise<ExamMark> => {
  const { data: result, error } = await supabase
    .from('exam_marks')
    .update({
      verified_by: verifiedBy,
      verified_at: new Date().toISOString()
    })
    .eq('id', marksId)
    .select()
    .single();
  
  if (error) throw error;
  if (!result) throw new Error('Exam marks not found');
  
  // Log verification
  await supabase
    .from('exam_marks_audit')
    .insert({
      exam_marks_id: marksId,
      action: 'verified',
      new_marks: result.marks_obtained,
      changed_by: verifiedBy
    });
  
  return result;
};

/**
 * Bulk verify all marks in a session
 */
export const bulkVerifyMarks = async (
  sessionId: string,
  verifiedBy: string
): Promise<number> => {
  const { data: result, error } = await supabase
    .from('exam_marks')
    .update({
      verified_by: verifiedBy,
      verified_at: new Date().toISOString()
    })
    .eq('exam_session_id', sessionId)
    .is('verified_by', null)
    .select('id');
  
  if (error) throw error;
  return result?.length || 0;
};

/**
 * Get student's exam marks across all exams
 */
export const getStudentExamMarks = async (
  studentId: string,
  courseId?: string
): Promise<any[]> => {
  // Get all marks for the student
  const { data: marks, error: marksError } = await supabase
    .from('exam_marks')
    .select('*')
    .eq('student_id', studentId);
  
  if (marksError) throw marksError;
  
  // Enrich with exam and course info
  const enrichedMarks = [];
  for (const mark of marks || []) {
    const { data: session } = await supabase
      .from('exam_sessions')
      .select('title, exam_type, exam_date, total_marks, passing_marks, course_id')
      .eq('id', mark.exam_session_id)
      .maybeSingle();
    
    if (!session) continue;
    
    // Filter by course if specified
    if (courseId && session.course_id !== courseId) continue;
    
    const { data: course } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', session.course_id)
      .maybeSingle();
    
    const percentage = ((mark.marks_obtained / session.total_marks) * 100).toFixed(2);
    const result = mark.marks_obtained >= session.passing_marks ? 'PASS' : 'FAIL';
    
    enrichedMarks.push({
      ...mark,
      exam_title: session.title,
      exam_type: session.exam_type,
      exam_date: session.exam_date,
      total_marks: session.total_marks,
      passing_marks: session.passing_marks,
      course_id: course?.id,
      course_title: course?.title,
      percentage: parseFloat(percentage),
      result
    });
  }
  
  // Sort by exam date descending
  enrichedMarks.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
  
  return enrichedMarks;
};

/**
 * Get enrolled students for marks entry (shows who hasn't been marked yet)
 */
export const getStudentsForMarksEntry = async (
  sessionId: string
): Promise<{
  marked: any[];
  unmarked: any[];
}> => {
  const session = await getExamSessionById(sessionId);
  if (!session) {
    throw new Error('Exam session not found');
  }
  
  // Get all enrolled students
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', session.course_id)
    .eq('status', 'active');
  
  if (enrollError) throw enrollError;
  
  // Enrich with user info from profiles table
  const enrolledStudents = [];
  for (const enrollment of enrollments || []) {
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', enrollment.student_id)
      .maybeSingle();
    
    // Also try by clerk_user_id if not found by id
    let profile = user;
    if (!profile) {
      const { data: profileByClerk } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('clerk_user_id', enrollment.student_id)
        .maybeSingle();
      profile = profileByClerk;
    }
    
    const nameParts = (profile?.full_name || '').split(' ');
    enrolledStudents.push({
      student_id: enrollment.student_id,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      full_name: profile?.full_name || '',
      email: profile?.email || '',
      profile_image_url: null
    });
  }
  
  // Sort by name
  enrolledStudents.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  
  // Get students who already have marks
  const { data: markedData, error: markedError } = await supabase
    .from('exam_marks')
    .select('*')
    .eq('exam_session_id', sessionId);
  
  if (markedError) throw markedError;
  
  // Enrich marked students with profile info
  const markedStudents = [];
  for (const mark of markedData || []) {
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('clerk_user_id', mark.student_id)
      .maybeSingle();
    
    const nameParts = (user?.full_name || '').split(' ');
    markedStudents.push({
      ...mark,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      full_name: user?.full_name || null,
      email: user?.email || null
    });
  }
  
  const markedStudentIds = new Set(markedStudents.map(r => r.student_id));
  
  return {
    marked: markedStudents,
    unmarked: enrolledStudents.filter(s => !markedStudentIds.has(s.student_id))
  };
};

/**
 * Sync exam marks to grades table (for final grade calculation)
 */
export const syncMarksToGrades = async (
  sessionId: string
): Promise<number> => {
  const session = await getExamSessionById(sessionId);
  if (!session) {
    throw new Error('Exam session not found');
  }
  
  // Get all present marks
  const { data: marks, error } = await supabase
    .from('exam_marks')
    .select('*')
    .eq('exam_session_id', sessionId)
    .eq('attendance_status', 'present');
  
  if (error) throw error;
  
  let syncedCount = 0;
  
  for (const mark of marks || []) {
    const { error: upsertError } = await supabase
      .from('grades')
      .upsert({
        student_id: mark.student_id,
        course_id: session.course_id,
        grade_type: 'final_exam',
        score: mark.marks_obtained,
        max_score: session.total_marks,
        weight: 60,
        notes: `Exam: ${session.title} (${session.exam_type})`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,course_id,grade_type'
      });
    
    if (!upsertError) syncedCount++;
  }
  
  return syncedCount;
};

/**
 * Export marks as CSV-compatible data
 */
export const exportMarksData = async (
  sessionId: string
): Promise<{
  headers: string[];
  rows: string[][];
}> => {
  const data = await getExamSessionMarks(sessionId);
  
  const headers = [
    'Student Name',
    'Email',
    'Marks Obtained',
    'Total Marks',
    'Percentage',
    'Grade',
    'Result',
    'Attendance',
    'Remarks'
  ];
  
  const rows = data.marks.map(m => [
    m.student_name,
    m.student_email,
    m.marks_obtained.toString(),
    data.session.total_marks.toString(),
    m.percentage.toString(),
    m.grade,
    m.result,
    m.attendance_status,
    m.remarks || ''
  ]);
  
  return { headers, rows };
};
