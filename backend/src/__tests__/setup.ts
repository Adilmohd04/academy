/**
 * Jest Test Setup
 * 
 * Configures the test environment and provides utilities
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want to suppress logs during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Global setup
beforeAll(async () => {
  // Any global setup before all tests
});

// Global teardown
afterAll(async () => {
  // Any global cleanup after all tests
});

// Export test utilities
export const testUtils = {
  /**
   * Create a mock user for testing
   */
  mockUser: (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'test-user-id',
    clerk_user_id: 'user_test123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'student',
    ...overrides,
  }),

  /**
   * Create a mock course for testing
   */
  mockCourse: (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'test-course-id',
    title: 'Test Course',
    description: 'Test Description',
    teacher_id: 'test-teacher-id',
    price: 100,
    is_free: false,
    status: 'published',
    approval_status: 'approved',
    ...overrides,
  }),

  /**
   * Create mock auth headers
   */
  mockAuthHeaders: (userId: string = 'user_test123') => ({
    'x-clerk-user-id': userId,
    'Content-Type': 'application/json',
  }),

  /**
   * Create a mock enrollment for testing
   */
  mockEnrollment: (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'test-enrollment-id',
    course_id: 'test-course-id',
    user_id: 'test-user-id',
    status: 'active',
    enrolled_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Delay helper for async tests
   */
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

export default testUtils;
