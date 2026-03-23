/**
 * GET /api/teacher/interviews - Get all interviews assigned to this teacher
 * GET /api/teacher/interviews/upcoming - Get upcoming interviews only  
 * PATCH /api/teacher/interviews/:interviewId - Update interview status
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';

const router = express.Router();

function parseNotes(input: any): Record<string, any> {
  if (!input) return {};
  if (typeof input === 'object') return input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

// Get all interviews assigned to this teacher
router.get(
  '/teacher/interviews',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
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

      // Query interviews where this teacher is assigned
      // Need to check notes.assigned_interviewer_id
      const { data: allInterviews, error } = await supabase
        .from('final_exam_interviews')
        .select(`
          id,
          final_exam_id,
          student_id,
          scheduled_date,
          duration_minutes,
          meeting_link,
          status,
          notes,
          final_exams (
            id,
            title,
            course_id,
            courses (
              id,
              title
            )
          ),
          profiles:student_id (
            id,
            full_name,
            email
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error fetching interviews:', error);
        return res.status(500).json({ error: 'Failed to fetch interviews' });
      }

      // Filter to only interviews assigned to this teacher
      const teacherInterviews = (allInterviews || []).filter((interview: any) => {
        const notesData = parseNotes(interview.notes);
        return notesData.assigned_interviewer_id === profile.id;
      });

      // Enrich with calculated fields
      const now = new Date();
      const enrichedInterviews = teacherInterviews.map((interview: any) => ({
        ...interview,
        isUpcoming: new Date(interview.scheduled_date) > now,
        isPast: new Date(interview.scheduled_date) <= now,
        startsIn: Math.floor((new Date(interview.scheduled_date).getTime() - now.getTime()) / 60000),
        course: Array.isArray(interview.final_exams.courses)
          ? interview.final_exams.courses[0]
          : interview.final_exams.courses,
        student: interview.profiles
      }));

      res.json({
        interviews: enrichedInterviews,
        total: enrichedInterviews.length,
        upcoming: enrichedInterviews.filter((i: any) => i.isUpcoming).length,
        completed: enrichedInterviews.filter((i: any) => i.status === 'completed').length
      });
    } catch (error: any) {
      console.error('Error in getTeacherInterviews:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get upcoming interviews for teacher (next 7 days)
router.get(
  '/teacher/interviews/upcoming',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const userId = req.auth?.userId;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: interviews, error } = await supabase
        .from('final_exam_interviews')
        .select(`
          id,
          final_exam_id,
          student_id,
          scheduled_date,
          duration_minutes,
          meeting_link,
          status,
          notes,
          final_exams (
            id,
            title,
            course_id,
            courses (
              id,
              title
            )
          ),
          profiles:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_date', now.toISOString())
        .lte('scheduled_date', sevenDaysFromNow.toISOString())
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error fetching upcoming interviews:', error);
        return res.status(500).json({ error: 'Failed to fetch upcoming interviews' });
      }

      // Filter to only interviews assigned to this teacher
      const teacherInterviews = (interviews || []).filter((interview: any) => {
        const notesData = parseNotes(interview.notes);
        return notesData.assigned_interviewer_id === profile.id;
      });

      const enrichedInterviews = teacherInterviews.map((interview: any) => ({
        ...interview,
        startsIn: Math.floor((new Date(interview.scheduled_date).getTime() - now.getTime()) / 60000),
        course: Array.isArray(interview.final_exams.courses)
          ? interview.final_exams.courses[0]
          : interview.final_exams.courses,
        student: interview.profiles
      }));

      res.json({
        interviews: enrichedInterviews,
        total: enrichedInterviews.length
      });
    } catch (error: any) {
      console.error('Error in getUpcomingInterviews:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Mark interview as completed
router.patch(
  '/teacher/interviews/:interviewId/complete',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { interviewId } = req.params;
      const { feedback } = req.body;
      const userId = req.auth?.userId;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify this teacher is assigned to this interview
      const { data: interview } = await supabase
        .from('final_exam_interviews')
        .select('notes')
        .eq('id', interviewId)
        .single();

      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      const notesData = parseNotes(interview.notes);
      const isAssigned = notesData.assigned_interviewer_id === profile.id;

      if (!isAssigned) {
        return res.status(403).json({ error: 'Not assigned to this interview' });
      }

      // Update interview status
      const updatedNotes = {
        ...notesData,
        completion_feedback: feedback || notesData.completion_feedback || null,
        completed_by: profile.id,
        completed_at: new Date().toISOString()
      };

      const { data: updated, error } = await supabase
        .from('final_exam_interviews')
        .update({
          status: 'completed',
          notes: JSON.stringify(updatedNotes),
          updated_at: new Date().toISOString()
        })
        .eq('id', interviewId)
        .select()
        .single();

      if (error) {
        console.error('Error completing interview:', error);
        return res.status(500).json({ error: 'Failed to complete interview' });
      }

      res.json({
        message: 'Interview completed successfully',
        interview: updated
      });
    } catch (error: any) {
      console.error('Error in completeInterview:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Manual reassign interview to different teacher
router.patch(
  '/teacher/interviews/:interviewId/reassign',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { interviewId } = req.params;
      const { new_teacher_id } = req.body;
      const userId = req.auth?.userId;

      if (!new_teacher_id) {
        return res.status(400).json({ error: 'new_teacher_id is required' });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const { data: interview, error: fetchError } = await supabase
        .from('final_exam_interviews')
        .select('id, notes, final_exam_id, scheduled_date, final_exams!inner(course_id, courses!inner(teacher_id))')
        .eq('id', interviewId)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      const finalExamData: any = interview.final_exams;
      const courseData: any = Array.isArray(finalExamData?.courses) ? finalExamData.courses[0] : finalExamData?.courses;
      const courseId = finalExamData?.course_id;
      const ownerTeacherId = courseData?.teacher_id;

      let hasAccess = profile.id === ownerTeacherId;
      if (!hasAccess) {
        const { data: coTeacher } = await supabase
          .from('course_teachers')
          .select('teacher_id')
          .eq('course_id', courseId)
          .eq('teacher_id', profile.id)
          .maybeSingle();
        hasAccess = !!coTeacher;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data: coTeachers } = await supabase
        .from('course_teachers')
        .select('teacher_id')
        .eq('course_id', courseId);

      const allowedTeacherIds = new Set([
        ownerTeacherId,
        ...(coTeachers || []).map((item: any) => item.teacher_id)
      ].filter(Boolean));

      if (!allowedTeacherIds.has(new_teacher_id)) {
        return res.status(400).json({
          error: 'new_teacher_id must be the course owner or a co-teacher of this course'
        });
      }

      const { data: sameTimeInterviews } = await supabase
        .from('final_exam_interviews')
        .select('id, notes')
        .eq('scheduled_date', interview.scheduled_date)
        .in('status', ['scheduled', 'rescheduled', 'in-progress'])
        .neq('id', interviewId);

      const hasConflict = (sameTimeInterviews || []).some((item: any) => {
        const notesObj = parseNotes(item.notes);
        return notesObj.assigned_interviewer_id === new_teacher_id;
      });

      if (hasConflict) {
        return res.status(409).json({
          error: 'Selected teacher already has another interview at this timeslot'
        });
      }

      const notes: any = parseNotes(interview.notes);
      notes.assigned_interviewer_id = new_teacher_id;
      notes.manually_assigned = true;
      notes.assigned_at = new Date().toISOString();
      notes.assigned_by = profile.id;

      const { data: updated, error } = await supabase
        .from('final_exam_interviews')
        .update({
          notes: JSON.stringify(notes)
        })
        .eq('id', interviewId)
        .select()
        .single();

      if (error) {
        console.error('Error reassigning interview:', error);
        return res.status(500).json({ error: 'Failed to reassign interview' });
      }

      res.json({
        message: 'Interview reassigned successfully',
        interview: updated
      });
    } catch (error: any) {
      console.error('Error in reassignInterview:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
