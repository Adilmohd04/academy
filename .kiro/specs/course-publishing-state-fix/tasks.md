# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** — Pre-recorded course publishing state auto-promotion
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the five bug paths in pre-recorded courses
  - **Setup**: Install `fast-check` as a dev dependency (`npm install --save-dev fast-check`) in `backend/`
  - **Test file**: `backend/src/__tests__/services/coursePublishingBugCondition.test.ts`
  - **Scoped PBT Approach**: For each bug path, scope the property to concrete failing cases with `course_type = 'pre-recorded'`
  - **Bug Path 1 — DB Default**: Mock `supabase.from('course_weeks').insert(...)` to return `is_published: true` (simulating DB DEFAULT TRUE override). Property: for any week created in a pre-recorded course, `is_published` MUST be `false`. Generate arbitrary `{title, week_number, unlock_date}` inputs with `courseType = 'pre-recorded'`
  - **Bug Path 2 — Cron Auto-Publish**: Mock `autoPublishContent` query to return pre-recorded course weeks with past `unlock_date` and `status: 'draft'`. Property: the cron MUST NOT promote weeks belonging to pre-recorded courses. Generate arbitrary `{unlock_date (past), status: 'draft', courseType: 'pre-recorded'}` inputs
  - **Bug Path 3 — Week-to-Lesson Cascade**: Mock `updateWeek` with `is_published: true` on a pre-recorded course week. Property: lessons in the week MUST NOT have `is_published` cascaded to `true`. Generate arbitrary `{weekId, lessonCount, courseType: 'pre-recorded'}` inputs
  - **Bug Path 4 — Lesson Inherits Week State**: Mock `addLesson` for video/resource/text content types in a pre-recorded course where `week.is_published = true`. Property: new lesson's `is_published` MUST be `false`. Generate arbitrary `{content_type: fc.constantFrom('video', 'resource', 'text'), weekIsPublished: true, courseType: 'pre-recorded'}` inputs
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., "addLesson('video', weekWithIsPublished=true) sets lesson.is_published=true instead of false")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Live course publishing behavior unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **Test file**: `backend/src/__tests__/services/coursePublishingPreservation.test.ts`
  - **Observe on UNFIXED code first**, then write property-based tests capturing observed behavior:
  - **Observation 1 — Live Course Cron**: Run `autoPublishContent` with live course weeks that have past `unlock_date` and `status: 'draft'`. Observe: weeks are promoted to `status: 'published'`
  - **Observation 2 — Live Course Cascade**: Call `updateWeek` with `is_published: true` on a live course week. Observe: all lessons in the week get `is_published: true`
  - **Observation 3 — Live Course Lesson Inheritance**: Call `addLesson` for video/resource in a live course where `week.is_published = true`. Observe: lesson inherits `is_published: true`
  - **Observation 4 — Quiz Independent Publish**: Toggle a quiz's `is_published` in any course type. Observe: only that quiz is affected, not the week or other lessons
  - **Property-based tests**:
    - For all `{courseType: fc.constantFrom('live', 'hybrid'), unlock_date: pastDate, status: 'draft'}`, cron promotes weeks to published
    - For all `{courseType: fc.constantFrom('live', 'hybrid'), is_published: true, lessonCount: fc.integer({min:1, max:10})}`, cascade publishes all lessons
    - For all `{courseType: fc.constantFrom('live', 'hybrid'), content_type: fc.constantFrom('video', 'resource', 'text'), weekIsPublished: true}`, lesson inherits week's `is_published`
    - For all `{courseType: fc.constantFrom('pre-recorded', 'live', 'hybrid'), content_type: 'quiz'}`, quiz `is_published` defaults to `false` (not inherited from week)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.3, 3.5_

