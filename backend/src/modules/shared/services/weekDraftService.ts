/**
 * Week Draft Mode Service
 * 
 * Allows teachers to save progress, continue later, and publish
 * when ready. Supports Week 0 (preparation) concept.
 */

import { supabase } from '../../../config/database';

// Types
interface WeekDraft {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  last_saved_at: string;
  published_at?: string;
}

interface AutosaveDraft {
  id: string;
  entity_type: string;
  entity_id: string;
  teacher_id: string;
  draft_content: any;
  last_autosaved_at: string;
}

interface ContentSummary {
  week_id: string;
  week_number: number;
  week_title: string;
  status: string;
  lessons: { total: number; draft: number; published: number };
  quizzes: { total: number; draft: number; published: number };
  schedules: { total: number; draft: number; scheduled: number };
}

// ============================================
// WEEK MANAGEMENT
// ============================================

/**
 * Create a new week in draft mode (Week 0 concept)
 */
export const createWeekDraft = async (
  courseId: string,
  data: {
    week_number: number;
    title: string;
    description?: string;
  }
): Promise<WeekDraft> => {
  const { data: result, error } = await supabase
    .from('course_weeks')
    .insert({
      course_id: courseId,
      week_number: data.week_number,
      title: data.title,
      description: data.description,
      order_index: data.week_number,
      status: 'draft'
    })
    .select()
    .single();

  if (error) throw error;
  return result;
};

/**
 * Save week draft (auto-save or manual save)
 */
export const saveWeekDraft = async (
  weekId: string,
  data: {
    title?: string;
    description?: string;
  }
): Promise<WeekDraft> => {
  const updateData: any = {
    last_saved_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  const { data: result, error } = await supabase
    .from('course_weeks')
    .update(updateData)
    .eq('id', weekId)
    .select()
    .single();

  if (error) throw error;
  if (!result) throw new Error('Week not found');

  return result;
};

/**
 * Autosave draft content for any entity
 */
export const autosaveDraft = async (
  entityType: 'week' | 'lesson' | 'quiz' | 'live_class',
  entityId: string,
  teacherId: string,
  draftContent: any
): Promise<AutosaveDraft> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data: result, error } = await supabase
    .from('draft_autosaves')
    .upsert({
      entity_type: entityType,
      entity_id: entityId,
      teacher_id: teacherId,
      draft_content: JSON.stringify(draftContent),
      last_autosaved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }, {
      onConflict: 'entity_type,entity_id,teacher_id'
    })
    .select()
    .single();

  if (error) throw error;
  return result;
};

/**
 * Get autosaved draft
 */
