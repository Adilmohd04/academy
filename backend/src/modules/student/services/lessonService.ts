import { supabase } from '../../../config/database';

export interface SectionLesson {
  id: string;
  section_id: string;
  title: string;
  type: 'video' | 'document' | 'live_session';
  video_url?: string;
  duration_minutes?: number;
  order_index: number;
  created_at: string;
}

export interface CreateLessonInput {
  section_id: string;
  title: string;
  type: 'video' | 'document' | 'live_session';
  video_url?: string;
  duration_minutes?: number;
  order_index: number;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface CreateResourceInput {
  lesson_id: string;
  title: string;
  file_url: string;
  file_type: string;
}

/**
 * Create a new lesson
 */
export const createLesson = async (data: CreateLessonInput): Promise<SectionLesson> => {
  const { data: lesson, error } = await supabase
    .from('section_lessons')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create lesson: ${error.message}`);
  return lesson;
};

/**
 * Get all lessons for a section (ordered)
 */
export const getSectionLessons = async (sectionId: string): Promise<SectionLesson[]> => {
  const { data, error } = await supabase
    .from('section_lessons')
    .select('*')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(`Failed to fetch lessons: ${error.message}`);
  return data || [];
};

/**
 * Update lesson
 */
export const updateLesson = async (id: string, updates: Partial<CreateLessonInput>): Promise<SectionLesson> => {
  const { data, error } = await supabase
    .from('section_lessons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update lesson: ${error.message}`);
  return data;
};

/**
 * Delete lesson
 */
export const deleteLesson = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('section_lessons')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete lesson: ${error.message}`);
};

/**
 * Add resource to lesson
 */
export const createResource = async (data: CreateResourceInput): Promise<LessonResource> => {
  const { data: resource, error } = await supabase
    .from('lesson_resources')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create resource: ${error.message}`);
  return resource;
};

/**
 * Get resources for a lesson
 */
export const getLessonResources = async (lessonId: string): Promise<LessonResource[]> => {
  const { data, error } = await supabase
    .from('lesson_resources')
    .select('*')
    .eq('lesson_id', lessonId);

  if (error) throw new Error(`Failed to fetch resources: ${error.message}`);
  return data || [];
};

/**
 * Delete resource
 */
export const deleteResource = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('lesson_resources')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete resource: ${error.message}`);
};
