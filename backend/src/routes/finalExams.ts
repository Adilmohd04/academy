import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';

const router = express.Router();

/**
 * Final Exam Routes
 * 
 * Teacher routes: Create/manage final exams, grade submissions, schedule interviews
 * Student routes: View exams, submit work, schedule interviews
 */

// ==================== TEACHER ROUTES ====================

// Create a final exam for a course
router.post(
  '/teacher/courses/:courseId/final-exams',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const {
        title,
        description,
        exam_type,
        points,
        due_date,
        instructions,
        resources,
        duration_minutes,
        is_published
      } = req.body;
      const userId = req.auth?.userId;

      if (!title || !exam_type) {
        return res.status(400).json({ error: 'Title and exam type are required' });
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

      // Verify teacher owns the course
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (course.teacher_id !== profile.id) {
        return res.status(403).json({ error: 'Only the course teacher can create final exams' });
      }

      // Create final exam
      const { data: finalExam, error } = await supabase
        .from('final_exams')
        .insert({
          course_id: courseId,
          title,
          description: description || null,
          exam_type,
          points: points || 100,
          due_date: due_date || null,
          instructions: instructions || null,
          resources: resources || null,
          duration_minutes: duration_minutes || null,
          is_published: is_published || false,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating final exam:', error);
        return res.status(500).json({ error: 'Failed to create final exam' });
      }

      res.status(201).json({
        message: 'Final exam created successfully',
        finalExam
      });
    } catch (error: any) {
      console.error('Error in createFinalExam:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all final exams for a course (teacher view)
router.get(
  '/teacher/courses/:courseId/final-exams',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
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
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (course.teacher_id !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get all final exams for the course
      const { data: finalExams, error } = await supabase
        .from('final_exams')
        .select(`
          *,
          final_exam_submissions (
            id,
            student_id,
            status,
            submitted_at,
            grade
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching final exams:', error);
        return res.status(500).json({ error: 'Failed to fetch final exams' });
      }

      res.json({ finalExams: finalExams || [] });
    } catch (error: any) {
      console.error('Error in getCourseFinalExams:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update a final exam
router.put(
  '/teacher/courses/:courseId/final-exams/:examId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId, examId } = req.params;
      const {
        title,
        description,
        exam_type,
        points,
        due_date,
        instructions,
        resources,
        duration_minutes,
        is_published
      } = req.body;
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
      const { data: finalExam } = await supabase
        .from('final_exams')
        .select(`
          id,
          courses!inner (
            id,
            teacher_id
          )
        `)
        .eq('id', examId)
        .eq('course_id', courseId)
        .single();

      if (!finalExam) {
        return res.status(404).json({ error: 'Final exam not found' });
      }

      const courses: any = finalExam.courses;
      const teacherId = Array.isArray(courses) ? courses[0]?.teacher_id : courses?.teacher_id;

      if (teacherId !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update final exam
      const { data: updatedExam, error } = await supabase
        .from('final_exams')
        .update({
          title: title || undefined,
          description: description || undefined,
          exam_type: exam_type || undefined,
          points: points || undefined,
          due_date: due_date || undefined,
          instructions: instructions || undefined,
          resources: resources || undefined,
          duration_minutes: duration_minutes || undefined,
          is_published: is_published !== undefined ? is_published : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)
        .select()
        .single();

      if (error) {
        console.error('Error updating final exam:', error);
        return res.status(500).json({ error: 'Failed to update final exam' });
      }

      res.json({
        message: 'Final exam updated successfully',
        finalExam: updatedExam
      });
    } catch (error: any) {
      console.error('Error in updateFinalExam:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all submissions for a final exam
router.get(
  '/teacher/final-exams/:examId/submissions',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { examId } = req.params;
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
      const { data: finalExam } = await supabase
        .from('final_exams')
        .select(`
          id,
          title,
          points,
          exam_type,
          courses!inner (
            id,
            teacher_id
          )
        `)
        .eq('id', examId)
        .single();

      if (!finalExam) {
        return res.status(404).json({ error: 'Final exam not found' });
      }

      const courses: any = finalExam.courses;
      const teacherId = Array.isArray(courses) ? courses[0]?.teacher_id : courses?.teacher_id;

      if (teacherId !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get all submissions
      const { data: submissions, error } = await supabase
        .from('final_exam_submissions')
        .select('*')
        .eq('final_exam_id', examId)
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
          ...sub,
          student_name: profileData?.full_name || 'Unknown',
          student_email: profileData?.email || ''
        };
      }) || [];

      res.json({
        exam: {
          id: finalExam.id,
          title: finalExam.title,
          points: finalExam.points,
          exam_type: finalExam.exam_type
        },
        submissions: formattedSubmissions
      });
    } catch (error: any) {
      console.error('Error in getFinalExamSubmissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Grade a final exam submission
router.post(
  '/teacher/final-exams/:examId/submissions/:submissionId/grade',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { examId, submissionId } = req.params;
      const { grade, max_grade, feedback, status } = req.body;
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

      // Verify teacher owns the course
      const { data: submission } = await supabase
        .from('final_exam_submissions')
        .select(`
          id,
          final_exams!inner (
            id,
            courses!inner (
              id,
              teacher_id
            )
          )
        `)
        .eq('id', submissionId)
        .eq('final_exam_id', examId)
        .single();

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const finalExams: any = submission.final_exams;
      const finalExamData = Array.isArray(finalExams) ? finalExams[0] : finalExams;
      const courses: any = finalExamData?.courses;
      const teacherId = Array.isArray(courses) ? courses[0]?.teacher_id : courses?.teacher_id;

      if (teacherId !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update submission with grade
      const { data: gradedSubmission, error } = await supabase
        .from('final_exam_submissions')
        .update({
          grade,
          max_grade: max_grade || undefined,
          feedback: feedback || null,
          status: status || 'graded',
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
        message: 'Final exam graded successfully',
        submission: gradedSubmission
      });
    } catch (error: any) {
      console.error('Error in gradeFinalExamSubmission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================== STUDENT ROUTES ====================

// Get final exams for a course (student view - only published)
router.get(
  '/student/courses/:courseId/final-exams',
  requireAuth,
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
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

      // Verify student is enrolled
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', profile.id)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      // Get published final exams with student's submission status
      const { data: finalExams, error } = await supabase
        .from('final_exams')
        .select(`
          *,
          final_exam_submissions!left (
            id,
            status,
            submitted_at,
            grade,
            feedback,
            graded_at
          )
        `)
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching final exams:', error);
        return res.status(500).json({ error: 'Failed to fetch final exams' });
      }

      // Filter to show only student's own submissions
      const formattedExams = finalExams?.map((exam: any) => {
        const submissions = Array.isArray(exam.final_exam_submissions)
          ? exam.final_exam_submissions
          : exam.final_exam_submissions
          ? [exam.final_exam_submissions]
          : [];

        const studentSubmission = submissions.find((sub: any) => sub.student_id === profile.id);

        return {
          ...exam,
          submission: studentSubmission || null,
          final_exam_submissions: undefined
        };
      }) || [];

      res.json({ finalExams: formattedExams });
    } catch (error: any) {
      console.error('Error in getStudentFinalExams:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Submit a final exam
router.post(
  '/student/final-exams/:examId/submit',
  requireAuth,
  async (req: any, res) => {
    try {
      const { examId } = req.params;
      const { submission_type, file_url, file_type, link_url, text_content } = req.body;
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
        .from('final_exam_submissions')
        .select('id')
        .eq('final_exam_id', examId)
        .eq('student_id', profile.id)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Final exam already submitted' });
      }

      // Create submission
      const { data: submission, error } = await supabase
        .from('final_exam_submissions')
        .insert({
          final_exam_id: examId,
          student_id: profile.id,
          submission_type: submission_type || 'file',
          file_url: file_url || null,
          file_type: file_type || null,
          link_url: link_url || null,
          text_content: text_content || null,
          status: 'submitted'
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting final exam:', error);
        return res.status(500).json({ error: 'Failed to submit final exam' });
      }

      res.status(201).json({
        message: 'Final exam submitted successfully',
        submission
      });
    } catch (error: any) {
      console.error('Error in submitFinalExam:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
