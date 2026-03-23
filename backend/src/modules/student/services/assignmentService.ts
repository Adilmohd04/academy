import { supabase } from '../../../config/database';
import { randomUUID } from 'crypto';

interface Assignment {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  instructions?: string;
  due_date?: string;
  max_score: number;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
}

interface Submission {
  id: string;
  assignment_id?: string;
  lesson_id?: string;
  student_id: string;
  submitted_at: string;
  file_url?: string;
  file_name?: string;
  submission_text?: string;
  text_content?: string;
  link_url?: string;
  grade?: number;
  max_grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
  graded_at?: string;
  submission_type?: string;
}

export const getAssignmentByLesson = async (
  lessonId: string,
  studentId: string
): Promise<{ assignment: Assignment; submission?: Submission }> => {
  // Get the lesson from course_lessons (teachers create assignments as lessons with content_type='assignment')
  const { data: lesson, error: lessonError } = await supabase
    .from('course_lessons')
    .select('id, title, description, content_type, assignment_details, deadline, is_published')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    throw new Error('Assignment not found');
  }

  // Verify this lesson is an assignment type
  if (lesson.content_type !== 'assignment') {
    throw new Error('This lesson is not an assignment');
  }

  // Build assignment data from the lesson and its assignment_details JSONB
  const details = lesson.assignment_details || {};
  const assignment: Assignment = {
    id: lesson.id,
    lesson_id: lesson.id,
    title: lesson.title || details.title || 'Assignment',
    description: lesson.description || details.description || '',
    instructions: details.instructions || details.description || '',
    due_date: lesson.deadline || details.deadline || details.due_date || null,
    max_score: details.total_marks || details.max_score || details.points || 100,
    allowed_file_types: details.allowed_file_types || null,
    max_file_size_mb: details.max_file_size_mb || 5,
  };

  // Get latest submission from assignment_submissions using lesson_id
  const { data: submissions, error: subError } = await supabase
    .from('assignment_submissions')
    .select('id, lesson_id, student_id, submitted_at, file_url, file_name, link_url, text_content, submission_text, grade, max_grade, feedback, status, graded_at, submission_type')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(1);

  if (subError) {
    console.error('[getAssignmentByLesson] Error fetching submission:', subError);
  }

  const submission = submissions && submissions.length > 0 ? submissions[0] : undefined;

  return { assignment, submission };
};

