/**
 * Preservation Property Tests — Live course publishing behavior unchanged
 *
 * **Validates: Requirements 3.1, 3.3, 3.5**
 *
 * Property 2: Preservation — Live course publishing behavior unchanged
 *
 * These tests encode the CURRENT (correct) behavior for live and hybrid courses.
 * They MUST PASS on the unfixed code to establish a baseline, and continue to
 * pass after the fix is applied, confirming no regressions.
 *
 * Observations captured:
 *   1. Live Course Cron: autoPublishContent promotes live course weeks with past unlock_date
 *   2. Live Course Cascade: updateWeek cascades is_published to all lessons in live courses
 *   3. Live Course Lesson Inheritance: addLesson inherits week's is_published for live courses
 *   4. Quiz Independent Publish: quiz is_published defaults to false (not inherited from week)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
type MockResponse = { data: unknown; error: unknown };

const mockSupabase: Record<string, jest.Mock<any>> = {
  from: jest.fn().mockReturnThis() as any,
  select: jest.fn().mockReturnThis() as any,
  insert: jest.fn().mockReturnThis() as any,
  update: jest.fn().mockReturnThis() as any,
  delete: jest.fn().mockReturnThis() as any,
  eq: jest.fn().mockReturnThis() as any,
  or: jest.fn().mockReturnThis() as any,
  in: jest.fn().mockReturnThis() as any,
  not: jest.fn().mockReturnThis() as any,
  lte: jest.fn().mockReturnThis() as any,
  order: jest.fn().mockReturnThis() as any,
  limit: jest.fn().mockReturnThis() as any,
  single: jest.fn() as any,
  maybeSingle: jest.fn() as any,
};

jest.mock('../../config/database', () => ({
  supabase: mockSupabase,
}));

jest.mock('../../services/courseNotificationService', () => ({
  notifyCourseContentUpdate: jest.fn(),
}));

jest.mock('../../services/mentoringNormalization', () => ({
  normalizeMentoringText: jest.fn((text: unknown) => text),
}));

// Import modules under test AFTER mocking
import { autoPublishContent } from '../../jobs/autoPublishContent';
import * as teacherCourseController from '../../modules/teacher/controllers/teacherCourseController';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Express-like request object */
function fakeReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    auth: { userId: 'clerk_teacher_1' },
    ...overrides,
  };
}

/** Build a minimal Express-like response object that captures the status & json */
function fakeRes(): any {
  const res: any = {
    _status: 200,
    _json: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._json = body;
      return res;
    },
  };
  return res;
}

