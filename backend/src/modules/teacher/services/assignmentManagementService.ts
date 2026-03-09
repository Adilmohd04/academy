import { supabase } from '../../../config/database';

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  file_url?: string;
  text_content?: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'pending';
  submitted_at: string;
}

export const getAssignmentSubmissions = async (
  assignmentId: string,
  teacherId: string
): Promise<AssignmentSubmission[]> => {
  // Verify teacher owns the course using raw SQL for complex join
  const { data: courseCheck, error: courseCheckError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT 1 
     FROM assignments a
     JOIN course_lessons l ON l.id = a.lesson_id
     JOIN course_weeks w ON w.id = l.week_id
     JOIN courses c ON c.id = w.course_id
     WHERE a.id = '${assignmentId}' AND c.teacher_id = '${teacherId}'`
  });

  if (courseCheckError || !courseCheck || courseCheck.length === 0) {
    throw new Error('Unauthorized or assignment not found');
  }

  // Get submissions with student info
  const { data: result, error } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT 
      s.id,
      s.assignment_id,
      s.student_id,
      p.full_name as student_name,
      p.email as student_email,
      s.file_url,
      s.text_content,
      s.score,
      s.feedback,
      s.status,
      s.submitted_at
     FROM assignment_submissions s
     LEFT JOIN profiles p ON p.clerk_user_id = s.student_id
     WHERE s.assignment_id = '${assignmentId}'
     ORDER BY s.submitted_at DESC`
  });

  if (error) throw error;
  return result || [];
};

export const bulkGradeAssignments = async (
  grades: { id: string; score: number; feedback?: string }[],
  teacherId: string
): Promise<void> => {
  // Process grades sequentially - Supabase handles connection management
  try {
    for (const grade of grades) {
      // Verify ownership for each submission and update
      // Using raw SQL for complex UPDATE with JOIN
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `UPDATE assignment_submissions s
         SET score = ${grade.score}, 
             feedback = ${grade.feedback ? `'${grade.feedback.replace(/'/g, "''")}'` : 'NULL'}, 
             status = 'graded', 
             graded_at = NOW()
         FROM assignments a
         JOIN course_lessons l ON l.id = a.lesson_id
         JOIN course_weeks w ON w.id = l.week_id
         JOIN courses c ON c.id = w.course_id
         WHERE s.id = '${grade.id}' 
         AND s.assignment_id = a.id 
         AND c.teacher_id = '${teacherId}'`
      });

      if (error) throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const getAssignmentGradesCSV = async (
  assignmentId: string,
  teacherId: string
): Promise<string> => {
  const submissions = await getAssignmentSubmissions(assignmentId, teacherId);

  const header = 'Student Name,Email,Submitted At,Status,Score,Feedback\n';
  const rows = submissions.map(s => {
    const name = `"${s.student_name.replace(/"/g, '""')}"`;
    const email = s.student_email;
    const date = new Date(s.submitted_at).toISOString();
    const status = s.status;
    const score = s.score || 0;
    const feedback = `"${(s.feedback || '').replace(/"/g, '""')}"`;
    
    return `${name},${email},${date},${status},${score},${feedback}`;
  });

  return header + rows.join('\n');
};