export const submitAssignment = async (
  lessonId: string,
  studentId: string,
  file?: Express.Multer.File,
  textContent?: string,
  linkUrl?: string,
  weekId?: string
): Promise<Submission> => {
  // Get lesson to verify it's an assignment
  const { data: lesson, error: lessonError } = await supabase
    .from('course_lessons')
    .select('id, title, content_type, assignment_details, deadline, week_id')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    throw new Error('Assignment not found');
  }

  if (lesson.content_type !== 'assignment') {
    throw new Error('This lesson is not an assignment');
  }

  const details = lesson.assignment_details || {};
  const dueDate = lesson.deadline || details.deadline || details.due_date;

  // Check if overdue (allow submission but may flag it)
  const isOverdue = dueDate && new Date(dueDate) < new Date();

  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let submissionType: string = 'text';
  let mimeType: string | undefined;
  let fileSize: number | undefined;

  // Determine file type and handle different submission types
  if (linkUrl) {
    // Handle drive link submission
    submissionType = 'link';
    fileUrl = linkUrl;
    fileName = 'Link Submission';
  } else if (file) {
    // Upload file to Supabase Storage
    const fileExt = file.originalname.split('.').pop() || 'bin';
    const fileKey = `${lessonId}/${studentId}/${randomUUID()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assignments')
      .upload(fileKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[submitAssignment] Supabase Storage upload error:', uploadError);
      throw new Error('Failed to upload file: ' + uploadError.message);
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('assignments')
      .getPublicUrl(fileKey);

    fileUrl = urlData.publicUrl;
    fileName = file.originalname;
    mimeType = file.mimetype;
    fileSize = file.size;
    submissionType = 'file';
  } else if (textContent) {
    submissionType = 'text';
  }

  // Get course_id from the lesson's week
  let courseId: string | null = null;
  const effectiveWeekId = weekId || lesson.week_id;
  if (effectiveWeekId) {
    const { data: weekData } = await supabase
      .from('course_weeks')
      .select('course_id')
      .eq('id', effectiveWeekId)
      .single();
    courseId = weekData?.course_id || null;
  }

  // Check for existing submission - update if exists, insert if new
  const { data: existingSub } = await supabase
    .from('assignment_submissions')
    .select('id, attempt_number')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .order('attempt_number', { ascending: false })
    .limit(1);

  if (existingSub && existingSub.length > 0) {
    // Update existing submission
    const { data: submission, error: updateError } = await supabase
      .from('assignment_submissions')
      .update({
        submission_type: submissionType,
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        link_url: linkUrl || null,
        text_content: textContent || null,
        submission_text: textContent || null,
        status: isOverdue ? 'late' : 'submitted',
        is_late: !!isOverdue,
        submitted_at: new Date().toISOString(),
        grade: null,
        feedback: null,
        graded_at: null,
      })
      .eq('id', existingSub[0].id)
      .select('id, lesson_id, student_id, submitted_at, file_url, file_name, link_url, text_content, submission_text, grade, max_grade, feedback, status, graded_at, submission_type')
      .single();

    if (updateError) {
      console.error('[submitAssignment] Update error:', updateError);
      throw new Error(updateError.message || 'Failed to update submission');
    }

    return submission;
  }

  // Create submission using actual DB columns
  const insertData: any = {
    lesson_id: lessonId,
    student_id: studentId,
    submission_type: submissionType,
    file_url: fileUrl || null,
    file_name: fileName || null,
    file_size: fileSize || null,
    link_url: linkUrl || null,
    text_content: textContent || null,
    submission_text: textContent || null,
    status: isOverdue ? 'late' : 'submitted',
    is_late: !!isOverdue,
    submitted_at: new Date().toISOString(),
    max_grade: details.total_marks || details.max_score || 100,
  };

  // Include course_id if we found it
  if (courseId) {
    insertData.course_id = courseId;
  }

  const { data: submission, error: insertError } = await supabase
    .from('assignment_submissions')
    .insert(insertData)
    .select('id, lesson_id, student_id, submitted_at, file_url, file_name, link_url, text_content, submission_text, grade, max_grade, feedback, status, graded_at, submission_type')
    .single();

  if (insertError) {
    console.error('[submitAssignment] Insert error:', insertError);
    throw new Error(insertError.message || 'Failed to submit assignment');
  }

  return submission;
};

export const getSubmissionsByAssignment = async (
  lessonId: string
): Promise<Submission[]> => {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select(`
      id, lesson_id, student_id, submitted_at, file_url, file_name,
      text_content, submission_text, link_url, grade, max_grade, feedback, status, graded_at,
      submission_type, file_size, attempt_number, is_late
    `)
    .eq('lesson_id', lessonId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;

  // Enrich with student info from profiles
  if (data && data.length > 0) {
    const studentIds = [...new Set(data.map((s: any) => s.student_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', studentIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.clerk_user_id, p]));

    return data.map((s: any) => {
      const profile = profileMap.get(s.student_id);
      return {
        ...s,
        student_name: profile?.full_name || null,
        student_email: profile?.email || null,
      };
    });
  }

  return data || [];
};

export const gradeSubmission = async (
  submissionId: string,
  score: number,
  feedback?: string,
  status: 'graded' | 'returned' = 'graded'
): Promise<void> => {
  // Update submission with grade
  const { error: updateError } = await supabase
    .from('assignment_submissions')
    .update({
      grade: score,
      feedback: feedback || null,
      status,
      graded_at: new Date().toISOString()
    })
    .eq('id', submissionId);

  if (updateError) {
    console.error('[gradeSubmission] Update error:', updateError);
    throw new Error(updateError.message || 'Failed to grade submission');
  }

  // If graded, mark the corresponding lesson as complete
  if (status === 'graded') {
    // Get submission details — lesson_id is directly on assignment_submissions now
    const { data: subData } = await supabase
      .from('assignment_submissions')
      .select('lesson_id, student_id')
      .eq('id', submissionId)
      .single();

    if (subData?.lesson_id) {
      // Upsert lesson_progress
      await supabase
        .from('lesson_progress')
        .upsert({
          lesson_id: subData.lesson_id,
          student_id: subData.student_id,
          is_completed: true,
          completed_at: new Date().toISOString()
        }, { onConflict: 'lesson_id,student_id' });

      // Update course enrollment progress
      const { data: lessonData } = await supabase
        .from('course_lessons')
        .select('week_id, course_weeks!inner(course_id)')
        .eq('id', subData.lesson_id)
        .single();

      if (lessonData) {
        const courseId = (lessonData as any).course_weeks?.course_id;
        if (courseId) {
          // Get total and completed lessons for this course
          const { data: allLessons } = await supabase
            .from('course_lessons')
            .select('id, course_weeks!inner(course_id)')
            .eq('course_weeks.course_id', courseId);

          const allLessonIds = (allLessons || []).map((l: any) => l.id);
            
          const { data: completedLessons } = await supabase
            .from('lesson_progress')
            .select('id')
            .eq('student_id', subData.student_id)
            .eq('is_completed', true)
            .in('lesson_id', allLessonIds.length > 0 ? allLessonIds : ['__none__']);

          const totalLessons = allLessonIds.length;
          const completedCount = (completedLessons || []).length;
          const progressPercentage = totalLessons > 0 
            ? Math.round((completedCount / totalLessons) * 100)
            : 0;

          await supabase
            .from('enrollments')
            .update({ 
              progress_percentage: progressPercentage,
              last_accessed: new Date().toISOString()
            })
            .eq('course_id', courseId)
            .eq('student_id', subData.student_id);
        }
      }
    }
  }
};
