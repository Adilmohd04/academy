import express from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import { issueCertificate } from '../modules/certificate/services/issuanceService';
import { revokeCertificate as revokeCertificateRecord } from '../modules/certificate/services/certificateService';

const router = express.Router();

/**
 * Get all students enrolled in a course with their grades
 * GET /api/teacher/courses/:courseId/students
 */
router.get('/teacher/courses/:courseId/students', requireAuth, async (req: any, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // Verify teacher owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!teacherProfile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    const isOwner = course.teacher_id === teacherProfile.id || course.teacher_id === userId;

    let isCoTeacher = false;
    if (!isOwner) {
      const { data: coTeacherRow } = await supabase
        .from('course_teachers')
        .select('id')
        .eq('course_id', courseId)
        .in('teacher_id', [teacherProfile.id, userId])
        .limit(1)
        .single();

      isCoTeacher = !!coTeacherRow;
    }

    if (!isOwner && !isCoTeacher) {
      return res.status(403).json({ error: 'Not authorized to view these students' });
    }

    // Get all enrollments for this course with student details
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        enrolled_at,
        progress_percentage,
        completed
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    // For each student, calculate their grades
    const studentsWithGrades = await Promise.all(
      (enrollments || []).map(async (enrollment: any) => {
        const studentClerkUserId = enrollment.student_id; // This is clerk_user_id format (e.g., user_xxx)

        // Get student profile by clerk_user_id (enrollment.student_id now stores clerk_user_id, not profiles.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, clerk_user_id, full_name, email')
          .eq('clerk_user_id', studentClerkUserId)
          .single();

        if (!profile) {
          return {
            id: enrollment.id,
            student_id: studentClerkUserId,
            name: 'Unknown Student',
            email: '',
            enrolled_at: enrollment.enrolled_at,
            progress: enrollment.progress_percentage || 0,
            completed: enrollment.completed || false,
            quiz_average: null,
            assignment_average: null,
            final_exam_score: null,
            total_average: null,
            certificate_issued: false,
          };
        }

        // Profile found - studentClerkUserId is the same as profile.clerk_user_id
        const studentClerkId = studentClerkUserId;

        // Get quiz grades - query course_lessons for quiz-type lessons, then quiz_submissions
        const { data: quizLessons } = await supabase
          .from('course_lessons')
          .select('id')
          .eq('course_id', courseId)
          .eq('content_type', 'quiz');

        const quizLessonIds = quizLessons?.map((l: any) => l.id) || [];

        const { data: quizAttempts } = quizLessonIds.length > 0
          ? await supabase
              .from('quiz_submissions')
              .select('score, max_score')
              .eq('student_id', studentClerkId)
              .in('lesson_id', quizLessonIds)
          : { data: [] };

        // Get assignment grades - query course_lessons for assignment-type lessons, then assignment_submissions
        const { data: assignmentLessons } = await supabase
          .from('course_lessons')
          .select('id')
          .eq('course_id', courseId)
          .eq('content_type', 'assignment');

        const assignmentLessonIds = assignmentLessons?.map((l: any) => l.id) || [];

        const { data: assignments } = assignmentLessonIds.length > 0
          ? await supabase
              .from('assignment_submissions')
              .select('grade, max_points')
              .eq('student_id', studentClerkId)
              .in('lesson_id', assignmentLessonIds)
              .not('grade', 'is', null)
          : { data: [] };

        // Get final exam grade
        const { data: finalExam } = await supabase
          .from('final_exam_submissions')
          .select('score, max_score')
          .eq('student_id', studentClerkId) // final_exam_submissions uses clerk_user_id
          .eq('course_id', courseId)
          .single();

        // Calculate averages
        const quizAverage = quizAttempts && quizAttempts.length > 0
          ? (quizAttempts.reduce((sum: number, a: any) => sum + (a.score / a.max_score) * 100, 0) / quizAttempts.length)
          : null;

        const assignmentAverage = assignments && assignments.length > 0
          ? (assignments.reduce((sum: number, a: any) => sum + (a.grade / a.max_points) * 100, 0) / assignments.length)
          : null;

        const finalExamScore = finalExam
          ? (finalExam.score / finalExam.max_score) * 100
          : null;

        // Calculate total average (weighted or simple)
        let totalAverage = null;
        const hasGrades = quizAverage !== null || assignmentAverage !== null || finalExamScore !== null;
        
        if (hasGrades) {
          const weights = { quiz: 0.3, assignment: 0.3, final: 0.4 };
          let weightedSum = 0;
          let totalWeight = 0;

          if (quizAverage !== null) {
            weightedSum += quizAverage * weights.quiz;
            totalWeight += weights.quiz;
          }
          if (assignmentAverage !== null) {
            weightedSum += assignmentAverage * weights.assignment;
            totalWeight += weights.assignment;
          }
          if (finalExamScore !== null) {
            weightedSum += finalExamScore * weights.final;
            totalWeight += weights.final;
          }

          totalAverage = totalWeight > 0 ? weightedSum / totalWeight : null;
        }

        // Check if certificate issued
        const { data: certificate } = await supabase
          .from('certificates')
          .select('id')
          .eq('student_id', studentClerkId) // certificates uses clerk_user_id
          .eq('course_id', courseId)
          .in('status', ['active', 'awarded', 'issued'])
          .limit(1)
          .maybeSingle();

        return {
          id: enrollment.id,
          student_id: studentClerkId,
          name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          enrolled_at: enrollment.enrolled_at,
          progress: enrollment.progress_percentage || 0,
          completed: enrollment.completed || false,
          quiz_average: quizAverage !== null ? Math.round(quizAverage * 10) / 10 : null,
          assignment_average: assignmentAverage !== null ? Math.round(assignmentAverage * 10) / 10 : null,
          final_exam_score: finalExamScore !== null ? Math.round(finalExamScore * 10) / 10 : null,
          total_average: totalAverage !== null ? Math.round(totalAverage * 10) / 10 : null,
          certificate_issued: !!certificate,
        };
      })
    );

    res.json({ students: studentsWithGrades });
  } catch (error: any) {
    console.error('Error in teacher students endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update student's certificate status (manually issue/revoke)
 * PUT /api/teacher/courses/:courseId/students/:studentId/certificate
 */
router.put('/teacher/courses/:courseId/students/:studentId/certificate', requireAuth, async (req: any, res) => {
  try {
    const { courseId, studentId } = req.params;
    const { issue, reason } = req.body || {}; // true to issue, false to revoke
    const userId = req.auth?.userId;

    if (typeof issue !== 'boolean') {
      return res.status(400).json({ error: 'issue must be a boolean' });
    }

    // Verify teacher owns this course
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id, title')
      .eq('id', courseId)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!teacherProfile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    const isOwner = course.teacher_id === teacherProfile.id || course.teacher_id === userId;

    let isCoTeacher = false;
    if (!isOwner) {
      const { data: coTeacherRow } = await supabase
        .from('course_teachers')
        .select('id')
        .eq('course_id', courseId)
        .in('teacher_id', [teacherProfile.id, userId])
        .limit(1)
        .single();

      isCoTeacher = !!coTeacherRow;
    }

    if (!isOwner && !isCoTeacher) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (issue) {
      // Never insert a lightweight certificate row from this dashboard.  The
      // lifecycle checks all eligibility gates and creates the unique public
      // verification code + QR image before committing a record.
      const result = await issueCertificate(courseId, studentId);
      if (result.ok === false) {
        return res.status(400).json({ error: result.error, unmet: result.unmet });
      }

      if (String(result.certificate?.status || '').toLowerCase() === 'revoked') {
        return res.status(409).json({
          error: 'Certificate is revoked. Use the approved reissue workflow instead.',
        });
      }

      return res.status(result.alreadyIssued ? 200 : 201).json({
        success: true,
        alreadyIssued: result.alreadyIssued,
        message: result.alreadyIssued ? 'Certificate already issued' : 'Certificate issued successfully',
        certificate: result.certificate,
      });
    } else {
      if (!String(reason || '').trim()) {
        return res.status(400).json({ error: 'Revocation reason is required' });
      }

      // Revocation is a durable state transition.  Deleting the row would
      // make an old QR look like an unknown certificate and erase the audit.
      const { data: certificate, error: certificateError } = await supabase
        .from('certificates')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .in('status', ['active', 'awarded', 'issued'])
        .order('issued_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (certificateError || !certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      const result = await revokeCertificateRecord(
        certificate.id,
        teacherProfile.id,
        String(reason).trim(),
      );
      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to revoke certificate' });
      }

      return res.json({ success: true, message: 'Certificate revoked successfully' });
    }
  } catch (error: any) {
    console.error('Error in certificate update endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
