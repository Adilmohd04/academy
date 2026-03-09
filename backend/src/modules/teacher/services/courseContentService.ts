import { supabase } from '../../../config/database';

export interface CourseWeek {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  description?: string;
  unlock_date?: string;
  order_index: number;
  created_at: string;
}

export interface CreateWeekInput {
  course_id: string;
  week_number: number;
  title: string;
  description?: string;
  unlock_date?: string;
  order_index?: number;
}

export interface CourseContent {
  id: string;
  week_id: string;
  type: 'video' | 'live_session' | 'document' | 'link';
  title: string;
  content_url?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  meet_link?: string;
  google_event_id?: string;
  order_index: number;
  is_required: boolean;
  created_at: string;
}

export interface CreateContentInput {
  week_id: string;
  type: 'video' | 'live_session' | 'document' | 'link';
  title: string;
  content_url?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  meet_link?: string;
  order_index?: number;
  is_required?: boolean;
}

/**
 * Create a new week for a course
 */
export const createWeek = async (data: CreateWeekInput): Promise<CourseWeek> => {
  const { data: week, error } = await supabase
    .from('course_weeks')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create week: ${error.message}`);
  return week;
};

/**
 * Get all weeks for a course (ordered)
 */
export const getCourseWeeks = async (courseId: string): Promise<any[]> => {
  console.log('🔍 [courseContentService] getCourseWeeks called for courseId:', courseId);
  
  // Get weeks
  const { data: weeks, error: weeksError } = await supabase
    .from('course_weeks')
    .select('*')
    .eq('course_id', courseId)
    .order('week_number', { ascending: true });

  console.log('📊 [courseContentService] Weeks fetched:', weeks?.length, 'weeks');
  
  if (weeksError) {
    console.error('❌ [courseContentService] Weeks error:', weeksError);
    throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
  }
  
  if (!weeks || weeks.length === 0) {
    console.log('⚠️ [courseContentService] No weeks found');
    return [];
  }

  // Get all lessons for these weeks
  const weekIds = weeks.map(w => w.id);
  console.log('🔍 [courseContentService] Fetching lessons for week IDs:', weekIds);
  
  const { data: lessons, error: lessonsError } = await supabase
    .from('course_lessons')
    .select('*')
    .in('week_id', weekIds)
    .order('order_index', { ascending: true });

  console.log('📚 [courseContentService] Lessons fetched:', lessons?.length, 'lessons');
  
  if (lessonsError) {
    console.error('❌ [courseContentService] Lessons error:', lessonsError);
    throw new Error(`Failed to fetch lessons: ${lessonsError.message}`);
  }

  // Group lessons by week_id
  const lessonsByWeek = (lessons || []).reduce((acc: any, lesson: any) => {
    if (!acc[lesson.week_id]) {
      acc[lesson.week_id] = [];
    }
    acc[lesson.week_id].push(lesson);
    return acc;
  }, {});

  console.log('📦 [courseContentService] Lessons grouped:', Object.keys(lessonsByWeek).length, 'weeks have lessons');

  // Attach lessons to weeks
  const weeksWithLessons = weeks.map(week => ({
    ...week,
    lessons: lessonsByWeek[week.id] || []
  }));

  console.log('✅ [courseContentService] Returning weeks with lessons');
  console.log('✅ [courseContentService] Sample week:', JSON.stringify(weeksWithLessons[0], null, 2));

  return weeksWithLessons;
};

/**
 * Create content for a week
 */
export const createContent = async (data: CreateContentInput): Promise<CourseContent> => {
  const { data: content, error } = await supabase
    .from('course_content')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create content: ${error.message}`);
  return content;
};

/**
 * Get content for a week (ordered)
 */
export const getWeekContent = async (weekId: string): Promise<CourseContent[]> => {
  const { data, error } = await supabase
    .from('course_content')
    .select('*')
    .eq('week_id', weekId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(`Failed to fetch content: ${error.message}`);
  return data || [];
};
