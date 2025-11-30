/**
 * Course Service
 * 
 * Database operations for courses
 */

import { supabase } from '../config/database';

export interface Course {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  teacher_name?: string;
  price: number;
  thumbnail_url?: string;
  duration_weeks: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  teacher_id: string;
  teacher_name?: string;
  price?: number;
  duration_weeks?: number;
  thumbnail_url?: string;
  status?: string;
}

export interface CourseFilters {
  status?: string;
  teacher_id?: string;
}

/**
 * Create a new course
 */
export const createCourse = async (data: CreateCourseInput): Promise<Course> => {
  const { data: course, error } = await supabase
    .from('courses')
    .insert([
      {
        ...data,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create course: ${error.message}`);
  }

  return course;
};

/**
 * Get all courses with optional filters
 */
export const getAllCourses = async (filters: CourseFilters = {}): Promise<Course[]> => {
  let query = supabase.from('courses').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  return data || [];
};

/**
 * Get a single course by ID
 */
export const getCourseById = async (id: string): Promise<Course | null> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch course: ${error.message}`);
  }

  return data;
};

/**
 * Update a course
 */
export const updateCourse = async (
  id: string,
  updates: Partial<CreateCourseInput>
): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`);
  }

  return data;
};

/**
 * Delete a course
 */
export const deleteCourse = async (id: string): Promise<void> => {
  const { error } = await supabase.from('courses').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }
};

/**
 * Get all courses by a specific teacher
 */
export const getCoursesByTeacher = async (teacherId: string): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch teacher courses: ${error.message}`);
  }

  return data || [];
};