- [x] 3. Fix for pre-recorded course publishing state auto-promotion

  - [x] 3.1 Fix database schema default for `course_weeks.is_published`
    - Change `DEFAULT TRUE` to `DEFAULT FALSE` in `backend/database/migrations/add_complete_publishing_system.sql`
    - Create a new migration file `backend/database/migrations/fix_prerecorded_week_publish_default.sql` that:
      - Alters the column default: `ALTER TABLE course_weeks ALTER COLUMN is_published SET DEFAULT FALSE`
      - Updates existing pre-recorded course weeks: `UPDATE course_weeks SET is_published = false WHERE course_id IN (SELECT id FROM courses WHERE course_type = 'pre-recorded')`
    - _Bug_Condition: isBugCondition({operation: 'createWeek', courseType: 'pre-recorded'}) — DB DEFAULT TRUE overrides app-level is_published: false_
    - _Expected_Behavior: New weeks always start with is_published = false regardless of course type_
    - _Preservation: Live/hybrid course weeks are not affected by the migration update_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Add course type filter to `autoPublishContent` cron job
    - File: `backend/src/jobs/autoPublishContent.ts`
    - In the week auto-publish query, join with `courses` table and filter to only auto-publish weeks where `courses.course_type` is `'live'` or `'hybrid'`
    - Modify the query: add `.select('id, title, unlock_date, course_id, courses!inner(course_type)')` and filter results to exclude `course_type = 'pre-recorded'`
    - The lesson auto-publish query (quizzes/assignments) can remain unchanged since quizzes have independent publish lifecycles
    - _Bug_Condition: isBugCondition({operation: 'autoPublishWeek', courseType: 'pre-recorded'}) — Cron promotes draft weeks to published for all course types_
    - _Expected_Behavior: Cron skips pre-recorded course weeks entirely_
    - _Preservation: Live/hybrid course weeks with past unlock_date continue to be auto-published_
    - _Requirements: 1.2, 2.2, 3.1_

  - [x] 3.3 Skip week-to-lesson publish cascade for pre-recorded courses
    - File: `backend/src/modules/teacher/controllers/teacherCourseController.ts`
    - Function: `updateWeek` (line ~651)
    - Extend the existing week ownership query to also fetch `course_type` from the joined `courses` table: `.select('course_id, courses!inner(teacher_id, course_type)')`
    - Extract `courseType` from the result
    - Wrap the publish cascade block (lines ~701-718) in a condition: `if (courseType !== 'pre-recorded')`
    - Both the publish cascade (`is_published: true`) and unpublish cascade (`is_published: false`) should be skipped for pre-recorded courses
    - _Bug_Condition: isBugCondition({operation: 'updateWeekPublish', courseType: 'pre-recorded'}) — Cascades is_published to ALL lessons_
    - _Expected_Behavior: No cascade for pre-recorded courses; weeks are containers only_
    - _Preservation: Live/hybrid courses continue to cascade is_published from weeks to lessons_
    - _Requirements: 1.3, 2.3, 3.3_

  - [x] 3.4 Force draft for new lessons in pre-recorded courses
    - File: `backend/src/modules/teacher/controllers/teacherCourseController.ts`
    - Function: `addLesson` (line ~793)
    - Extend the existing week query to also fetch `course_type`: `.select('course_id, is_published, courses!inner(teacher_id, course_type)')`
    - Extract `courseType` from the result
    - Modify the `is_published` assignment block (line ~865): if `courseType === 'pre-recorded'`, always set `lessonInsert.is_published = false` for video/resource/text content types, regardless of `week.is_published`
    - For live/hybrid courses, keep the existing behavior: `lessonInsert.is_published = week.is_published === true`
    - _Bug_Condition: isBugCondition({operation: 'addLesson', courseType: 'pre-recorded', lessonData: {content_type: 'video|resource|text'}}) — Inherits week.is_published_
    - _Expected_Behavior: New non-quiz lessons in pre-recorded courses always default to is_published: false_
    - _Preservation: Live/hybrid course lessons continue to inherit week's is_published state_
    - _Requirements: 1.4, 2.4, 3.3_

  - [x] 3.5 Adjust student content visibility for pre-recorded courses
    - File: `backend/src/modules/student/controllers/courseController.ts`
    - In the student course content query, add course-type-aware visibility logic:
    - For pre-recorded courses where `course.is_published === true`: show all weeks and lessons without filtering by individual `is_published` flags, EXCEPT for quizzes — still respect quiz-level `is_published`
    - For live/hybrid courses: keep existing behavior (filter by individual `is_published` flags)
    - _Bug_Condition: isBugCondition({operation: 'togglePublishCourse', courseType: 'pre-recorded'}) — Only updates course-level fields without course-type-specific logic_
    - _Expected_Behavior: Pre-recorded course content visible through course-level status; quizzes retain independent publish state_
    - _Preservation: Live/hybrid course student visibility unchanged_
    - _Requirements: 1.6, 2.5, 2.6, 2.7_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — Pre-recorded course weeks and lessons default to draft
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior for pre-recorded courses
    - When this test passes, it confirms: weeks default to `is_published: false`, cron skips pre-recorded courses, no cascade for pre-recorded courses, lessons default to draft
    - Run bug condition exploration test from step 1: `npx jest coursePublishingBugCondition --no-coverage`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** — Live course publishing behavior unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2: `npx jest coursePublishingPreservation --no-coverage`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix (no regressions to live/hybrid course behavior)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `npx jest --no-coverage` in `backend/`
  - Ensure both bug condition and preservation tests pass
  - Ensure no existing tests are broken by the changes
  - Verify no TypeScript compilation errors: `npx tsc --noEmit` in `backend/`
  - Ask the user if questions arise
