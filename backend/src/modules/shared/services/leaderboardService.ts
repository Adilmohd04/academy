/**
 * Leaderboard Service
 * 
 * Handles:
 * - Weekly leaderboard during live courses
 * - Overall course leaderboard
 * - Top 5 rankings display
 */

import { supabase } from '../../../config/database';

interface WeeklyLeaderboardEntry {
  id: string;
  course_id: string;
  week_id: string;
  student_id: string;
  student_name?: string;
  quiz_score: number;
  assignment_score: number;
  participation_score: number;
  total_score: number;
  rank: number;
}

interface CourseLeaderboardEntry {
  id: string;
  course_id: string;
  student_id: string;
  student_name?: string;
  internal_average: number;
  final_exam_score: number;
  total_score: number;
  completion_percentage: number;
  rank: number;
  badges: string[];
}

/**
 * Get weekly leaderboard for a specific week
 */
export const getWeeklyLeaderboard = async (
  courseId: string,
  weekId: string,
  limit: number = 10
): Promise<WeeklyLeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('weekly_leaderboard')
    .select('*')
    .eq('course_id', courseId)
    .eq('week_id', weekId)
    .order('rank')
    .limit(limit);

  if (error) throw error;

  // Manually fetch student profiles
  const studentIds = (data || []).map((e: any) => e.student_id).filter(Boolean);
  let profilesMap: Record<string, any> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name')
      .in('clerk_user_id', studentIds);
    profilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.clerk_user_id] = p;
      return acc;
    }, {});
  }

  return (data || []).map(entry => ({
    ...entry,
    student_name: profilesMap[entry.student_id]?.full_name,
    avatar: null
  }));
};

/**
 * Get top 5 for weekly leaderboard (for display during live classes)
 */
export const getWeeklyTop5 = async (
  courseId: string,
  weekId: string
): Promise<WeeklyLeaderboardEntry[]> => {
  return getWeeklyLeaderboard(courseId, weekId, 5);
};

/**
 * Get overall course leaderboard
 */
export const getCourseLeaderboard = async (
  courseId: string,
  limit: number = 50
): Promise<CourseLeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('course_leaderboard')
    .select('*')
    .eq('course_id', courseId)
    .order('rank')
    .limit(limit);

  if (error) throw error;

  // Manually fetch student profiles
  const studentIds = (data || []).map((e: any) => e.student_id).filter(Boolean);
  let profilesMap: Record<string, any> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name')
      .in('clerk_user_id', studentIds);
    profilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.clerk_user_id] = p;
      return acc;
    }, {});
  }

  return (data || []).map(entry => ({
    ...entry,
    student_name: profilesMap[entry.student_id]?.full_name,
    avatar: null
  }));
};

/**
 * Get top 5 for course leaderboard
 */
export const getCourseTop5 = async (
  courseId: string
): Promise<CourseLeaderboardEntry[]> => {
  return getCourseLeaderboard(courseId, 5);
};

/**
 * Get student's position in weekly leaderboard
 */
export const getStudentWeeklyRank = async (
  courseId: string,
  weekId: string,
  studentId: string
): Promise<WeeklyLeaderboardEntry | null> => {
  const { data, error } = await supabase
    .from('weekly_leaderboard')
    .select('*')
    .eq('course_id', courseId)
    .eq('week_id', weekId)
    .eq('student_id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) return null;

  // Manually fetch student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('clerk_user_id', studentId)
    .single();

  return {
    ...data,
    student_name: profile?.full_name
  };
};

/**
 * Get student's position in course leaderboard
 */
export const getStudentCourseRank = async (
  courseId: string,
  studentId: string
): Promise<CourseLeaderboardEntry | null> => {
  const { data, error } = await supabase
    .from('course_leaderboard')
    .select('*')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) return null;

  // Manually fetch student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('clerk_user_id', studentId)
    .single();

  return {
    ...data,
    student_name: profile?.full_name
  };
};

/**
 * Update weekly leaderboard (recalculate scores and ranks)
 */
