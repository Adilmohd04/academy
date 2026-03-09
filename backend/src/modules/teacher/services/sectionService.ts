import { supabase } from '../../../config/database';

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  unlock_date?: string;
  created_at: string;
}

export interface CreateSectionInput {
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  unlock_date?: string;
}

/**
 * Create a new section (Week/Chapter/Module)
 */
export const createSection = async (data: CreateSectionInput): Promise<CourseSection> => {
  const { data: section, error } = await supabase
    .from('course_sections')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create section: ${error.message}`);
  return section;
};

/**
 * Get all sections for a course (ordered)
 */
export const getCourseSections = async (courseId: string): Promise<CourseSection[]> => {
  const { data, error } = await supabase
    .from('course_sections')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(`Failed to fetch sections: ${error.message}`);
  return data || [];
};

/**
 * Update section
 */
export const updateSection = async (id: string, updates: Partial<CreateSectionInput>): Promise<CourseSection> => {
  const { data, error } = await supabase
    .from('course_sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update section: ${error.message}`);
  return data;
};

/**
 * Delete section
 */
export const deleteSection = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('course_sections')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete section: ${error.message}`);
};
