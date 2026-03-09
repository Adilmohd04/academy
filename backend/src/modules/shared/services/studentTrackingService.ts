import { supabase } from '../../../config/database';

/**
 * Student Tracking Service
 * Comprehensive tracking for quiz marks, assignments, activities, and progress
 */

/**
 * Get comprehensive student tracking data for a course
 * Returns structured data matching the StudentDetailModal expected shape
 */
export const getStudentTrackingData = async (studentId: string, courseId: string) => {
  try {
    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, full_name, email')
      .eq('clerk_user_id', studentId)
      .single();

    // Get enrollment info
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('enrolled_at, status, progress_percentage')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    // Get all lessons for this course via course_weeks
    const { data: allLessons } = await supabase
      .from('course_lessons')
      .select('id, title, content_type, assignment_details, week_id, course_weeks!inner(course_id)')
      .eq('course_weeks.course_id', courseId);

    const lessons = allLessons || [];
    const quizLessons = lessons.filter((l: any) => l.content_type === 'quiz');
    const assignLessons = lessons.filter((l: any) => l.content_type === 'assignment');
    const quizLessonIds = quizLessons.map((l: any) => l.id);
    const assignLessonIds = assignLessons.map((l: any) => l.id);

    // Get quiz submissions by lesson_id (with course_id fallback)
    let quizSubs: any[] = [];
    if (quizLessonIds.length > 0) {
      const { data: qByLesson } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('student_id', studentId)
        .in('lesson_id', quizLessonIds)
        .order('submitted_at', { ascending: false });
      if (qByLesson && qByLesson.length > 0) quizSubs = qByLesson;
    }
    if (quizSubs.length === 0) {
      const { data: qByCourse } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .order('submitted_at', { ascending: false });
      if (qByCourse) quizSubs = qByCourse;
    }

    // Get assignment submissions by lesson_id (with course_id fallback)
    let assignSubs: any[] = [];
    if (assignLessonIds.length > 0) {
      const { data: aByLesson } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .in('lesson_id', assignLessonIds)
        .order('submitted_at', { ascending: false });
      if (aByLesson && aByLesson.length > 0) assignSubs = aByLesson;
    }
    if (assignSubs.length === 0) {
      const { data: aByCourse } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .order('submitted_at', { ascending: false });
      if (aByCourse) assignSubs = aByCourse;
    }

    // Build structured quizzes array (grouped by lesson)
    const quizMap: Record<string, any[]> = {};
    quizSubs.forEach((qs: any) => {
      const key = qs.lesson_id || qs.quiz_id || qs.id;
      if (!quizMap[key]) quizMap[key] = [];
      quizMap[key].push(qs);
    });

    const quizzes = quizLessons.map((lesson: any) => {
      const attempts = quizMap[lesson.id] || [];
      const bestAttempt = attempts.reduce((best: any, a: any) => {
        const pct = a.percentage ?? (a.score && a.total_points ? (a.score / a.total_points) * 100 : a.score ?? 0);
        const bestPct = best ? (best.percentage ?? (best.score && best.total_points ? (best.score / best.total_points) * 100 : best.score ?? 0)) : -1;
        return pct > bestPct ? a : best;
      }, null);

      return {
        quiz_id: lesson.id,
        quiz_title: lesson.title,
        deadline: null,
        max_attempts: 0,
        total_questions: 0,
        max_score: bestAttempt?.total_points || bestAttempt?.max_score || 100,
        attempts: attempts.map((a: any) => ({
          id: a.id,
          attempted_at: a.submitted_at || a.created_at,
          score: a.score ?? a.marks_obtained ?? 0,
          percentage: a.percentage ?? (a.score && a.total_points ? Math.round((a.score / a.total_points) * 100) : a.score ?? 0),
          passed: (a.percentage ?? a.score ?? 0) >= 50,
          status: a.status || 'completed',
        })),
        best_score: bestAttempt ? (bestAttempt.percentage ?? (bestAttempt.score && bestAttempt.total_points ? Math.round((bestAttempt.score / bestAttempt.total_points) * 100) : bestAttempt.score ?? 0)) : null,
        attempts_count: attempts.length,
      };
    });

    // Build structured assignments array
    const assignSubMap: Record<string, any> = {};
    assignSubs.forEach((as: any) => {
      const key = as.lesson_id || as.assignment_id;
      // Keep latest submission per lesson
      if (!assignSubMap[key] || new Date(as.submitted_at) > new Date(assignSubMap[key].submitted_at)) {
        assignSubMap[key] = as;
      }
    });

    const assignments = assignLessons.map((lesson: any) => {
      const sub = assignSubMap[lesson.id] || null;
      const maxPts = lesson.assignment_details?.max_grade || sub?.max_grade || 100;
      return {
        assignment_id: lesson.id,
        assignment_title: lesson.title,
        deadline: lesson.assignment_details?.deadline || null,
        max_points: maxPts,
        submission: sub ? {
          id: sub.id,
          submitted_at: sub.submitted_at,
          grade: sub.grade,
          percentage: sub.grade != null && maxPts > 0 ? Math.round((sub.grade / maxPts) * 100) : null,
          feedback: sub.feedback,
          status: sub.status || 'submitted',
          submission_url: sub.file_url || sub.link_url || null,
        } : null,
      };
    });

    // Calculate summary
    const completedQuizzes = quizzes.filter((q: any) => q.attempts_count > 0).length;
    const submittedAssignments = assignments.filter((a: any) => a.submission).length;
    const gradedAssignments = assignments.filter((a: any) => a.submission?.status === 'graded').length;

    // Average ALL quizzes — untaken quizzes count as 0%
    const allQuizScores = quizzes.map((q: any) => q.best_score != null ? q.best_score : 0);
    const quizAverage = allQuizScores.length > 0
      ? Math.round(allQuizScores.reduce((s: number, v: number) => s + v, 0) / allQuizScores.length)
      : null;

    // Average ALL assignments — unsubmitted count as 0%
    const allAssignScores = assignments.map((a: any) => a.submission?.percentage != null ? a.submission.percentage : 0);
    const assignAverage = allAssignScores.length > 0
      ? Math.round(allAssignScores.reduce((s: number, v: number) => s + v, 0) / allAssignScores.length)
      : null;

    const totalAverage = (quizAverage != null || assignAverage != null)
      ? Math.round(((quizAverage || 0) * 0.6 + (assignAverage || 0) * 0.4))
      : null;

    // Compute lesson progress percentage
    const lessonIds = lessons.map((l: any) => l.id);
    let progressPercentage = enrollment?.progress_percentage || 0;
    if (lessonIds.length > 0) {
      const { data: progressRows } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed')
        .eq('student_id', studentId)
        .in('lesson_id', lessonIds);
      const completed = (progressRows || []).filter((p: any) => p.is_completed).length;
      progressPercentage = Math.round((completed / lessonIds.length) * 100);
    }

    return {
      success: true,
      student: {
        id: studentId,
        name: profile?.full_name || 'Unknown',
        email: profile?.email || 'N/A',
        enrolled_at: enrollment?.enrolled_at || null,
        progress_percentage: progressPercentage,
        completed: progressPercentage >= 100,
      },
      quizzes,
      assignments,
      summary: {
        quiz_average: quizAverage,
        assignment_average: assignAverage,
        total_average: totalAverage,
        certificate_eligible: progressPercentage >= 100 && (totalAverage || 0) >= 50,
        total_quizzes: quizLessons.length,
        completed_quizzes: completedQuizzes,
        total_assignments: assignLessons.length,
        submitted_assignments: submittedAssignments,
        graded_assignments: gradedAssignments,
      },
    };
  } catch (error: any) {
    console.error('[getStudentTrackingData] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch student tracking data'
    };
  }
};

