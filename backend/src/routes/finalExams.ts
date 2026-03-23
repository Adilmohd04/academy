import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import { notifyTeacherInterviewAssignment } from '../services/courseNotificationService';

const router = express.Router();

function parseResources(resources: any): any {
  if (!resources) return null;
  if (typeof resources === 'object') return resources;
  if (typeof resources === 'string') {
    try {
      return JSON.parse(resources);
    } catch {
      return null;
    }
  }
  return null;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => Number(v));
  return h * 60 + m;
}

function formatDateFromDayAndMinute(day: Date, minuteOfDay: number): string {
  const result = new Date(day);
  result.setHours(0, 0, 0, 0);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  result.setHours(hours, minutes, 0, 0);
  return result.toISOString();
}

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
  '/teacher/final-exams/:examId/interviews',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { examId } = req.params;
      const userId = req.auth?.userId;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const { data: finalExam } = await supabase
        .from('final_exams')
        .select('id, exam_type, course_id, courses!inner(id, teacher_id)')
        .eq('id', examId)
        .single();

      if (!finalExam) {
        return res.status(404).json({ error: 'Final exam not found' });
      }

      const courses: any = finalExam.courses;
      const ownerTeacherId = Array.isArray(courses) ? courses[0]?.teacher_id : courses?.teacher_id;

      let hasAccess = ownerTeacherId === profile.id;

      if (!hasAccess) {
        const { data: coTeacher } = await supabase
          .from('course_teachers')
          .select('teacher_id')
          .eq('course_id', finalExam.course_id)
          .eq('teacher_id', profile.id)
          .maybeSingle();
        hasAccess = !!coTeacher;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data: interviews, error } = await supabase
        .from('final_exam_interviews')
        .select('*')
        .eq('final_exam_id', examId)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error fetching interviews:', error);
        return res.status(500).json({ error: 'Failed to fetch interviews' });
      }

      const studentIds = (interviews || []).map((item: any) => item.student_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);

        profilesMap = (students || []).reduce((acc: any, student: any) => {
          acc[student.id] = student;
          return acc;
        }, {});
      }

      const formatted = (interviews || []).map((item: any) => {
        const studentProfile = profilesMap[item.student_id];
        let metadata: any = null;
        if (item.notes) {
          try {
            metadata = JSON.parse(item.notes);
          } catch {
            metadata = null;
          }
        }

        return {
          ...item,
          student_name: studentProfile?.full_name || 'Student',
          student_email: studentProfile?.email || '',
          assignment_meta: metadata
        };
      });

      const interviewerIds = [ownerTeacherId].filter(Boolean);
      const { data: coTeachers } = await supabase
        .from('course_teachers')
        .select('teacher_id')
        .eq('course_id', finalExam.course_id);

      (coTeachers || []).forEach((item: any) => {
        if (item.teacher_id && !interviewerIds.includes(item.teacher_id)) {
          interviewerIds.push(item.teacher_id);
        }
      });

      let interviewers: Array<{ id: string; full_name: string; email: string }> = [];
      if (interviewerIds.length > 0) {
        const { data: interviewerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', interviewerIds);

        interviewers = (interviewerProfiles || []).map((item: any) => ({
          id: item.id,
          full_name: item.full_name || 'Teacher',
          email: item.email || ''
        }));
      }

      res.json({ interviews: formatted, interviewers });
    } catch (error: any) {
      console.error('Error in getFinalExamInterviews:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post(
  '/teacher/final-exams/:examId/interviews/auto-schedule',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { examId } = req.params;
      const userId = req.auth?.userId;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const { data: finalExam } = await supabase
        .from('final_exams')
        .select('id, title, exam_type, duration_minutes, resources, course_id, courses!inner(id, title, teacher_id)')
        .eq('id', examId)
        .single();

      if (!finalExam) {
        return res.status(404).json({ error: 'Final exam not found' });
      }

      if (finalExam.exam_type !== 'interview') {
        return res.status(400).json({ error: 'Autoscheduling is available only for interview final exams' });
      }

      const courses: any = finalExam.courses;
      const ownerTeacherId = Array.isArray(courses) ? courses[0]?.teacher_id : courses?.teacher_id;

      let hasAccess = ownerTeacherId === profile.id;

      if (!hasAccess) {
        const { data: coTeacher } = await supabase
          .from('course_teachers')
          .select('teacher_id')
          .eq('course_id', finalExam.course_id)
          .eq('teacher_id', profile.id)
          .maybeSingle();
        hasAccess = !!coTeacher;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const parsedResources = parseResources(finalExam.resources);
      const interviewConfig = parsedResources?.interview_config || {};

      const {
        start_date,
        end_date,
        daily_start_time,
        daily_end_time,
        slot_duration_minutes,
        break_minutes,
        max_students_per_day,
        allow_multi_day,
        auto_assign_co_teachers,
        meeting_link
      } = req.body || {};

      const schedulerStartDate = start_date || new Date().toISOString().slice(0, 10);
      const schedulerEndDate = end_date || schedulerStartDate;
      const schedulerStartTime = daily_start_time || interviewConfig.daily_start_time || '09:00';
      const schedulerEndTime = daily_end_time || interviewConfig.daily_end_time || '17:00';
      const schedulerDuration = Number(slot_duration_minutes || interviewConfig.slot_duration_minutes || finalExam.duration_minutes || 15);
      const schedulerBreak = Number(break_minutes || interviewConfig.break_minutes || 0);
      const schedulerMaxPerDay = Number(max_students_per_day || interviewConfig.max_students_per_day || 30);
      const schedulerAllowMultiDay = allow_multi_day !== undefined ? !!allow_multi_day : interviewConfig.allow_multi_day !== false;
      const schedulerAutoAssign = auto_assign_co_teachers !== undefined
        ? !!auto_assign_co_teachers
        : interviewConfig.auto_assign_co_teachers !== false;

      const startMinutes = toMinutes(schedulerStartTime);
      const endMinutes = toMinutes(schedulerEndTime);

      if (schedulerDuration <= 0 || schedulerMaxPerDay <= 0) {
        return res.status(400).json({ error: 'slot_duration_minutes and max_students_per_day must be greater than 0' });
      }

      if (startMinutes >= endMinutes) {
        return res.status(400).json({ error: 'daily_end_time must be after daily_start_time' });
      }

      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', finalExam.course_id)
        .eq('status', 'active');

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError);
        return res.status(500).json({ error: 'Failed to fetch course enrollments' });
      }

      const studentIds = (enrollments || []).map((item: any) => item.student_id).filter(Boolean);
      if (studentIds.length === 0) {
        return res.status(400).json({ error: 'No active enrolled students found for this course' });
      }

      const { data: existingInterviews } = await supabase
        .from('final_exam_interviews')
        .select('student_id')
        .eq('final_exam_id', examId)
        .in('student_id', studentIds);

      const alreadyScheduled = new Set((existingInterviews || []).map((item: any) => item.student_id));
      const pendingStudents = studentIds.filter((studentId: string) => !alreadyScheduled.has(studentId));

      if (pendingStudents.length === 0) {
        return res.status(200).json({
          message: 'All enrolled students already have interview schedules',
          created_count: 0,
          pending_count: 0,
          total_enrolled: studentIds.length
        });
      }

      const interviewerIds = [ownerTeacherId].filter(Boolean);
      if (schedulerAutoAssign) {
        const { data: coTeachers } = await supabase
          .from('course_teachers')
          .select('teacher_id')
          .eq('course_id', finalExam.course_id)
          .neq('teacher_id', ownerTeacherId);
        (coTeachers || []).forEach((item: any) => {
          if (item.teacher_id && !interviewerIds.includes(item.teacher_id)) {
            interviewerIds.push(item.teacher_id);
          }
        });
      }

      const startDate = new Date(`${schedulerStartDate}T00:00:00`);
      const endDate = new Date(`${schedulerEndDate}T00:00:00`);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
        return res.status(400).json({ error: 'Invalid start_date or end_date' });
      }

      const { data: teacherScheduledInterviews } = await supabase
        .from('final_exam_interviews')
        .select('id, scheduled_date, notes, status')
        .gte('scheduled_date', new Date(`${schedulerStartDate}T00:00:00`).toISOString())
        .lte('scheduled_date', new Date(`${schedulerEndDate}T23:59:59`).toISOString())
        .in('status', ['scheduled', 'rescheduled', 'in-progress']);

      const existingTeacherSlotKeys = new Set(
        (teacherScheduledInterviews || [])
          .map((item: any) => {
            const notesObj = parseResources(item.notes) || {};
            const assignedTeacherId = notesObj?.assigned_interviewer_id;
            if (!assignedTeacherId || !item.scheduled_date) return null;
            const normalizedDate = new Date(item.scheduled_date).toISOString();
            return `${assignedTeacherId}::${normalizedDate}`;
          })
          .filter(Boolean)
      );

      const candidateSlots: Array<{ scheduled_date: string; day_key: string; interviewer_id: string | null }> = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().slice(0, 10);
        let cursor = startMinutes;
        let usedToday = 0;

        while (cursor + schedulerDuration <= endMinutes && usedToday < schedulerMaxPerDay) {
          const slotDate = formatDateFromDayAndMinute(currentDate, cursor);
          const interviewerIndex = candidateSlots.length % Math.max(interviewerIds.length, 1);
          const interviewerId = interviewerIds.length > 0 ? interviewerIds[interviewerIndex] : null;
          const slotConflictKey = interviewerId ? `${interviewerId}::${slotDate}` : null;

          if (slotConflictKey && existingTeacherSlotKeys.has(slotConflictKey)) {
            cursor += schedulerDuration + schedulerBreak;
            continue;
          }

          candidateSlots.push({
            scheduled_date: slotDate,
            day_key: dayKey,
            interviewer_id: interviewerId
          });

          usedToday += 1;
          cursor += schedulerDuration + schedulerBreak;
        }

        if (!schedulerAllowMultiDay) {
          break;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (candidateSlots.length < pendingStudents.length) {
        return res.status(400).json({
          error: 'Not enough interview slots for all pending students',
          required_slots: pendingStudents.length,
          available_slots: candidateSlots.length
        });
      }

      const inserts = pendingStudents.map((studentId: string, index: number) => {
        const slot = candidateSlots[index];
        const notePayload = {
          auto_scheduled: true,
          assigned_interviewer_id: slot.interviewer_id,
          assigned_by: profile.id,
          scheduling_window: {
            start_date: schedulerStartDate,
            end_date: schedulerEndDate,
            daily_start_time: schedulerStartTime,
            daily_end_time: schedulerEndTime,
            slot_duration_minutes: schedulerDuration,
            break_minutes: schedulerBreak,
            max_students_per_day: schedulerMaxPerDay,
            allow_multi_day: schedulerAllowMultiDay
          }
        };

        return {
          final_exam_id: examId,
          student_id: studentId,
          scheduled_date: slot.scheduled_date,
          duration_minutes: schedulerDuration,
          meeting_link: meeting_link || null,
          notes: JSON.stringify(notePayload),
          status: 'scheduled',
          updated_at: new Date().toISOString()
        };
      });

      const { data: createdInterviews, error: insertError } = await supabase
        .from('final_exam_interviews')
        .upsert(inserts, { onConflict: 'final_exam_id,student_id' })
        .select('id, student_id, scheduled_date, status');

      if (insertError) {
        console.error('Error creating interview schedule:', insertError);
        return res.status(500).json({ error: 'Failed to auto-schedule interviews' });
      }

      const assignmentCountByTeacher = inserts.reduce((acc: Record<string, number>, item: any) => {
        const parsedNotes = parseResources(item.notes) || {};
        const teacherId = parsedNotes.assigned_interviewer_id;
        if (teacherId) {
          acc[teacherId] = (acc[teacherId] || 0) + 1;
        }
        return acc;
      }, {});

      const assignedTeacherIds = Object.keys(assignmentCountByTeacher);
      if (assignedTeacherIds.length > 0) {
        const { data: teacherProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assignedTeacherIds);

        await Promise.allSettled((teacherProfiles || []).map((teacher: any) => {
          const count = assignmentCountByTeacher[teacher.id] || 0;
          if (!teacher.email || count === 0) return Promise.resolve();
          return notifyTeacherInterviewAssignment(teacher.email, teacher.full_name || 'Teacher', {
            examTitle: finalExam.title || 'Final Exam Interview',
            courseTitle: (Array.isArray(finalExam.courses) ? finalExam.courses[0]?.title : (finalExam.courses as any)?.title) || 'Course',
            assignedCount: count,
            startDate: schedulerStartDate,
            endDate: schedulerEndDate
          });
        }));
      }

      res.json({
        message: 'Interview schedule created successfully',
        created_count: createdInterviews?.length || 0,
        pending_count: pendingStudents.length,
        total_enrolled: studentIds.length,
        interviews: createdInterviews || []
      });
    } catch (error: any) {
      console.error('Error in autoScheduleFinalExamInterviews:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.patch(
  '/teacher/final-exams/:examId/interviews/:interviewId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { examId, interviewId } = req.params;
      const userId = req.auth?.userId;
      const {
        scheduled_date,
        duration_minutes,
        meeting_link,
        status,
        assigned_interviewer_id,
        notes
      } = req.body || {};

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      const { data: finalExam } = await supabase
        .from('final_exams')
        .select('id, exam_type, course_id, courses!inner(id, teacher_id)')
        .eq('id', examId)
        .single();

      if (!finalExam) {
        return res.status(404).json({ error: 'Final exam not found' });
      }

      if (finalExam.exam_type !== 'interview') {
        return res.status(400).json({ error: 'Interview management is only available for interview final exams' });
      }

      const courses: any = finalExam.courses;
      const ownerTeacherId = Array.isArray(courses) ? courses[0]?.teacher_id : courses?.teacher_id;

      let hasAccess = ownerTeacherId === profile.id;
      if (!hasAccess) {
        const { data: coTeacher } = await supabase
          .from('course_teachers')
          .select('teacher_id')
          .eq('course_id', finalExam.course_id)
          .eq('teacher_id', profile.id)
          .maybeSingle();
        hasAccess = !!coTeacher;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data: existingInterview, error: interviewError } = await supabase
        .from('final_exam_interviews')
        .select('id, final_exam_id, notes')
        .eq('id', interviewId)
        .eq('final_exam_id', examId)
        .single();

      if (interviewError || !existingInterview) {
        return res.status(404).json({ error: 'Interview schedule not found' });
      }

      let existingNotes: any = {};
      if (existingInterview.notes) {
        try {
          existingNotes = typeof existingInterview.notes === 'string'
            ? JSON.parse(existingInterview.notes)
            : existingInterview.notes;
        } catch {
          existingNotes = {};
        }
      }

      const mergedNotes = {
        ...existingNotes,
        ...(typeof notes === 'object' && notes ? notes : {}),
        ...(assigned_interviewer_id ? { assigned_interviewer_id } : {}),
        updated_by: profile.id,
        updated_at: new Date().toISOString()
      };

      const updatePayload: any = {
        updated_at: new Date().toISOString(),
        notes: JSON.stringify(mergedNotes)
      };

      if (scheduled_date !== undefined) {
        if (scheduled_date) {
          const parsedDate = new Date(scheduled_date);
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: 'Invalid scheduled_date' });
          }
          updatePayload.scheduled_date = parsedDate.toISOString();
        } else {
          updatePayload.scheduled_date = null;
        }
      }

      if (duration_minutes !== undefined) {
        const parsedDuration = Number(duration_minutes);
        if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
          return res.status(400).json({ error: 'duration_minutes must be greater than 0' });
        }
        updatePayload.duration_minutes = parsedDuration;
      }

      if (meeting_link !== undefined) {
        updatePayload.meeting_link = meeting_link || null;
      }

      if (status !== undefined) {
        const normalizedStatus = String(status || '').toLowerCase();
        const allowedStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];
        if (!allowedStatuses.includes(normalizedStatus)) {
          return res.status(400).json({ error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` });
        }
        updatePayload.status = normalizedStatus;
      }

      const { data: updatedInterview, error: updateError } = await supabase
        .from('final_exam_interviews')
        .update(updatePayload)
        .eq('id', interviewId)
        .eq('final_exam_id', examId)
        .select('*')
        .single();

      if (updateError || !updatedInterview) {
        console.error('Error updating interview schedule:', updateError);
        return res.status(500).json({ error: 'Failed to update interview schedule' });
      }

      res.json({
        message: 'Interview schedule updated successfully',
        interview: updatedInterview
      });
    } catch (error: any) {
      console.error('Error in updateFinalExamInterview:', error);
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
            student_id,
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
      const now = new Date();

      const visibleExams = (finalExams || []).filter((exam: any) => {
        const publishAtRaw = exam?.resources?.publish_at;
        if (!publishAtRaw) return true;

        const publishAt = new Date(publishAtRaw);
        if (isNaN(publishAt.getTime())) return true;

        return publishAt <= now;
      });

      const examIds = visibleExams.map((exam: any) => exam.id).filter(Boolean);

      let interviewMap: Record<string, any> = {};
      if (examIds.length > 0) {
        const { data: interviews } = await supabase
          .from('final_exam_interviews')
          .select('id, final_exam_id, scheduled_date, duration_minutes, meeting_link, status, notes')
          .in('final_exam_id', examIds)
          .eq('student_id', profile.id);

        interviewMap = (interviews || []).reduce((acc: any, interview: any) => {
          acc[interview.final_exam_id] = interview;
          return acc;
        }, {});
      }

      const formattedExams = visibleExams.map((exam: any) => {
        const submissions = Array.isArray(exam.final_exam_submissions)
          ? exam.final_exam_submissions
          : exam.final_exam_submissions
          ? [exam.final_exam_submissions]
          : [];

        const studentSubmission = submissions.find((sub: any) => sub.student_id === profile.id);

        return {
          ...exam,
          submission: studentSubmission || null,
          interview: interviewMap[exam.id] || null,
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

router.get(
  '/student/exams/:examId/details',
  requireAuth,
  async (req: any, res) => {
    try {
      const { examId } = req.params;
      const userId = req.auth?.userId;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const { data: interview } = await supabase
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
          final_exams!inner (
            id,
            title,
            course_id,
            courses!inner (
              id,
              title,
              teacher_id
            )
          )
        `)
        .eq('final_exam_id', examId)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (!interview) {
        return res.status(404).json({ error: 'Interview not found for this student' });
      }

      const finalExamData: any = interview.final_exams;
      const courseData: any = Array.isArray(finalExamData?.courses) ? finalExamData.courses[0] : finalExamData?.courses;

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseData?.id)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      const notesObj = parseResources(interview.notes) || {};
      const assignedInterviewerId = notesObj.assigned_interviewer_id || courseData?.teacher_id;

      let teacherName = 'Teacher';
      if (assignedInterviewerId) {
        const { data: teacherProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', assignedInterviewerId)
          .maybeSingle();
        teacherName = teacherProfile?.full_name || 'Teacher';
      }

      return res.json({
        id: interview.id,
        student_id: profile.id,
        student_name: profile.full_name || 'Student',
        final_exam_id: interview.final_exam_id,
        exam_title: finalExamData?.title || 'Final Exam Interview',
        course_title: courseData?.title || 'Course',
        scheduled_date: interview.scheduled_date,
        duration_minutes: interview.duration_minutes,
        meeting_link: interview.meeting_link,
        status: interview.status,
        teacher_name: teacherName
      });
    } catch (error: any) {
      console.error('Error in getStudentInterviewDetails:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.patch(
  '/student/exams/:examId/mark-started',
  requireAuth,
  async (req: any, res) => {
    try {
      const { examId } = req.params;
      const userId = req.auth?.userId;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const { data: interview, error } = await supabase
        .from('final_exam_interviews')
        .update({
          status: 'in-progress',
          updated_at: new Date().toISOString()
        })
        .eq('final_exam_id', examId)
        .eq('student_id', profile.id)
        .select('id, status')
        .maybeSingle();

      if (error || !interview) {
        return res.status(404).json({ error: 'Interview not found for this student' });
      }

      return res.json({
        message: 'Interview marked as in-progress',
        interview
      });
    } catch (error: any) {
      console.error('Error in markStudentInterviewStarted:', error);
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

      // Validate final exam visibility and enrollment
      const { data: finalExam, error: finalExamError } = await supabase
        .from('final_exams')
        .select('id, course_id, is_published, resources')
        .eq('id', examId)
        .single();

      if (finalExamError || !finalExam) {
        return res.status(404).json({ error: 'Final exam not found' });
      }

      if (!finalExam.is_published) {
        return res.status(403).json({ error: 'Final exam is not published yet' });
      }

      const publishAtRaw = (finalExam as any)?.resources?.publish_at;
      if (publishAtRaw) {
        const publishAt = new Date(publishAtRaw);
        if (!isNaN(publishAt.getTime()) && publishAt > new Date()) {
          return res.status(403).json({ error: 'Final exam is not available yet' });
        }
      }

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', finalExam.course_id)
        .eq('student_id', profile.id)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
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