export const updateWeeklyLeaderboard = async (
  courseId: string,
  weekId: string
): Promise<void> => {
  // Get all enrolled students
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active');

  if (enrollError) throw enrollError;

  for (const enrollment of enrollments || []) {
    const studentId = enrollment.student_id;
    
    // Calculate quiz score for the week
    const { data: quizData } = await supabase
      .from('quiz_attempts')
      .select('percentage, quizzes!inner(week_id)')
      .eq('quizzes.week_id', weekId)
      .eq('student_id', studentId);

    const quizScore = quizData && quizData.length > 0
      ? quizData.reduce((sum, q) => sum + (q.percentage || 0), 0) / quizData.length
      : 0;
    
    // Calculate assignment score for the week
    const { data: assignmentData } = await supabase
      .from('assignment_submissions')
      .select('score, assignments!inner(week_id, max_score)')
      .eq('assignments.week_id', weekId)
      .eq('student_id', studentId)
      .eq('status', 'graded');

    const assignmentScore = assignmentData && assignmentData.length > 0
      ? assignmentData.reduce((sum, a) => sum + ((a.score / (a.assignments as any).max_score) * 100 || 0), 0) / assignmentData.length
      : 0;
    
    // Calculate participation (live class attendance)
    const { data: scheduleData } = await supabase
      .from('live_class_schedules')
      .select('id')
      .eq('week_id', weekId);

    const scheduleIds = (scheduleData || []).map(s => s.id);
    
    let participationScore = 0;
    if (scheduleIds.length > 0) {
      const { count: attendedCount } = await supabase
        .from('live_class_attendance')
        .select('*', { count: 'exact', head: true })
        .in('schedule_id', scheduleIds)
        .eq('student_id', studentId)
        .eq('attended', true);

      participationScore = scheduleIds.length > 0
        ? ((attendedCount || 0) / scheduleIds.length) * 100
        : 0;
    }
    
    // Total: Quiz 50% + Assignment 30% + Participation 20%
    const totalScore = (quizScore * 0.5) + (assignmentScore * 0.3) + (participationScore * 0.2);
    
    // Upsert leaderboard entry
    const { error: upsertError } = await supabase
      .from('weekly_leaderboard')
      .upsert({
        course_id: courseId,
        week_id: weekId,
        student_id: studentId,
        quiz_score: quizScore,
        assignment_score: assignmentScore,
        participation_score: participationScore,
        total_score: totalScore,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'course_id,week_id,student_id'
      });

    if (upsertError) throw upsertError;
  }
  
  // Update ranks using RPC or raw query via Supabase
  // Get all entries for this course/week and update ranks
  const { data: leaderboardEntries } = await supabase
    .from('weekly_leaderboard')
    .select('id, total_score')
    .eq('course_id', courseId)
    .eq('week_id', weekId)
    .order('total_score', { ascending: false });

  if (leaderboardEntries) {
    for (let i = 0; i < leaderboardEntries.length; i++) {
      await supabase
        .from('weekly_leaderboard')
        .update({ rank: i + 1 })
        .eq('id', leaderboardEntries[i].id);
    }
  }
};

/**
 * Update course leaderboard (overall rankings)
 */
