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
  // Verify teacher owns the course that contains this assignment (safe parameterized query)
  const { data: assignmentCheck, error: assignmentCheckError } = await supabase
    .from('assignments')
    .select('id, lesson_id')
    .eq('id', assignmentId)
    .single();

  if (assignmentCheckError || !assignmentCheck) {
    throw new Error('Assignment not found');
  }

  // Walk the join chain safely to verify teacher ownership
  const { data: lessonCheck, error: lessonCheckError } = await supabase
    .from('course_lessons')
    .select('week_id')
    .eq('id', assignmentCheck.lesson_id)
    .single();

  if (lessonCheckError || !lessonCheck) {
    throw new Error('Assignment not found');
  }

  const { data: weekCheck, error: weekCheckError } = await supabase
    .from('course_weeks')
    .select('course_id')
    .eq('id', lessonCheck.week_id)
    .single();

  if (weekCheckError || !weekCheck) {
    throw new Error('Assignment not found');
  }

  const { data: courseCheck, error: courseCheckError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', weekCheck.course_id)
    .eq('teacher_id', teacherId)
    .single();

  if (courseCheckError || !courseCheck) {
    throw new Error('Unauthorized');
  }

  // Get submissions with student info using safe Supabase queries
  const { data: submissions, error } = await supabase
    .from('assignment_submissions')
    .select('id, assignment_id, student_id, file_url, text_content, score, feedback, status, submitted_at')
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;

  // Fetch student profiles separately to avoid FK aliasing issues
  const studentIds = [...new Set((submissions || []).map((s: any) => s.student_id))];
  let profileMap: Record<string, { full_name: string; email: string }> = {};

  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', studentIds);

    (profiles || []).forEach((p: any) => {
      profileMap[p.clerk_user_id] = { full_name: p.full_name, email: p.email };
    });
  }

  return (submissions || []).map((s: any) => ({
    id: s.id,
    assignment_id: s.assignment_id,
    student_id: s.student_id,
    student_name: profileMap[s.student_id]?.full_name || 'Unknown',
    student_email: profileMap[s.student_id]?.email || '',
    file_url: s.file_url,
    text_content: s.text_content,
    score: s.score,
    feedback: s.feedback,
    status: s.status,
    submitted_at: s.submitted_at,
  }));
};

export const bulkGradeAssignments = async (
  grades: { id: string; score: number; feedback?: string }[],
  teacherId: string
): Promise<void> => {
  for (const grade of grades) {
    // First verify the submission belongs to a course owned by this teacher
    const { data: submission, error: subError } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id')
      .eq('id', grade.id)
      .single();

    if (subError || !submission) throw new Error(`Submission ${grade.id} not found`);

    // Walk join chain to verify ownership
    const { data: assignment } = await supabase
      .from('assignments')
      .select('lesson_id')
      .eq('id', submission.assignment_id)
      .single();

    if (!assignment) throw new Error('Assignment not found');

    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('week_id')
      .eq('id', assignment.lesson_id)
      .single();

    if (!lesson) throw new Error('Lesson not found');

    const { data: week } = await supabase
      .from('course_weeks')
      .select('course_id')
      .eq('id', lesson.week_id)
      .single();

    if (!week) throw new Error('Week not found');

    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', week.course_id)
      .eq('teacher_id', teacherId)
      .single();

    if (!course) throw new Error(`Unauthorized to grade submission ${grade.id}`);

    // Safe update using parameterized Supabase call (no string interpolation)
    const { error: updateError } = await supabase
      .from('assignment_submissions')
      .update({
        score: grade.score,
        feedback: grade.feedback ?? null,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', grade.id);

    if (updateError) throw updateError;
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
