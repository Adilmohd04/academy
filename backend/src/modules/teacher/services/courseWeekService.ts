/**
 * Course Week Service
 * 
 * Database operations for course weeks
 */

import { supabase } from '../../../config/database';

export interface CourseWeek {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  description?: string;
  unlock_date?: string;
  order_index: number;
  status: 'draft' | 'published';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWeekInput {
  course_id: string;
  week_number: number;
  title: string;
  description?: string;
  unlock_date?: string;
  order_index?: number;
}

export interface UpdateWeekInput {
  title?: string;
  description?: string;
  unlock_date?: string;
  order_index?: number;
  status?: 'draft' | 'published';
}

/**
 * Get all weeks for a course
 */
export const getCourseWeeks = async (courseId: string): Promise<CourseWeek[]> => {
  console.log('🔍 getCourseWeeks called for courseId:', courseId);
  
  // Get weeks
  const { data: weeks, error: weeksError } = await supabase
    .from('course_weeks')
    .select('*')
    .eq('course_id', courseId)
    .order('week_number', { ascending: true });

  console.log('📊 Weeks fetched:', weeks?.length, 'weeks');
  
  if (weeksError) {
    console.error('❌ Weeks error:', weeksError);
    throw new Error(`Failed to fetch course weeks: ${weeksError.message}`);
  }

  if (!weeks || weeks.length === 0) {
    console.log('⚠️ No weeks found');
    return [];
  }

  // Get all lessons for these weeks
  const weekIds = weeks.map(w => w.id);
  console.log('🔍 Fetching lessons for week IDs:', weekIds);
  
  const { data: lessons, error: lessonsError } = await supabase
    .from('course_lessons')
    .select('*')
    .in('week_id', weekIds)
    .order('order_index', { ascending: true });

  console.log('📚 Lessons fetched:', lessons?.length, 'lessons');
  console.log('📚 Lessons data:', JSON.stringify(lessons, null, 2));
  
  if (lessonsError) {
    console.error('❌ Lessons error:', lessonsError);
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

  console.log('📦 Lessons grouped by week:', Object.keys(lessonsByWeek).length, 'weeks have lessons');
  console.log('📦 LessonsByWeek:', JSON.stringify(lessonsByWeek, null, 2));

  // Attach lessons to weeks
  const weeksWithLessons = weeks.map(week => ({
    ...week,
    lessons: lessonsByWeek[week.id] || []
  }));

  console.log('✅ Returning weeks with lessons attached');
  console.log('✅ Sample week:', JSON.stringify(weeksWithLessons[0], null, 2));

  return weeksWithLessons;
};

/**
 * Get single week by ID
 */
export const getWeekById = async (weekId: string): Promise<CourseWeek | null> => {
  const { data, error } = await supabase
    .from('course_weeks')
    .select('*')
    .eq('id', weekId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch week: ${error.message}`);
  }

  return data;
};

/**
 * Create a new week
 */
export const createWeek = async (input: CreateWeekInput): Promise<CourseWeek> => {
  const { data, error } = await supabase
    .from('course_weeks')
    .insert([
      {
        ...input,
        status: 'draft',
        order_index: input.order_index ?? input.week_number,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create week: ${error.message}`);
  }

  return data;
};

/**
 * Update a week
 */
export const updateWeek = async (
  weekId: string,
  input: UpdateWeekInput
): Promise<CourseWeek> => {
  const updateData: any = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // If publishing, set published_at
  if (input.status === 'published') {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('course_weeks')
    .update(updateData)
    .eq('id', weekId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update week: ${error.message}`);
  }

  return data;
};

/**
 * Delete a week
 */
export const deleteWeek = async (weekId: string): Promise<void> => {
  // First delete all content in this week
  const { error: contentError } = await supabase
    .from('course_content')
    .delete()
    .eq('week_id', weekId);

  if (contentError) {
    throw new Error(`Failed to delete week content: ${contentError.message}`);
  }

  // Then delete the week
  const { error } = await supabase
    .from('course_weeks')
    .delete()
    .eq('id', weekId);

  if (error) {
    throw new Error(`Failed to delete week: ${error.message}`);
  }
};

/**
 * Reorder weeks
 */
export const reorderWeeks = async (
  weekOrders: { id: string; order_index: number }[]
): Promise<void> => {
  const updates = weekOrders.map((item) =>
    supabase
      .from('course_weeks')
      .update({ order_index: item.order_index, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  );

  await Promise.all(updates);
};
