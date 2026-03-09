import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';

const router = express.Router();

/**
 * Assignment Routes
 * 
 * Teacher routes: Create assignments, grade assignments, view submissions
 * Student routes: Submit assignments, view grades
 */

// ==================== TEACHER ROUTES ====================

// Create a new assignment
router.post(
  '/teacher/courses/:courseId/assignments',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const { title, description, type, due_date, points, instructions, week_id } = req.body;
      const userId = req.auth?.userId;

      if (!title || !due_date) {
        return res.status(400).json({ error: 'Title and due date are required' });
      }

      // Get teacher profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, clerk_user_id')
        .eq('clerk_user_id', userId)
        .single();

      if (profileError || !profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify teacher owns the course or is a co-teacher
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .eq('teacher_id', profile.clerk_user_id)
        .single();

      if (!course) {
        // Check if co-teacher
        const { data: coTeacher } = await supabase
          .from('course_teachers')
          .select('id')
          .eq('course_id', courseId)
          .eq('teacher_id', profile.id)
          .single();

        if (!coTeacher) {
          return res.status(403).json({ error: 'You do not have access to this course' });
        }
      }

      // Create assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          course_id: courseId,
          week_id: week_id || null,
          title,
          description: description || null,
          due_date,
          points: points || 100,
          created_by: profile.id
        })
        .select()
        .single();

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        return res.status(500).json({ error: 'Failed to create assignment' });
      }

      // Add to course_content if week_id provided
      if (week_id) {
        const { data: existingContent } = await supabase
          .from('course_content')
          .select('order_index')
          .eq('week_id', week_id)
          .order('order_index', { ascending: false })
          .limit(1);

        const maxOrder = existingContent && existingContent.length > 0 
          ? existingContent[0].order_index 
          : 0;

        const { error: contentError } = await supabase
          .from('course_content')
          .insert({
            week_id: week_id,
            type: 'assignment',
            title: title,
            content_url: assignment.id,
            order_index: maxOrder + 1,
            is_required: true
          });

        if (contentError) {
          console.error('Error adding assignment to week content:', contentError);
        }
      }

      res.status(201).json({ 
        message: 'Assignment created successfully',
        assignment 
      });
    } catch (error: any) {
      console.error('Error in createAssignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all submissions for an assignment
router.get(
  '/teacher/assignments/:assignmentId/submissions',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = req.auth?.userId;

      // Get teacher profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify teacher owns the course
      const { data: assignment } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          points,
          courses!inner (
            id,
            teacher_id
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const courses: any = assignment.courses;
      const courseTeacherId = Array.isArray(courses) 
        ? courses[0]?.teacher_id 
        : courses?.teacher_id;

      if (courseTeacherId !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get all submissions with student details
      const { data: submissions, error } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          student_id,
          submitted_at,
          file_url,
          file_type,
          link_url,
          text_content,
          grade,
          feedback,
          graded_at
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        return res.status(500).json({ error: 'Failed to fetch submissions' });
      }

      // Manually fetch student profiles
      const studentIds = (submissions || []).map((s: any) => s.student_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('clerk_user_id, full_name, email')
          .in('clerk_user_id', studentIds);
        profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.clerk_user_id] = p;
          return acc;
        }, {});
      }

      // Format response
      const formattedSubmissions = submissions?.map((sub: any) => {
        const profileData = profilesMap[sub.student_id];
        return {
        id: sub.id,
        student_id: sub.student_id,
        student_name: profileData?.full_name || 'Unknown',
        student_email: profileData?.email || '',
        submitted_at: sub.submitted_at,
        file_url: sub.file_url,
        file_type: sub.file_type,
        link_url: sub.link_url,
        text_content: sub.text_content,
        grade: sub.grade,
        feedback: sub.feedback,
        graded_at: sub.graded_at
      };
      }) || [];

      res.json({ 
        assignment: {
          id: assignment.id,
          title: assignment.title,
          points: assignment.points
        },
        submissions: formattedSubmissions
      });
    } catch (error: any) {
      console.error('Error in getAssignmentSubmissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Grade a submission
router.post(
  '/teacher/assignments/:assignmentId/submissions/:submissionId/grade',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { assignmentId, submissionId } = req.params;
      const { grade, feedback, max_points } = req.body;
      const userId = req.auth?.userId;

      if (grade === undefined || grade < 0) {
        return res.status(400).json({ error: 'Valid grade is required' });
      }

      // Get teacher profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify submission exists and teacher owns the course
      const { data: submission } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          assignments!inner (
            id,
            courses!inner (
              id,
              teacher_id
            )
          )
        `)
        .eq('id', submissionId)
        .eq('assignment_id', assignmentId)
        .single();

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const assignment = Array.isArray(submission.assignments) 
        ? submission.assignments[0] 
        : submission.assignments;
      const course = Array.isArray(assignment?.courses) 
        ? assignment.courses[0] 
        : assignment?.courses;

      if (course?.teacher_id !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update submission with grade
      const { data: gradedSubmission, error } = await supabase
        .from('assignment_submissions')
        .update({
          grade,
          feedback: feedback || null,
          graded_at: new Date().toISOString(),
          graded_by: profile.id
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (error) {
        console.error('Error grading submission:', error);
        return res.status(500).json({ error: 'Failed to grade submission' });
      }

      res.json({ 
        message: 'Submission graded successfully',
        submission: gradedSubmission
      });
    } catch (error: any) {
      console.error('Error in gradeSubmission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================== STUDENT ROUTES ====================

// ==================== TEACHER LESSON-BASED ROUTES ====================

// Get all assignment submissions for a course (lesson-based)
router.get(
  '/teacher/courses/:courseId/assignment-submissions',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.auth?.userId;

      // Verify teacher owns the course
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Allow course teacher or admin
      // teacher_id may be a profile UUID or clerk_user_id, check both
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, clerk_user_id, id')
        .eq('clerk_user_id', userId)
        .single();

      const isTeacher = course.teacher_id === userId || course.teacher_id === profile?.id;
      if (!isTeacher && profile?.role !== 'admin') {
        // Check co-teacher
        const { data: coTeacher } = await supabase
          .from('course_co_teachers')
          .select('id')
          .eq('course_id', courseId)
          .eq('teacher_id', userId)
          .maybeSingle();

        if (!coTeacher) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Get all assignment lessons in this course
      const { data: weeks } = await supabase
        .from('course_weeks')
        .select(`
          id,
          week_number,
          title,
          course_lessons (
            id,
            title,
            content_type,
            assignment_details,
            deadline
          )
        `)
        .eq('course_id', courseId)
        .order('week_number', { ascending: true });

      const assignmentLessons: any[] = [];
      (weeks || []).forEach((w: any) => {
        (w.course_lessons || []).forEach((l: any) => {
          if (l.content_type === 'assignment') {
            assignmentLessons.push({
              ...l,
              week_number: w.week_number,
              week_title: w.title
            });
          }
        });
      });

      if (assignmentLessons.length === 0) {
        return res.json({ assignments: [], submissions: [] });
      }

      const lessonIds = assignmentLessons.map((l: any) => l.id);

      // Get all submissions for these assignment lessons
      const { data: submissions, error: subError } = await supabase
        .from('assignment_submissions')
        .select('id, lesson_id, student_id, submitted_at, file_url, file_name, link_url, text_content, submission_text, grade, max_grade, feedback, status, graded_at, graded_by, submission_type, is_late')
        .in('lesson_id', lessonIds)
        .order('submitted_at', { ascending: false });

      if (subError) {
        console.error('Error fetching submissions:', subError);
        return res.status(500).json({ error: 'Failed to fetch submissions' });
      }

      // Enrich with student profiles
      const studentIds = [...new Set((submissions || []).map((s: any) => s.student_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('clerk_user_id, full_name, email')
          .in('clerk_user_id', studentIds);
        profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.clerk_user_id] = p;
          return acc;
        }, {});
      }

      const enrichedSubmissions = (submissions || []).map((sub: any) => {
        const p = profilesMap[sub.student_id];
        const lesson = assignmentLessons.find((l: any) => l.id === sub.lesson_id);
        return {
          ...sub,
          student_name: p?.full_name || 'Unknown',
          student_email: p?.email || '',
          assignment_title: lesson?.title || 'Assignment',
          week_number: lesson?.week_number,
          week_title: lesson?.week_title,
          max_grade: sub.max_grade || lesson?.assignment_details?.total_marks || 100,
        };
      });

      res.json({
        assignments: assignmentLessons.map((l: any) => ({
          lesson_id: l.id,
          title: l.title,
          deadline: l.deadline,
          max_grade: l.assignment_details?.total_marks || l.assignment_details?.max_score || 100,
          week_number: l.week_number,
          week_title: l.week_title,
        })),
        submissions: enrichedSubmissions
      });
    } catch (error: any) {
      console.error('Error in getAssignmentSubmissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get a single submission with full details
router.get(
  '/teacher/courses/:courseId/submissions/:submissionId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId, submissionId } = req.params;
      const userId = req.auth?.userId;

      // Verify teacher owns the course
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // teacher_id may be profile UUID or clerk_user_id, check both
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, clerk_user_id, id')
        .eq('clerk_user_id', userId)
        .single();

      const isTeacher = course.teacher_id === userId || course.teacher_id === profile?.id;

      if (!isTeacher && profile?.role !== 'admin') {
        const { data: coTeacher } = await supabase
          .from('course_co_teachers')
          .select('id')
          .eq('course_id', courseId)
          .eq('teacher_id', userId)
          .maybeSingle();

        if (!coTeacher) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Fetch the submission
      const { data: sub, error: subError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (subError || !sub) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Get student profile
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('clerk_user_id', sub.student_id)
        .single();

      // Get the lesson (assignment) info
      const { data: lesson } = await supabase
        .from('course_lessons')
        .select('id, title, content_type, assignment_details, deadline, week_id')
        .eq('id', sub.lesson_id)
        .single();

      // Get week info
      let weekInfo: any = null;
      if (lesson?.week_id) {
        const { data: week } = await supabase
          .from('course_weeks')
          .select('week_number, title')
          .eq('id', lesson.week_id)
          .single();
        weekInfo = week;
      }

      res.json({
        submission: {
          ...sub,
          student_name: studentProfile?.full_name || 'Unknown',
          student_email: studentProfile?.email || '',
          assignment_title: lesson?.title || 'Assignment',
          assignment_details: lesson?.assignment_details || null,
          deadline: lesson?.deadline || null,
          week_number: weekInfo?.week_number || null,
          week_title: weekInfo?.title || '',
          max_grade: sub.max_grade || lesson?.assignment_details?.total_marks || lesson?.assignment_details?.max_score || 100,
        }
      });
    } catch (error: any) {
      console.error('Error in getSubmissionDetail:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Grade a lesson-based submission
router.post(
  '/teacher/courses/:courseId/submissions/:submissionId/grade',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId, submissionId } = req.params;
      const { grade, feedback } = req.body;
      const userId = req.auth?.userId;

      if (grade === undefined || grade < 0) {
        return res.status(400).json({ error: 'Valid grade is required' });
      }

      // Verify teacher owns the course
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // teacher_id may be profile UUID or clerk_user_id, check both
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, clerk_user_id, id')
        .eq('clerk_user_id', userId)
        .single();

      const isTeacher = course.teacher_id === userId || course.teacher_id === profile?.id;

      if (!isTeacher && profile?.role !== 'admin') {
        const { data: coTeacher } = await supabase
          .from('course_co_teachers')
          .select('id')
          .eq('course_id', courseId)
          .eq('teacher_id', userId)
          .maybeSingle();

        if (!coTeacher) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Update submission with grade
      const { data: gradedSub, error: gradeError } = await supabase
        .from('assignment_submissions')
        .update({
          grade: Number(grade),
          feedback: feedback || null,
          status: 'graded',
          graded_at: new Date().toISOString(),
          graded_by: userId,
        })
        .eq('id', submissionId)
        .select('id, lesson_id, student_id, grade, max_grade, feedback, status, graded_at')
        .single();

      if (gradeError) {
        console.error('Error grading submission:', gradeError);
        return res.status(500).json({ error: 'Failed to grade submission' });
      }

      // Mark lesson as completed for the student
      if (gradedSub?.lesson_id && gradedSub?.student_id) {
        await supabase
          .from('lesson_progress')
          .upsert({
            lesson_id: gradedSub.lesson_id,
            student_id: gradedSub.student_id,
            is_completed: true,
            completed_at: new Date().toISOString()
          }, { onConflict: 'lesson_id,student_id' });
      }

      res.json({
        message: 'Submission graded successfully',
        submission: gradedSub
      });
    } catch (error: any) {
      console.error('Error in gradeSubmission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================== LEGACY STUDENT ROUTES ====================

// Submit an assignment
router.post(
  '/student/assignments/:assignmentId/submit',
  requireAuth,
  async (req: any, res) => {
    try {
      const { assignmentId } = req.params;
      const { file_url, file_type, link_url, text_content } = req.body;
      const userId = req.auth?.userId;

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Check if already submitted
      const { data: existing } = await supabase
        .from('assignment_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', profile.id)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Assignment already submitted' });
      }

      // Create submission
      const { data: submission, error } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: profile.id,
          file_url: file_url || null,
          file_type: file_type || null,
          link_url: link_url || null,
          text_content: text_content || null,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting assignment:', error);
        return res.status(500).json({ error: 'Failed to submit assignment' });
      }

      res.status(201).json({ 
        message: 'Assignment submitted successfully',
        submission
      });
    } catch (error: any) {
      console.error('Error in submitAssignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get student's submission for an assignment
router.get(
  '/student/assignments/:assignmentId/submission',
  requireAuth,
  async (req: any, res) => {
    try {
      const { assignmentId } = req.params;
      const userId = req.auth?.userId;

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Get submission
      const { data: submission, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching submission:', error);
        return res.status(500).json({ error: 'Failed to fetch submission' });
      }

      res.json({ submission: submission || null });
    } catch (error: any) {
      console.error('Error in getStudentSubmission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