export const updateCourseLeaderboard = async (
  courseId: string
): Promise<void> => {
  // Get all enrolled students
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active');

  if (enrollError) throw enrollError;

  for (const enrollment of enrollments || []) {
    const studentId = enrollment.student_id;
    
    // Calculate internal average (all quizzes)
    const { data: quizData } = await supabase
      .from('quiz_attempts')
      .select('percentage, quizzes!inner(is_graded, course_weeks!inner(course_id))')
      .eq('quizzes.course_weeks.course_id', courseId)
      .eq('quizzes.is_graded', true)
      .eq('student_id', studentId);

    const internalAverage = quizData && quizData.length > 0
      ? quizData.reduce((sum, q) => sum + (q.percentage || 0), 0) / quizData.length
      : 0;
    
    // Get final exam score
    const { data: examData } = await supabase
      .from('final_exam_attempts')
      .select('percentage, final_exams!inner(course_id)')
      .eq('final_exams.course_id', courseId)
      .eq('student_id', studentId)
      .limit(1);

    const finalExamScore = examData && examData.length > 0 ? examData[0].percentage || 0 : 0;
    
    // Calculate completion percentage
    const { data: lessonsData } = await supabase
      .from('course_lessons')
      .select('id, course_weeks!inner(course_id)')
      .eq('course_weeks.course_id', courseId);

    const lessonIds = (lessonsData || []).map(l => l.id);
    
    let completionPercentage = 0;
    if (lessonIds.length > 0) {
      const { count: completedCount } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .in('lesson_id', lessonIds)
        .eq('student_id', studentId)
        .eq('completed', true);

      completionPercentage = ((completedCount || 0) / lessonIds.length) * 100;
    }
    
    // Total: Internal 40% + Final Exam 60%
    const totalScore = (internalAverage * 0.4) + (finalExamScore * 0.6);
    
    // Upsert leaderboard entry
    const { error: upsertError } = await supabase
      .from('course_leaderboard')
      .upsert({
        course_id: courseId,
        student_id: studentId,
        internal_average: internalAverage,
        final_exam_score: finalExamScore,
        total_score: totalScore,
        completion_percentage: completionPercentage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'course_id,student_id'
      });

    if (upsertError) throw upsertError;
  }
  
  // Update ranks (sort by total score, then by completion)
  const { data: leaderboardEntries } = await supabase
    .from('course_leaderboard')
    .select('id, total_score, completion_percentage')
    .eq('course_id', courseId)
    .order('total_score', { ascending: false })
    .order('completion_percentage', { ascending: false });

  if (leaderboardEntries) {
    for (let i = 0; i < leaderboardEntries.length; i++) {
      await supabase
        .from('course_leaderboard')
        .update({ rank: i + 1 })
        .eq('id', leaderboardEntries[i].id);
    }
  }
};

/**
 * Record live class attendance
 */
export const recordAttendance = async (
  scheduleId: string,
  studentId: string,
  attended: boolean = true
): Promise<void> => {
  const { error } = await supabase
    .from('live_class_attendance')
    .upsert({
      schedule_id: scheduleId,
      student_id: studentId,
      attended,
      joined_at: new Date().toISOString()
    }, {
      onConflict: 'schedule_id,student_id'
    });

  if (error) throw error;
};

/**
 * Record when student leaves live class
 */
export const recordLeaveTime = async (
  scheduleId: string,
  studentId: string
): Promise<void> => {
  // First get the join time to calculate duration
  const { data: attendance, error: fetchError } = await supabase
    .from('live_class_attendance')
    .select('joined_at')
    .eq('schedule_id', scheduleId)
    .eq('student_id', studentId)
    .single();

  if (fetchError) throw fetchError;

  const leftAt = new Date();
  const joinedAt = new Date(attendance.joined_at);
  const durationMinutes = (leftAt.getTime() - joinedAt.getTime()) / (1000 * 60);

  const { error } = await supabase
    .from('live_class_attendance')
    .update({
      left_at: leftAt.toISOString(),
      duration_minutes: durationMinutes
    })
    .eq('schedule_id', scheduleId)
    .eq('student_id', studentId);

  if (error) throw error;
};

/**
 * Get leaderboard summary for a course (for dashboard display)
 */
export const getLeaderboardSummary = async (courseId: string) => {
  // Get top 5 overall
  const top5 = await getCourseTop5(courseId);
  
  // Get total participants
  const { count: totalCount, error: countError } = await supabase
    .from('course_leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (countError) throw countError;
  
  // Get current week's top 5
  const { data: currentWeekData } = await supabase
    .from('course_weeks')
    .select('id, week_number')
    .eq('course_id', courseId)
    .order('week_number', { ascending: false })
    .limit(1);
  
  let weeklyTop5: WeeklyLeaderboardEntry[] = [];
  let currentWeek = null;
  
  if (currentWeekData && currentWeekData.length > 0) {
    currentWeek = currentWeekData[0];
    weeklyTop5 = await getWeeklyTop5(courseId, currentWeek.id);
  }
  
  return {
    top5_overall: top5,
    top5_weekly: weeklyTop5,
    total_participants: totalCount || 0,
    current_week: currentWeek?.week_number || null
  };
};
