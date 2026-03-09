/**
 * Discussion @Mention Controller
 * Provides API for @mention autocomplete in discussions
 */

import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

/**
 * Get enrolled students for a course (for @mention autocomplete)
 */
export const getEnrolledStudentsForMention = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { search } = req.query;
    
    // Get enrolled students using profiles table (not users)
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId);
    
    if (enrollError) throw enrollError;
    
    // student_id in enrollments is clerk_user_id (text), NOT profiles.id (UUID)
    const clerkUserIds = (enrollments || []).map((e: any) => e.student_id);
    
    if (clerkUserIds.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Fetch profiles for enrolled students
    let queryBuilder = supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', clerkUserIds);
    
    // Add search filter if provided
    if (search && typeof search === 'string') {
      const searchTerm = `%${search}%`;
      queryBuilder = queryBuilder.ilike('full_name', searchTerm);
    }
    
    const { data, error } = await queryBuilder
      .order('full_name')
      .limit(10);
    
    if (error) throw error;
    
    const result = (data || []).map((u: any) => {
      const nameParts = (u.full_name || '').split(' ');
      return {
        id: u.clerk_user_id,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        full_name: u.full_name || '',
        avatar: null
      };
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching students for mention:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch students'
    });
  }
};

/**
 * Get all course teachers (for @mention autocomplete)
 */
export const getCourseTeachersForMention = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email, role')
      .in('role', ['teacher', 'admin'])
      .order('full_name')
      .limit(20);
    
    if (error) throw error;
    
    const result = (data || []).map((u: any) => {
      const nameParts = (u.full_name || '').split(' ');
      return {
        id: u.clerk_user_id,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        full_name: u.full_name || '',
        avatar: null,
        role: u.role
      };
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching teachers for mention:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch teachers'
    });
  }
};
