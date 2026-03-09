/**
 * Request Validation Middleware using Zod
 * 
 * Provides type-safe request validation with clear error messages
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';

/**
 * Validation middleware factory
 * Creates a middleware that validates request body, query, or params
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = await schema.parseAsync(data);
      
      // Replace the original data with validated/transformed data
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        (req as any).validatedQuery = validated;
      } else {
        (req as any).validatedParams = validated;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        next(new ValidationError('Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
};

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Course creation schema
 */
export const createCourseSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative').default(0),
  is_free: z.boolean().default(false),
  duration_weeks: z.coerce.number().int().positive().default(1),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  enrollment_cap: z.coerce.number().int().positive().optional(),
  prerequisites: z.string().optional(),
  passing_threshold: z.coerce.number().min(0).max(100).default(60),
  course_type: z.enum(['pre-recorded', 'live', 'hybrid']).default('pre-recorded'),
  language: z.string().or(z.array(z.string())).default('English'),
});

/**
 * Course update schema (all fields optional)
 */
export const updateCourseSchema = createCourseSchema.partial();

/**
 * Meeting booking schema
 */
export const createMeetingSchema = z.object({
  teacher_slot_id: z.string().uuid('Invalid slot ID'),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time_slot_id: z.string().uuid('Invalid time slot ID'),
  notes: z.string().max(1000).optional(),
});

/**
 * User profile update schema
 */
export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  timezone: z.string().optional(),
});

/**
 * Login/Auth schema
 */
export const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Search query schema
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

/**
 * ID params schema
 */
export const idParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Course ID params schema
 */
export const courseIdParamsSchema = z.object({
  courseId: uuidSchema,
});

// Export validation helper for custom schemas
export { z };