/**
 * Get all students' tracking data for a course (teacher view)
 * Computes progress from actual source tables for accuracy
 */
export const getCourseStudentTracking = async (courseId: string) => {
  try {
    // Get all enrollments for the course
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id, enrolled_at, status, progress_percentage, last_accessed')
      .eq('course_id', courseId);

    if (enrollError) throw enrollError;

    if (!enrollments || enrollments.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const clerkUserIds = enrollments.map(e => e.student_id);

    // Get student profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, full_name, email')
      .in('clerk_user_id', clerkUserIds);

    if (profileError) throw profileError;

    // Get total lessons count for this course
    const { data: allLessons, error: lessonsError } = await supabase
      .from('course_lessons')
      .select('id, content_type, week_id, course_weeks!inner(course_id)')
      .eq('course_weeks.course_id', courseId);

    if (lessonsError) {
      console.error('[getCourseStudentTracking] Error fetching lessons:', lessonsError);
    }

    const totalLessons = (allLessons || []).length;
    const totalQuizzes = (allLessons || []).filter((l: any) => l.content_type === 'quiz').length;
    const totalAssignments = (allLessons || []).filter((l: any) => l.content_type === 'assignment').length;
    const lessonIds = (allLessons || []).map((l: any) => l.id);

    // Get lesson progress for all students in this course
    const { data: lessonProgressData, error: lpError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, student_id, is_completed')
      .in('student_id', clerkUserIds)
      .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['__none__']);

    if (lpError) {
      console.error('[getCourseStudentTracking] Error fetching lesson progress:', lpError);
    }

    // Build lesson progress map: student_id -> completed count
    const lessonProgressMap: Record<string, number> = {};
    (lessonProgressData || []).forEach((lp: any) => {
      if (lp.is_completed) {
        lessonProgressMap[lp.student_id] = (lessonProgressMap[lp.student_id] || 0) + 1;
      }
    });

    // Get quiz submissions - try course_id first, then fall back to lesson_id matching
    const quizLessonIds = (allLessons || []).filter((l: any) => l.content_type === 'quiz').map((l: any) => l.id);
    let quizSubs: any[] = [];
    
    // Try by course_id first
    const { data: quizSubsByCourse, error: quizError } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('course_id', courseId)
      .in('student_id', clerkUserIds);

    if (!quizError && quizSubsByCourse && quizSubsByCourse.length > 0) {
      quizSubs = quizSubsByCourse;
    } else {
      // Fallback: query by lesson_id for quizzes in this course
      if (quizLessonIds.length > 0) {
        const { data: quizSubsByLesson, error: quizError2 } = await supabase
          .from('quiz_submissions')
          .select('*')
          .in('lesson_id', quizLessonIds)
          .in('student_id', clerkUserIds);
        
        if (!quizError2 && quizSubsByLesson) {
          quizSubs = quizSubsByLesson;
        }
        if (quizError2) {
          console.error('[getCourseStudentTracking] Error fetching quiz submissions by lesson_id:', quizError2);
        }
      }
    }

    if (quizError) {
      console.error('[getCourseStudentTracking] Error fetching quiz submissions by course_id:', quizError);
    }

    // Build quiz map: student_id -> { completed quiz IDs, total score %, count }
    const quizCompletionMap: Record<string, Set<string>> = {};
    const quizScoreMap: Record<string, { totalPct: number; count: number }> = {};
    (quizSubs || []).forEach((qs: any) => {
      if (!quizCompletionMap[qs.student_id]) {
        quizCompletionMap[qs.student_id] = new Set();
      }
      // Try quiz_id first, then lesson_id as fallback for identifying unique quizzes
      const quizKey = qs.quiz_id || qs.lesson_id || qs.id;
      quizCompletionMap[qs.student_id].add(quizKey);
      
      if (!quizScoreMap[qs.student_id]) {
        quizScoreMap[qs.student_id] = { totalPct: 0, count: 0 };
      }
      // Calculate percentage from available fields
      let pct = 0;
      if (qs.percentage != null && Number(qs.percentage) > 0) {
        pct = Number(qs.percentage);
      } else if (qs.score != null && qs.total_points && Number(qs.total_points) > 0) {
        pct = (Number(qs.score) / Number(qs.total_points)) * 100;
      } else if (qs.score != null && qs.max_score && Number(qs.max_score) > 0) {
        pct = (Number(qs.score) / Number(qs.max_score)) * 100;
      } else if (qs.marks_obtained != null && qs.total_marks && Number(qs.total_marks) > 0) {
        pct = (Number(qs.marks_obtained) / Number(qs.total_marks)) * 100;
      } else if (qs.score != null && Number(qs.score) <= 100) {
        pct = Number(qs.score); // score is already a percentage
      }
      quizScoreMap[qs.student_id].totalPct += pct;
      quizScoreMap[qs.student_id].count++;
    });

    // Get assignment submissions
    // Get assignment submissions - try course_id first, then fall back to lesson_id
    const assignLessonIds = (allLessons || []).filter((l: any) => l.content_type === 'assignment').map((l: any) => l.id);
    let assignSubs: any[] = [];
    
    const { data: assignSubsByCourse, error: assignError } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('course_id', courseId)
      .in('student_id', clerkUserIds);

    if (!assignError && assignSubsByCourse && assignSubsByCourse.length > 0) {
      assignSubs = assignSubsByCourse;
    } else {
      if (assignLessonIds.length > 0) {
        const { data: assignSubsByLesson, error: assignError2 } = await supabase
          .from('assignment_submissions')
          .select('*')
          .in('lesson_id', assignLessonIds)
          .in('student_id', clerkUserIds);
        
        if (!assignError2 && assignSubsByLesson) {
          assignSubs = assignSubsByLesson;
        }
      }
    }

    if (assignError) {
      console.error('[getCourseStudentTracking] Error fetching assignment submissions:', assignError);
    }

    // Build assignment map
    const assignCompletionMap: Record<string, Set<string>> = {};
    const assignGradeMap: Record<string, { totalPct: number; count: number }> = {};
    (assignSubs || []).forEach((as: any) => {
      if (!assignCompletionMap[as.student_id]) {
        assignCompletionMap[as.student_id] = new Set();
      }
      const assignKey = as.assignment_id || as.lesson_id || as.id;
      assignCompletionMap[as.student_id].add(assignKey);
      
      if (as.status === 'graded' || as.marks_obtained != null || as.grade_percentage != null) {
        if (!assignGradeMap[as.student_id]) {
          assignGradeMap[as.student_id] = { totalPct: 0, count: 0 };
        }
        let pct = 0;
        if (as.grade_percentage != null) {
          pct = Number(as.grade_percentage);
        } else if (as.marks_obtained != null && as.total_marks) {
          pct = (Number(as.marks_obtained) / Number(as.total_marks)) * 100;
        }
        assignGradeMap[as.student_id].totalPct += pct;
        assignGradeMap[as.student_id].count++;
      }
    });

    // Get progress summaries as fallback (for live classes attendance data)
    const { data: progressData } = await supabase
      .from('student_progress_summary')
      .select('student_id, live_classes_attended, total_live_classes, certificate_eligible, certificate_issued')
      .eq('course_id', courseId)
      .in('student_id', clerkUserIds);

    const progressSummaryMap = (progressData || []).reduce((acc: any, p: any) => {
      acc[p.student_id] = p;
      return acc;
    }, {});

    // Create profiles map
    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.clerk_user_id] = p;
      return acc;
    }, {});

    // Combine data
    const studentsWithTracking = enrollments.map(enrollment => {
      const profile = profileMap[enrollment.student_id];
      const progressSummary = progressSummaryMap[enrollment.student_id];
      
      const lessonsCompleted = lessonProgressMap[enrollment.student_id] || 0;
      const lessonsPercentage = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
      
      const quizzesCompleted = quizCompletionMap[enrollment.student_id]?.size || 0;
      const quizScore = quizScoreMap[enrollment.student_id];
      const averageQuizScore = quizScore && quizScore.count > 0 ? Math.round(quizScore.totalPct / quizScore.count) : 0;
      const quizzesPercentage = totalQuizzes > 0 ? Math.round((quizzesCompleted / totalQuizzes) * 100) : 0;
      
      const assignmentsCompleted = assignCompletionMap[enrollment.student_id]?.size || 0;
      const assignData = assignGradeMap[enrollment.student_id];
      const averageAssignmentGrade = assignData && assignData.count > 0 ? Math.round(assignData.totalPct / assignData.count) : 0;
      const assignmentsPercentage = totalAssignments > 0 ? Math.round((assignmentsCompleted / totalAssignments) * 100) : 0;

      const liveClassesAttended = progressSummary?.live_classes_attended || 0;
      const totalLiveClasses = progressSummary?.total_live_classes || 0;
      const attendancePercentage = totalLiveClasses > 0 ? Math.round((liveClassesAttended / totalLiveClasses) * 100) : 0;

      // Weighted overall progress
      const overallProgress = Math.round(
        lessonsPercentage * 0.4 + quizzesPercentage * 0.3 + assignmentsPercentage * 0.3
      );
      
      // Weighted overall grade
      const overallGrade = Math.round(
        averageQuizScore * 0.6 + averageAssignmentGrade * 0.4
      );

      return {
        student_id: enrollment.student_id,
        enrolled_at: enrollment.enrolled_at,
        enrollment_status: enrollment.status,
        full_name: profile?.full_name || 'Unknown',
        email: profile?.email || 'N/A',
        
        // Progress metrics
        overall_progress: overallProgress,
        overall_grade: overallGrade,
        
        lessons_completed: lessonsCompleted,
        total_lessons: totalLessons,
        lessons_percentage: lessonsPercentage,
        
        quizzes_completed: quizzesCompleted,
        total_quizzes: totalQuizzes,
        quizzes_percentage: quizzesPercentage,
        average_quiz_score: averageQuizScore,
        
        assignments_completed: assignmentsCompleted,
        total_assignments: totalAssignments,
        assignments_percentage: assignmentsPercentage,
        average_assignment_grade: averageAssignmentGrade,
        
        live_classes_attended: liveClassesAttended,
        total_live_classes: totalLiveClasses,
        attendance_percentage: attendancePercentage,
        
        is_completed: lessonsPercentage >= 100 && quizzesPercentage >= 100 && assignmentsPercentage >= 100,
        certificate_eligible: progressSummary?.certificate_eligible || false,
        certificate_issued: progressSummary?.certificate_issued || false,
        
        last_accessed: (enrollment as any).last_accessed || null,
        updated_at: null
      };
    });

    return {
      success: true,
      data: studentsWithTracking
    };
  } catch (error: any) {
    console.error('[getCourseStudentTracking] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch course student tracking'
    };
  }
};