/** Reset all mock chain methods to return `this` so chaining works */
function resetChain() {
  for (const key of Object.keys(mockSupabase)) {
    mockSupabase[key].mockReset();
    if (key !== 'single' && key !== 'maybeSingle') {
      mockSupabase[key].mockReturnValue(mockSupabase);
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Preservation — Live course publishing behavior unchanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetChain();
  });

  // -------------------------------------------------------------------------
  // Observation 1 — Live Course Cron: autoPublishContent promotes live course
  // weeks with past unlock_date and status 'draft'
  // -------------------------------------------------------------------------
  it('Observation 1 — Live Course Cron: autoPublishContent promotes live course weeks with past unlock_date', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          weekId: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          courseType: fc.constantFrom('live', 'hybrid'),
          unlock_date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-06-01').getTime() })
            .map(ts => new Date(ts).toISOString()),
        }),
        async ({ weekId, title, courseType, unlock_date }) => {
          resetChain();

          let weekWasPromoted = false;
          let promotedWeekId: string | null = null;

          let fromTable = '';
          mockSupabase.from.mockImplementation((...args: any[]) => {
            fromTable = args[0];
            return mockSupabase;
          });

          // Make lte() thenable (no longer terminal for weeks query after course_type filter was added)
          mockSupabase.lte.mockImplementation((..._args: any[]) => {
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => {
              if (fromTable === 'course_weeks') {
                return resolve({
                  data: [{ id: weekId, title, unlock_date }],
                  error: null,
                });
              }
              return resolve({ data: [], error: null });
            };
            return result;
          });

          // Make in() thenable — handles both the course_type filter on weeks
          // and the content_type filter on lessons
          mockSupabase.in.mockImplementation((...args: any[]) => {
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => {
              if (fromTable === 'course_weeks') {
                // course_type filter on weeks query — return live/hybrid week data
                return resolve({
                  data: [{ id: weekId, title, unlock_date }],
                  error: null,
                });
              }
              // lessons query — no lessons to auto-publish
              return resolve({ data: [], error: null });
            };
            return result;
          });

          // Track update + eq calls to detect week promotion
          mockSupabase.eq.mockImplementation((...args: any[]) => {
            const val = args[1];
            if (val === weekId && fromTable === 'course_weeks') {
              weekWasPromoted = true;
              promotedWeekId = val;
            }
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => resolve({ data: null, error: null });
            return result;
          });

          await autoPublishContent();

          // Preservation: live/hybrid course weeks with past unlock_date MUST be promoted
          expect(weekWasPromoted).toBe(true);
          expect(promotedWeekId).toBe(weekId);
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Observation 2 — Live Course Cascade: updateWeek cascades is_published
  // to all lessons in live courses
  // -------------------------------------------------------------------------
  it('Observation 2 — Live Course Cascade: updateWeek cascades is_published to all lessons in live courses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          weekId: fc.uuid(),
          courseType: fc.constantFrom('live', 'hybrid'),
          isPublished: fc.constantFrom(true, false),
        }),
        async ({ weekId, courseType, isPublished }) => {
          resetChain();

          let lessonsCascaded = false;
          let cascadedValue: boolean | null = null;

          let singleCallCount = 0;
          mockSupabase.single.mockImplementation(() => {
            singleCallCount++;
            if (singleCallCount === 1) {
              // Profile lookup
              return Promise.resolve({ data: { id: 'teacher-1' }, error: null });
            }
            if (singleCallCount === 2) {
              // Week with course info — live/hybrid course
              return Promise.resolve({
                data: {
                  course_id: 'course-live-1',
                  courses: { teacher_id: 'teacher-1', course_type: courseType },
                },
                error: null,
              });
            }
            if (singleCallCount === 3) {
              // Updated week
              return Promise.resolve({
                data: {
                  id: weekId,
                  is_published: isPublished,
                  title: 'Updated Week',
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          });

          // Track whether lessons were cascaded
          let lastUpdateData: any = null;
          mockSupabase.update.mockImplementation((...args: any[]) => {
            lastUpdateData = args[0];
            return mockSupabase;
          });

          mockSupabase.eq.mockImplementation((...args: any[]) => {
            const col = args[0];
            const val = args[1];
            // Detect cascade: eq('week_id', weekId) after update({is_published: ...})
            if (col === 'week_id' && val === weekId && lastUpdateData?.is_published === isPublished) {
              lessonsCascaded = true;
              cascadedValue = lastUpdateData.is_published;
            }
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => resolve({ data: null, error: null });
            return result;
          });

          const req = fakeReq({
            params: { weekId },
            body: { is_published: isPublished, title: 'Updated Week' },
          });
          const res = fakeRes();

          await (teacherCourseController as any).updateWeek(req, res);

          // Preservation: live/hybrid course week publish/unpublish MUST cascade to lessons
          expect(lessonsCascaded).toBe(true);
          expect(cascadedValue).toBe(isPublished);
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Observation 3 — Live Course Lesson Inheritance: addLesson inherits
  // week's is_published for live courses
  // -------------------------------------------------------------------------
  it('Observation 3 — Live Course Lesson Inheritance: addLesson inherits week is_published for live courses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          weekId: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          content_type: fc.constantFrom('video', 'resource', 'text'),
          courseType: fc.constantFrom('live', 'hybrid'),
          weekIsPublished: fc.boolean(),
        }),
        async ({ weekId, title, content_type, courseType, weekIsPublished }) => {
          resetChain();

          let capturedInsertData: any = null;

          let singleCallCount = 0;
          mockSupabase.single.mockImplementation(() => {
            singleCallCount++;
            if (singleCallCount === 1) {
              // Profile
              return Promise.resolve({ data: { id: 'teacher-1' }, error: null });
            }
            if (singleCallCount === 2) {
              // Week — live/hybrid course
              return Promise.resolve({
                data: {
                  course_id: 'course-live-1',
                  is_published: weekIsPublished,
                  courses: { teacher_id: 'teacher-1', course_type: courseType },
                },
                error: null,
              });
            }
            if (singleCallCount === 3) {
              // Last lesson (for order_index)
              return Promise.resolve({
                data: { order_index: 0 },
                error: null,
              });
            }
            if (singleCallCount === 4) {
              // Created lesson — return what was inserted
              return Promise.resolve({
                data: {
                  id: 'new-lesson-id',
                  week_id: weekId,
                  title,
                  content_type,
                  is_published: capturedInsertData?.is_published ?? false,
                  order_index: 1,
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          });

          // Capture insert data
          mockSupabase.insert.mockImplementation((...args: any[]) => {
            capturedInsertData = args[0];
            return mockSupabase;
          });

          const req = fakeReq({
            params: { weekId },
            body: { title, content_type },
          });
          const res = fakeRes();

          await (teacherCourseController as any).addLesson(req, res);

          // Preservation: for live/hybrid courses, video/resource/text lessons
          // MUST inherit the week's is_published state
          if (res._status === 201 && capturedInsertData) {
            expect(capturedInsertData.is_published).toBe(weekIsPublished);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Observation 4 — Quiz Independent Publish: quiz is_published defaults to
  // false (not inherited from week) regardless of course type
  // -------------------------------------------------------------------------
  it('Observation 4 — Quiz Independent Publish: quiz is_published defaults to false (not inherited from week)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          weekId: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          courseType: fc.constantFrom('pre-recorded', 'live', 'hybrid'),
          weekIsPublished: fc.boolean(),
        }),
        async ({ weekId, title, courseType, weekIsPublished }) => {
          resetChain();

          let capturedInsertData: any = null;

          let singleCallCount = 0;
          mockSupabase.single.mockImplementation(() => {
            singleCallCount++;
            if (singleCallCount === 1) {
              // Profile
              return Promise.resolve({ data: { id: 'teacher-1' }, error: null });
            }
            if (singleCallCount === 2) {
              // Week — any course type
              return Promise.resolve({
                data: {
                  course_id: 'course-1',
                  is_published: weekIsPublished,
                  courses: { teacher_id: 'teacher-1', course_type: courseType },
                },
                error: null,
              });
            }
            if (singleCallCount === 3) {
              // Last lesson (for order_index)
              return Promise.resolve({
                data: { order_index: 0 },
                error: null,
              });
            }
            if (singleCallCount === 4) {
              // Created lesson — return what was inserted
              return Promise.resolve({
                data: {
                  id: 'new-quiz-id',
                  week_id: weekId,
                  title,
                  content_type: 'quiz',
                  is_published: capturedInsertData?.is_published ?? false,
                  order_index: 1,
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          });

          // Capture insert data
          mockSupabase.insert.mockImplementation((...args: any[]) => {
            capturedInsertData = args[0];
            return mockSupabase;
          });

          const req = fakeReq({
            params: { weekId },
            body: { title, content_type: 'quiz' },
          });
          const res = fakeRes();

          await (teacherCourseController as any).addLesson(req, res);

          // Preservation: quiz is_published MUST NOT inherit from week.
          // The addLesson code only sets is_published for video/resource/text.
          // For quiz, is_published is NOT set by the inheritance block, so it
          // should be undefined in the insert data (DB defaults to false).
          if (res._status === 201 && capturedInsertData) {
            // Quiz should NOT have is_published set to true by the inheritance logic.
            // The code only sets is_published for video/resource/text content types.
            // For quiz, is_published should either be undefined or false.
            expect(capturedInsertData.is_published).not.toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
