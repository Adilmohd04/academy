/**
 * Bug Condition Exploration Test — Pre-recorded course publishing state auto-promotion
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 *
 * These property-based tests encode the EXPECTED (correct) behavior for pre-recorded
 * courses. They are designed to FAIL on the current unfixed code, confirming the bug
 * exists. Each bug path is tested independently.
 *
 * Property 1: Bug Condition — Pre-recorded course publishing state auto-promotion
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

describe('Bug Condition Exploration — Pre-recorded course publishing state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetChain();
  });

  // -------------------------------------------------------------------------
  // Bug Path 1 — DB Default: week creation returns is_published: true
  // -------------------------------------------------------------------------
  it('Bug Path 1 — DB Default: weeks in pre-recorded courses MUST have is_published = false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }),
          week_number: fc.integer({ min: 1, max: 100 }),
          unlock_date: fc.option(
            fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
            { nil: undefined }
          ),
        }),
        async ({ title, week_number, unlock_date }) => {
          resetChain();

          const courseId = 'course-prerecorded-1';

          // Track what gets passed to insert
          let capturedInsertData: any = null;

          // Simpler approach: override single() to return different values on each call
          let singleCallCount = 0;
          mockSupabase.single.mockImplementation(() => {
            singleCallCount++;
            if (singleCallCount === 1) {
              // Profile lookup
              return Promise.resolve({ data: { id: 'teacher-profile-1' }, error: null });
            }
            if (singleCallCount === 2) {
              // Course lookup
              return Promise.resolve({ data: { teacher_id: 'teacher-profile-1' }, error: null });
            }
            if (singleCallCount === 3) {
              // Created week — after DB fix (DEFAULT FALSE), the DB returns
              // whatever the app inserted. Verify the app inserts is_published: false.
              return Promise.resolve({
                data: {
                  id: 'new-week-id',
                  course_id: courseId,
                  week_number,
                  title,
                  unlock_date,
                  is_published: capturedInsertData?.is_published ?? false,
                  order_index: 0,
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          });

          // Make eq() thenable for the existing weeks query (call 3 — no .single())
          mockSupabase.eq.mockImplementation((..._args: any[]) => {
            const self: any = { ...mockSupabase };
            self.then = (resolve: any) => resolve({ data: [], error: null });
            return self;
          });

          // Capture insert data
          mockSupabase.insert.mockImplementation((data: any) => {
            capturedInsertData = data;
            return mockSupabase;
          });

          const req = fakeReq({
            params: { courseId },
            body: { title, week_number, description: 'Test', unlock_date },
          });
          const res = fakeRes();

          await (teacherCourseController as any).addWeek(req, res);

          // The property: for pre-recorded courses, the RETURNED week must have
          // is_published = false. The bug is that the DB default overrides the
          // app-level insert, so the returned data has is_published: true.
          if (res._status === 201 && res._json?.week) {
            expect(res._json.week.is_published).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Bug Path 2 — Cron Auto-Publish: cron must NOT promote pre-recorded weeks
  // -------------------------------------------------------------------------
  it('Bug Path 2 — Cron Auto-Publish: cron MUST NOT promote pre-recorded course weeks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          weekId: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          unlock_date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-06-01').getTime() })
            .map(ts => new Date(ts).toISOString()),
        }),
        async ({ weekId, title, unlock_date }) => {
          resetChain();

          // Track whether update was called for our pre-recorded week
          let weekWasPromoted = false;

          let fromTable = '';
          mockSupabase.from.mockImplementation((...args: any[]) => {
            fromTable = args[0];
            return mockSupabase;
          });

          // Make lte() thenable to resolve the weeks query
          mockSupabase.lte.mockImplementation((..._args: any[]) => {
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => {
              if (fromTable === 'course_weeks') {
                // Return a pre-recorded course week (BUG: cron doesn't filter by course_type)
                return resolve({
                  data: [{ id: weekId, title, unlock_date }],
                  error: null,
                });
              }
              return resolve({ data: [], error: null });
            };
            return result;
          });

          // Make in() thenable for the lessons query
          mockSupabase.in.mockImplementation((..._args: any[]) => {
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => resolve({ data: [], error: null });
            return result;
          });

          // Track eq calls to detect lesson cascade
          mockSupabase.eq.mockImplementation((...args: any[]) => {
            const val = args[1];
            if (val === weekId) {
              weekWasPromoted = true;
            }
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => resolve({ data: null, error: null });
            return result;
          });

          await autoPublishContent();

          // Property: the cron MUST NOT promote pre-recorded course weeks.
          // On unfixed code, the cron promotes ALL weeks with past unlock_date,
          // regardless of course_type. So weekWasPromoted will be true → test fails.
          expect(weekWasPromoted).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Bug Path 3 — Week-to-Lesson Cascade: lessons MUST NOT be cascaded
  // -------------------------------------------------------------------------
  it('Bug Path 3 — Week-to-Lesson Cascade: lessons MUST NOT be cascaded for pre-recorded courses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          weekId: fc.uuid(),
          lessonCount: fc.integer({ min: 1, max: 5 }),
        }),
        async ({ weekId, lessonCount }) => {
          resetChain();

          let lessonsCascaded = false;

          let singleCallCount = 0;
          mockSupabase.single.mockImplementation(() => {
            singleCallCount++;
            if (singleCallCount === 1) {
              // Profile
              return Promise.resolve({ data: { id: 'teacher-1' }, error: null });
            }
            if (singleCallCount === 2) {
              // Week with course info — pre-recorded course
              return Promise.resolve({
                data: {
                  course_id: 'course-prerecorded-1',
                  courses: { teacher_id: 'teacher-1', course_type: 'pre-recorded' },
                },
                error: null,
              });
            }
            if (singleCallCount === 3) {
              // Updated week
              return Promise.resolve({
                data: {
                  id: weekId,
                  is_published: true,
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
            // If we see eq('week_id', weekId) after an update({is_published: true}),
            // that's the cascade
            if (col === 'week_id' && val === weekId && lastUpdateData?.is_published === true) {
              lessonsCascaded = true;
            }
            const result: any = { ...mockSupabase };
            result.then = (resolve: any) => resolve({ data: null, error: null });
            return result;
          });

          const req = fakeReq({
            params: { weekId },
            body: { is_published: true, title: 'Updated Week' },
          });
          const res = fakeRes();

          await (teacherCourseController as any).updateWeek(req, res);

          // Property: for pre-recorded courses, lessons MUST NOT be cascaded.
          // On unfixed code, the cascade happens unconditionally → test fails.
          expect(lessonsCascaded).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Bug Path 4 — Lesson Inherits Week State: lesson is_published MUST be false
  // -------------------------------------------------------------------------
  it('Bug Path 4 — Lesson Inherits Week State: new lesson is_published MUST be false in pre-recorded courses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          weekId: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          content_type: fc.constantFrom('video', 'resource', 'text'),
        }),
        async ({ weekId, title, content_type }) => {
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
              // Week — pre-recorded course, week is_published = true (the bug scenario)
              return Promise.resolve({
                data: {
                  course_id: 'course-prerecorded-1',
                  is_published: true,
                  courses: { teacher_id: 'teacher-1', course_type: 'pre-recorded' },
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
              // The bug: is_published inherits from week (true) instead of being forced to false
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

          // Capture insert data to see what is_published value was set
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

          // Property: for pre-recorded courses, new video/resource/text lessons
          // MUST have is_published = false, regardless of week.is_published.
          // On unfixed code, addLesson sets is_published = week.is_published (true) → test fails.
          if (res._status === 201 && capturedInsertData) {
            expect(capturedInsertData.is_published).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