export const getAutosavedDraft = async (
  entityType: string,
  entityId: string,
  teacherId: string
): Promise<AutosaveDraft | null> => {
  const { data, error } = await supabase
    .from('draft_autosaves')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('teacher_id', teacherId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Discard autosaved draft
 */
export const discardAutosave = async (
  entityType: string,
  entityId: string,
  teacherId: string
): Promise<void> => {
  const { error } = await supabase
    .from('draft_autosaves')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('teacher_id', teacherId);

  if (error) throw error;
};

// ============================================
// PUBLISHING
// ============================================

/**
 * Publish a week and all its content
 */
export const publishWeek = async (
  weekId: string,
  teacherId: string
): Promise<{
  success: boolean;
  week_id: string;
  lessons_published: number;
  quizzes_published: number;
  schedules_activated: number;
}> => {
  // Call RPC function if it exists, otherwise do manual publish
  const { data, error } = await supabase.rpc('publish_course_week', {
    p_week_id: weekId,
    p_teacher_id: teacherId
  });

  if (error) {
    // Fallback to manual publish if RPC doesn't exist
    console.log('RPC not found, doing manual publish');
    
    // Update week status
    await supabase
      .from('course_weeks')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', weekId);

    // Update lessons
    const { data: lessons } = await supabase
      .from('course_lessons')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('week_id', weekId)
      .select('id');

    // Update quizzes
    const { data: quizzes } = await supabase
      .from('quizzes')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('week_id', weekId)
      .select('id');

    // Update schedules
    const { data: schedules } = await supabase
      .from('live_class_schedules')
      .update({ status: 'scheduled' })
      .eq('week_id', weekId)
      .eq('status', 'draft')
      .select('id');

    return {
      success: true,
      week_id: weekId,
      lessons_published: (lessons || []).length,
      quizzes_published: (quizzes || []).length,
      schedules_activated: (schedules || []).length
    };
  }

  return data;
};

/**
 * Unpublish a week (return to draft)
 */
export const unpublishWeek = async (
  weekId: string,
  teacherId: string
): Promise<{ success: boolean; week_id: string }> => {
  const { data, error } = await supabase.rpc('unpublish_course_week', {
    p_week_id: weekId,
    p_teacher_id: teacherId
  });

  if (error) {
    // Fallback to manual unpublish
    await supabase
      .from('course_weeks')
      .update({ status: 'draft', published_at: null })
      .eq('id', weekId);

    return { success: true, week_id: weekId };
  }

  return data;
};

/**
 * Publish a single lesson
 */
export const publishLesson = async (
  lessonId: string,
  teacherId: string
): Promise<any> => {
  // Get lesson's current status
  const { data: lessonData, error: lessonError } = await supabase
    .from('course_lessons')
    .select('status')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lessonData) {
    throw new Error('Lesson not found');
  }

  const previousStatus = lessonData.status;

  // Update lesson
  const { data: result, error: updateError } = await supabase
    .from('course_lessons')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', lessonId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Log action
  await supabase
    .from('content_publish_history')
    .insert({
      entity_type: 'lesson',
      entity_id: lessonId,
      action: 'published',
      published_by: teacherId,
      previous_status: previousStatus,
      new_status: 'published'
    });

  return result;
};

// ============================================
// CONTENT STATUS
// ============================================

/**
 * Get teacher's draft weeks
 */
export const getTeacherDraftWeeks = async (
  teacherId: string,
  courseId?: string
): Promise<ContentSummary[]> => {
  // Get teacher's courses first
  let courseQuery = supabase
    .from('courses')
    .select('id, title')
    .eq('teacher_id', teacherId);

  if (courseId) {
    courseQuery = courseQuery.eq('id', courseId);
  }

  const { data: courses, error: coursesError } = await courseQuery;
  if (coursesError) throw coursesError;

  const courseIds = (courses || []).map(c => c.id);
  if (courseIds.length === 0) return [];

  // Get weeks with course info
  const { data: weeks, error: weeksError } = await supabase
    .from('course_weeks')
    .select(`
      id,
      week_number,
      title,
      status,
      last_saved_at,
      course_id,
      courses!inner (
        title
      )
    `)
    .in('course_id', courseIds)
    .order('status')
    .order('last_saved_at', { ascending: false });

  if (weeksError) throw weeksError;

  const results: ContentSummary[] = [];

  for (const week of weeks || []) {
    // Get lesson counts
    const { data: lessons } = await supabase
      .from('course_lessons')
      .select('status')
      .eq('week_id', week.id);

    const totalLessons = (lessons || []).length;
    const draftLessons = (lessons || []).filter(l => l.status === 'draft').length;
    const publishedLessons = (lessons || []).filter(l => l.status === 'published').length;

    // Get quiz counts
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('status')
      .eq('week_id', week.id);

    const totalQuizzes = (quizzes || []).length;
    const draftQuizzes = (quizzes || []).filter(q => q.status === 'draft').length;
    const publishedQuizzes = (quizzes || []).filter(q => q.status === 'published').length;

    // Get schedule counts
    const { data: schedules } = await supabase
      .from('live_class_schedules')
      .select('status')
      .eq('week_id', week.id);

    const totalSchedules = (schedules || []).length;
    const draftSchedules = (schedules || []).filter(s => s.status === 'draft').length;
    const scheduledSchedules = (schedules || []).filter(s => s.status === 'scheduled').length;

    results.push({
      week_id: week.id,
      week_number: week.week_number,
      week_title: week.title,
      status: week.status,
      course_id: week.course_id,
      course_title: (week.courses as any)?.title,
      last_saved_at: week.last_saved_at,
      lessons: {
        total: totalLessons,
        draft: draftLessons,
        published: publishedLessons
      },
      quizzes: {
        total: totalQuizzes,
        draft: draftQuizzes,
        published: publishedQuizzes
      },
      schedules: {
        total: totalSchedules,
        draft: draftSchedules,
        scheduled: scheduledSchedules
      }
    } as any);
  }

  return results;
};

/**
 * Get week with all content (for editing)
 */
export const getWeekWithContent = async (
  weekId: string
): Promise<{
  week: any;
  lessons: any[];
  quizzes: any[];
  schedules: any[];
  hasUnsavedChanges: boolean;
}> => {
  // Get week
  const { data: weekData, error: weekError } = await supabase
    .from('course_weeks')
    .select(`
      *,
      courses!inner (
        title
      )
    `)
    .eq('id', weekId)
    .single();

  if (weekError || !weekData) {
    throw new Error('Week not found');
  }

  // Get lessons
  const { data: lessonsData, error: lessonsError } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('week_id', weekId)
    .order('order_index');

  if (lessonsError) throw lessonsError;

  // Get quizzes with question count
  const { data: quizzesData, error: quizzesError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('week_id', weekId)
    .order('order_index');

  if (quizzesError) throw quizzesError;

  // Get question counts for each quiz
  const quizzesWithCounts = await Promise.all((quizzesData || []).map(async quiz => {
    const { count } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quiz.id);

    return {
      ...quiz,
      question_count: count || 0
    };
  }));

  // Get schedules
  const { data: schedulesData, error: schedulesError } = await supabase
    .from('live_class_schedules')
    .select('*')
    .eq('week_id', weekId)
    .order('scheduled_at');

  if (schedulesError) throw schedulesError;

  // Check for autosaved drafts
  const { count: autosaveCount } = await supabase
    .from('draft_autosaves')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', weekId)
    .gt('expires_at', new Date().toISOString());

  return {
    week: {
      ...weekData,
      course_title: (weekData.courses as any)?.title
    },
    lessons: lessonsData || [],
    quizzes: quizzesWithCounts,
    schedules: schedulesData || [],
    hasUnsavedChanges: (autosaveCount || 0) > 0
  };
};

/**
 * Get publishing history for an entity
 */
export const getPublishHistory = async (
  entityType: string,
  entityId: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('content_publish_history')
    .select(`
      *,
      profiles:published_by (
        full_name
      )
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data || []).map(item => ({
    ...item,
    published_by_name: item.profiles?.full_name
  }));
};

/**
 * Get all autosaved drafts for a teacher
 */
export const getTeacherAutosaves = async (
  teacherId: string
): Promise<AutosaveDraft[]> => {
  const { data, error } = await supabase
    .from('draft_autosaves')
    .select('*')
    .eq('teacher_id', teacherId)
    .gt('expires_at', new Date().toISOString())
    .order('last_autosaved_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Check if week is ready to publish (has minimum required content)
 */
export const checkWeekReadyToPublish = async (
  weekId: string
): Promise<{
  ready: boolean;
  issues: string[];
  summary: {
    lessons: number;
    quizzes: number;
    schedules: number;
  };
}> => {
  const issues: string[] = [];

  // Get week
  const { data: weekData, error: weekError } = await supabase
    .from('course_weeks')
    .select('*')
    .eq('id', weekId)
    .single();

  if (weekError || !weekData) {
    throw new Error('Week not found');
  }

  if (!weekData.title || weekData.title.trim() === '') {
    issues.push('Week must have a title');
  }

  // Count content
  const { count: lessonsCount } = await supabase
    .from('course_lessons')
    .select('*', { count: 'exact', head: true })
    .eq('week_id', weekId);

  const { count: quizzesCount } = await supabase
    .from('quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('week_id', weekId);

  const { count: schedulesCount } = await supabase
    .from('live_class_schedules')
    .select('*', { count: 'exact', head: true })
    .eq('week_id', weekId);

  // Check for minimum content (at least one lesson)
  if ((lessonsCount || 0) === 0) {
    issues.push('Week must have at least one lesson');
  }

  // Check lessons have content
  const { count: emptyLessonsCount } = await supabase
    .from('course_lessons')
    .select('*', { count: 'exact', head: true })
    .eq('week_id', weekId)
    .or('title.is.null,title.eq.');

  if ((emptyLessonsCount || 0) > 0) {
    issues.push('Some lessons have no title');
  }

  return {
    ready: issues.length === 0,
    issues,
    summary: {
      lessons: lessonsCount || 0,
      quizzes: quizzesCount || 0,
      schedules: schedulesCount || 0
    }
  };
};
