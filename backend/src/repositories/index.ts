/**
 * Repository Index
 * 
 * Central barrel export for all repository instances.
 * Services should import from here:
 *
 *   import { courseRepository, enrollmentRepository } from '../repositories';
 */

export { BaseRepository } from './BaseRepository';
export type { QueryOptions, PaginatedResult } from './BaseRepository';

export { courseRepository, default as CourseRepository } from './CourseRepository';
export type { CourseRecord, CourseFilters } from './CourseRepository';

export { enrollmentRepository, default as EnrollmentRepository } from './EnrollmentRepository';
export type { EnrollmentRecord } from './EnrollmentRepository';

export { profileRepository, default as ProfileRepository } from './ProfileRepository';
export type { ProfileRecord } from './ProfileRepository';
