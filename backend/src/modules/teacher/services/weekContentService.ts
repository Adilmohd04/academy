/**
 * Week Content Service
 * 
 * Database operations for course content within weeks
 */

import { supabase } from '../../../config/database';

export interface WeekContent {
  id: string;
  week_id: string;
  type: 'video' | 'article' | 'quiz' | 'resource' | 'assignment' | 'live_session';
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
  type: 'video' | 'article' | 'quiz' | 'resource' | 'assignment' | 'live_session';
  title: string;
  content_url?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  meet_link?: string;
  order_index?: number;
  is_required?: boolean;
}

export interface UpdateContentInput {
  title?: string;
  content_url?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  meet_link?: string;
  order_index?: number;
  is_required?: boolean;
}

/**
 * Get all content for a week
 */
export const getWeekContent = async (weekId: string): Promise<WeekContent[]> => {
  const { data, error } = await supabase
    .from('course_content')
    .select('*')
    .eq('week_id', weekId)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch week content: ${error.message}`);
  }

  return data || [];
};

/**
 * Get single content item by ID
 */
export const getContentById = async (contentId: string): Promise<WeekContent | null> => {
  const { data, error } = await supabase
    .from('course_content')
    .select('*')
    .eq('id', contentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch content: ${error.message}`);
  }

  return data;
};

/**
 * Create new content
 */
export const createContent = async (input: CreateContentInput): Promise<WeekContent> => {
  // Get the max order_index for this week
  const { data: existingContent } = await supabase
    .from('course_content')
    .select('order_index')
    .eq('week_id', input.week_id)
    .order('order_index', { ascending: false })
    .limit(1);

  const maxOrder = existingContent && existingContent.length > 0 
    ? existingContent[0].order_index 
    : 0;

  const { data, error } = await supabase
    .from('course_content')
    .insert([
      {
        ...input,
        order_index: input.order_index ?? maxOrder + 1,
        is_required: input.is_required ?? true,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create content: ${error.message}`);
  }

  return data;
};

/**
 * Update content
 */
export const updateContent = async (
  contentId: string,
  input: UpdateContentInput
): Promise<WeekContent> => {
  const { data, error } = await supabase
    .from('course_content')
    .update(input)
    .eq('id', contentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update content: ${error.message}`);
  }

  return data;
};

/**
 * Delete content
 */
export const deleteContent = async (contentId: string): Promise<void> => {
  const { error } = await supabase
    .from('course_content')
    .delete()
    .eq('id', contentId);

  if (error) {
    throw new Error(`Failed to delete content: ${error.message}`);
  }
};

/**
 * Reorder content items
 */
export const reorderContent = async (
  contentOrders: { id: string; order_index: number }[]
): Promise<void> => {
  const updates = contentOrders.map((item) =>
    supabase
      .from('course_content')
      .update({ order_index: item.order_index })
      .eq('id', item.id)
  );

  await Promise.all(updates);
};
