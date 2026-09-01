/**
 * Course Module
 * 
 * Encapsulates all course-related functionality:
 * - Repository: database access for courses
 * - Types: course data structures
 * - Routes: course API endpoints (in routes/courses.ts)
 * - Services: course business logic
 */

export { courseRepository } from './repository/CourseRepository';
export type { CourseRecord, CourseFilters } from './repository/CourseRepository';
