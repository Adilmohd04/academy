/**
 * Course Service Unit Tests
 * 
 * Tests for course CRUD operations and business logic
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Define a typed mock for Supabase responses
type MockResponse = { data: unknown; error: unknown };

// Mock Supabase before importing the service
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn<() => Promise<MockResponse>>(),
  single: jest.fn<() => Promise<MockResponse>>(),
  maybeSingle: jest.fn<() => Promise<MockResponse>>(),
};

jest.mock('../../config/database', () => ({
  supabase: mockSupabase,
}));

// Import after mocking
import * as courseService from '../../modules/teacher/services/courseService';

describe('Course Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.delete.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.or.mockReturnThis();
    mockSupabase.in.mockReturnThis();
  });

  describe('getAllCourses', () => {
    it('should return all courses with teacher and enrollment data', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Test Course 1',
          teacher_id: 'teacher-1',
          price: 100,
          profiles: { full_name: 'Teacher One' },
          course_teachers: [] as unknown[],
          enrollments: [{ id: '1' }, { id: '2' }],
        },
        {
          id: 'course-2',
          title: 'Test Course 2',
          teacher_id: 'teacher-2',
          price: 0,
          profiles: { full_name: 'Teacher Two' },
          course_teachers: [
            { role: 'co-teacher', profiles: { clerk_user_id: 'ct-1', full_name: 'Co Teacher' } }
          ],
          enrollments: [] as unknown[],
        },
      ];

      mockSupabase.order.mockResolvedValueOnce({ data: mockCourses, error: null });

      const result = await courseService.getAllCourses() as unknown[];

      expect(result).toHaveLength(2);
      expect((result[0] as Record<string, unknown>).title).toBe('Test Course 1');
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should apply filters correctly', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });

      await courseService.getAllCourses({ 
        status: 'published', 
        approval_status: 'approved' 
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'published');
      expect(mockSupabase.eq).toHaveBeenCalledWith('approval_status', 'approved');
    });

    it('should throw error when database fails', async () => {
      mockSupabase.order.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(courseService.getAllCourses()).rejects.toThrow('Failed to fetch courses');
    });
  });

  describe('createCourse', () => {
    it('should create a new course successfully', async () => {
      const newCourse = {
        title: 'New Course',
        description: 'Course description',
        teacher_id: 'teacher-123',
        price: 50,
      };

      const createdCourse = {
        id: 'new-course-id',
        ...newCourse,
        created_at: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValueOnce({ data: createdCourse, error: null });

      const result = await courseService.createCourse(newCourse) as unknown as Record<string, unknown>;

      expect(result.id).toBe('new-course-id');
      expect(result.title).toBe('New Course');
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should throw error when creation fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Insert failed' } 
      });

      await expect(courseService.createCourse({
        title: 'Test',
        teacher_id: 'teacher-1',
      })).rejects.toThrow('Failed to create course');
    });
  });
});