/**
 * Submit a quiz and calculate score
 */
export const submitQuiz = async (
  studentId: string,
  courseId: string,
  quizId: string,
  answers: any,
  timeTakenSeconds?: number
) => {
  try {
    // Get quiz details to calculate score
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*, quiz_questions(*)')
      .eq('id', quizId)
      .single();

    if (quizError) throw quizError;

    // Calculate score
    let score = 0;
    const maxScore = quiz.max_score || 100;

    // Auto-grade (simplified - you can enhance this)
    const questions = quiz.quiz_questions || [];
    const pointsPerQuestion = maxScore / Math.max(questions.length, 1);

    questions.forEach((question: any) => {
      const studentAnswer = answers[question.id];
      const correctAnswer = question.correct_answer;

      if (studentAnswer === correctAnswer) {
        score += pointsPerQuestion;
      }
    });

    // Get attempt number
    const { data: existingAttempts } = await supabase
      .from('quiz_submissions')
      .select('attempt_number')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const attemptNumber = existingAttempts && existingAttempts.length > 0
      ? existingAttempts[0].attempt_number + 1
      : 1;

    // Insert submission
    const { data: submission, error: submitError } = await supabase
      .from('quiz_submissions')
      .insert({
        student_id: studentId,
        course_id: courseId,
        quiz_id: quizId,
        answers,
        score: Math.round(score * 100) / 100,
        max_score: maxScore,
        attempt_number: attemptNumber,
        is_final_attempt: true,
        time_taken_seconds: timeTakenSeconds,
        auto_graded: true,
        graded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (submitError) throw submitError;

    // Update total quizzes count in progress summary
    await updateProgressTotals(studentId, courseId);

    return {
      success: true,
      data: submission
    };
  } catch (error: any) {
    console.error('[submitQuiz] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit quiz'
    };
  }
};

/**
 * Submit an assignment
 */
export const submitAssignment = async (
  studentId: string,
  courseId: string,
  assignmentId: string,
  submissionText?: string,
  fileUrl?: string,
  fileName?: string,
  fileSize?: number
) => {
  try {
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*, due_date')
      .eq('id', assignmentId)
      .single();

    if (assignmentError) throw assignmentError;

    // Check if late
    const isLate = assignment.due_date 
      ? new Date() > new Date(assignment.due_date)
      : false;

    // Get attempt number
    const { data: existingAttempts } = await supabase
      .from('assignment_submissions')
      .select('attempt_number')
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const attemptNumber = existingAttempts && existingAttempts.length > 0
      ? existingAttempts[0].attempt_number + 1
      : 1;

    // Insert submission
    const { data: submission, error: submitError } = await supabase
      .from('assignment_submissions')
      .insert({
        student_id: studentId,
        course_id: courseId,
        assignment_id: assignmentId,
        submission_text: submissionText,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        max_grade: assignment.max_grade || 100,
        attempt_number: attemptNumber,
        is_final_submission: true,
        is_late: isLate,
        status: 'submitted'
      })
      .select()
      .single();

    if (submitError) throw submitError;

    // Update total assignments count in progress summary
    await updateProgressTotals(studentId, courseId);

    // Log activity
    await logActivity(studentId, courseId, 'assignment_submitted', { assignment_id: assignmentId });

    return {
      success: true,
      data: submission
    };
  } catch (error: any) {
    console.error('[submitAssignment] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit assignment'
    };
  }
};

/**
 * Grade an assignment (teacher)
 */
export const gradeAssignment = async (
  submissionId: string,
  grade: number,
  feedback: string,
  gradedBy: string
) => {
  try {
    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .update({
        grade,
        feedback,
        graded_by: gradedBy,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: submission
    };
  } catch (error: any) {
    console.error('[gradeAssignment] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to grade assignment'
    };
  }
};

/**
 * Log student activity
 */
export const logActivity = async (
  studentId: string,
  courseId: string,
  activityType: string,
  activityData?: any,
  durationSeconds?: number
) => {
  try {
    const { error } = await supabase
      .from('student_activities')
      .insert({
        student_id: studentId,
        course_id: courseId,
        activity_type: activityType,
        activity_data: activityData || {},
        duration_seconds: durationSeconds,
        lesson_id: activityData?.lesson_id,
        quiz_id: activityData?.quiz_id,
        assignment_id: activityData?.assignment_id,
        live_session_id: activityData?.live_session_id
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[logActivity] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to log activity'
    };
  }
};

/**
 * Update progress totals (called when course content changes)
 */
export const updateProgressTotals = async (studentId: string, courseId: string) => {
  try {
    // Count total quizzes for this course
    const { count: totalQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // Count total assignments for this course
    const { count: totalAssignments } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // Count total lessons (from course_lessons table)
    const { count: totalLessons } = await supabase
      .from('course_lessons')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // Update or insert progress summary
    const { error } = await supabase
      .from('student_progress_summary')
      .upsert({
        student_id: studentId,
        course_id: courseId,
        total_quizzes: totalQuizzes || 0,
        total_assignments: totalAssignments || 0,
        total_lessons: totalLessons || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,course_id'
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[updateProgressTotals] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update progress totals'
    };
  }
};

/**
 * Get student performance view
 */
export const getStudentPerformanceView = async (courseId?: string) => {
  try {
    let query = supabase
      .from('vw_student_performance')
      .select('*')
      .order('updated_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  } catch (error: any) {
    console.error('[getStudentPerformanceView] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch student performance'
    };
  }
};
