# Course Publishing State Fix — Bugfix Design

## Overview

The course builder has a publishing state persistence bug affecting pre-recorded courses. When content (videos, materials) is added inside a week/module and the page is reloaded, the entire week automatically becomes "published" instead of remaining in draft state. The root cause is a combination of: (1) a database migration that defaults `course_weeks.is_published` to `TRUE`, (2) an `autoPublishContent` cron job that promotes weeks to published without checking course type, (3) cascading publish logic in `updateWeek` that propagates `is_published` from weeks to all lessons regardless of course type, and (4) `addLesson` inheriting the week's `is_published` state for video/resource content types without considering whether the course is pre-recorded.

The fix introduces course-type awareness into all publishing code paths. For pre-recorded courses, weeks and lessons remain in draft until the entire course is published at the course level. Quizzes retain their independent publish lifecycle. Live courses continue to behave exactly as they do today.

## Glossary

- **Bug_Condition (C)**: The set of inputs/operations where publishing state is incorrectly promoted in pre-recorded courses — week creation defaults to published, auto-publish cron ignores course type, lesson creation inherits week's published state, and week publish cascades to all lessons
- **Property (P)**: For pre-recorded courses, weeks and non-quiz lessons SHALL always default to `is_published: false` and SHALL NOT be auto-promoted; publishing is controlled exclusively at the course level
- **Preservation**: All existing live course behaviors (auto-publish via cron, week-to-lesson cascade, unlock_date scheduling) must remain unchanged
- **`course_weeks.is_published`**: Boolean column on the `course_weeks` table; currently defaults to `TRUE` in the `add_complete_publishing_system.sql` migration
- **`course_weeks.status`**: Enum column (`'draft' | 'published'`) on the `course_weeks` table; used by the `autoPublishContent` cron job
- **`course_lessons.is_published`**: Boolean column on the `course_lessons` table; defaults to `FALSE` in the migration
- **`autoPublishContent`**: Cron job in `backend/src/jobs/autoPublishContent.ts` that auto-publishes weeks with past `unlock_date` and lessons with past `release_date`
- **`togglePublishCourse`**: Controller in `backend/src/modules/teacher/controllers/teacherCourseController.ts` that toggles course-level `status` and `is_published`
- **`addWeek`**: Controller function that creates a new week; currently sets `is_published: false` but the DB default overrides this
- **`updateWeek`**: Controller function that updates a week; cascades `is_published` changes to all lessons in the week
- **`addLesson`**: Controller function that creates a lesson; inherits `is_published` from the parent week for video/resource/text types
- **`course_type`**: Column on the `courses` table; values are `'pre-recorded'`, `'live'`, or `'hybrid'`

## Bug Details

### Bug Condition

The bug manifests when any publishing-related operation occurs on a pre-recorded course without checking the `course_type`. The system treats pre-recorded courses identically to live courses, allowing automatic state promotion that should only apply to live/hybrid courses.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { operation, courseType, weekId?, lessonData? }
  OUTPUT: boolean

  // Bug path 1: DB default overrides application code on week creation
  IF input.operation == 'createWeek' AND input.courseType == 'pre-recorded'
    RETURN TRUE  // DB DEFAULT TRUE overrides the app-level is_published: false

  // Bug path 2: Cron auto-publishes weeks without checking course type
  IF input.operation == 'autoPublishWeek' AND input.courseType == 'pre-recorded'
    RETURN TRUE  // Cron promotes draft weeks to published for all course types

  // Bug path 3: Week publish cascades to all lessons without checking course type
  IF input.operation == 'updateWeekPublish' AND input.courseType == 'pre-recorded'
    RETURN TRUE  // Cascades is_published to ALL lessons including non-quiz types

  // Bug path 4: Lesson creation inherits week's is_published for non-quiz types
  IF input.operation == 'addLesson' AND input.courseType == 'pre-recorded'
     AND input.lessonData.content_type IN ['video', 'resource', 'text']
    RETURN TRUE  // Inherits week.is_published which may be TRUE

  // Bug path 5: togglePublishCourse doesn't differentiate course types
  IF input.operation == 'togglePublishCourse' AND input.courseType == 'pre-recorded'
    RETURN TRUE  // Only updates course-level fields, no course-type-specific logic

  RETURN FALSE
END FUNCTION
```

### Examples

- **Week creation default**: A teacher creates Week 3 in a pre-recorded course. The `addWeek` controller inserts `is_published: false`, but the database column `DEFAULT TRUE` may override this if the insert doesn't explicitly include the column, or if a trigger/default fires. On page reload, the week shows as published.
- **Cron auto-publish**: A pre-recorded course has Week 1 with `unlock_date = '2025-01-01'` and `status = 'draft'`. The `autoPublishContent` cron runs and promotes it to `status: 'published'` because it only checks `unlock_date` and `status`, not `course_type`.
- **Cascade on week publish**: A teacher updates Week 2's `is_published` to `true` in a pre-recorded course. The `updateWeek` controller cascades `is_published: true` to ALL lessons in that week, including videos and resources that should remain draft.
- **Lesson inherits week state**: A teacher adds a video lesson to Week 1 (which has `is_published: true` due to the DB default). The `addLesson` controller sets `lessonInsert.is_published = week.is_published === true`, making the video immediately published.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Live course weeks with past `unlock_date` must continue to be auto-published by the cron job
- Live course week publish/unpublish must continue to cascade `is_published` to all lessons in that week
- Quiz and assignment `release_date` auto-publish must continue to work for live courses
- Mouse clicks, lesson CRUD operations, week reordering, and course-level metadata changes must all continue to work exactly as before
- The course approval workflow (`draft → pending_approval → approved/rejected`) must remain unchanged
- Lesson data persistence (title, content_url, quiz_questions, assignment_details, etc.) must not be affected

**Scope:**
All inputs that do NOT involve publishing-state changes on pre-recorded courses should be completely unaffected by this fix. This includes:
- All operations on live and hybrid courses
- Non-publishing CRUD operations (create/read/update/delete) on weeks and lessons
- Course-level metadata updates (title, description, settings)
- Student-facing content queries (these already filter by `is_published`)

## Hypothesized Root Cause

Based on the code analysis, there are five interconnected root causes:

1. **Database Schema Default**: The migration `add_complete_publishing_system.sql` sets `course_weeks.is_published` to `DEFAULT TRUE` (line: `ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE`). Even though `addWeek` in `teacherCourseController.ts` explicitly sets `is_published: false`, the DB default creates a mismatch risk and means any code path that creates weeks without explicitly setting this column will get `TRUE`.

2. **Cron Job Missing Course Type Check**: The `autoPublishContent` function in `backend/src/jobs/autoPublishContent.ts` queries `course_weeks` with `status = 'draft'` and past `unlock_date`, then promotes them to `status: 'published'`. It does not join with the `courses` table to check `course_type`, so pre-recorded course weeks are auto-published alongside live course weeks.

3. **Unconditional Week-to-Lesson Cascade**: The `updateWeek` function in `teacherCourseController.ts` (lines 701-718) cascades `is_published` changes to ALL lessons in a week without checking the parent course's `course_type`. For pre-recorded courses, this cascade should not happen — weeks are containers only.

4. **Lesson Inherits Week's Published State**: The `addLesson` function in `teacherCourseController.ts` (line 865) sets `lessonInsert.is_published = week.is_published === true` for video/resource/text content types. For pre-recorded courses, new lessons should always default to `is_published: false` regardless of the week's state.

5. **togglePublishCourse Lacks Course-Type Logic**: The `togglePublishCourse` function only updates `courses.status` and `courses.is_published`. For pre-recorded courses, it should make all content visible through the course-level status alone, without needing to flip individual week/lesson `is_published` flags.

## Correctness Properties

Property 1: Bug Condition — Pre-recorded course weeks and lessons default to draft

_For any_ week or non-quiz lesson created in a pre-recorded course, the system SHALL set `is_published` to `false` regardless of the database default or the parent week's current `is_published` state. The `autoPublishContent` cron SHALL NOT promote weeks or lessons belonging to pre-recorded courses.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation — Live course publishing behavior unchanged

_For any_ operation on a live or hybrid course (week creation, auto-publish cron, week publish cascade, lesson creation), the system SHALL produce exactly the same behavior as the original code, preserving auto-publish via `unlock_date`, week-to-lesson cascade on publish/unpublish, and lesson inheritance of week's `is_published` state.

**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `backend/database/migrations/add_complete_publishing_system.sql`

**Change 1 — Fix DB Default**: Change the `course_weeks.is_published` default from `TRUE` to `FALSE`.
- Current: `ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE`
- Fixed: `ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE`
- A new migration should also be created to update existing rows: `UPDATE course_weeks SET is_published = false WHERE is_published = true AND course_id IN (SELECT id FROM courses WHERE course_type = 'pre-recorded')`

---

**File**: `backend/src/jobs/autoPublishContent.ts`

**Function**: `autoPublishContent`

**Change 2 — Add course type filter to week auto-publish**: Join with the `courses` table and exclude pre-recorded courses from the auto-publish query for weeks.
- Add a join or subquery: only auto-publish weeks where the parent course's `course_type` is `'live'` or `'hybrid'`
- The lesson auto-publish query already filters by `content_type IN ['quiz', 'assignment']`, which is acceptable for all course types since quizzes have independent publish lifecycles

---

**File**: `backend/src/modules/teacher/controllers/teacherCourseController.ts`

**Function**: `updateWeek`

**Change 3 — Skip cascade for pre-recorded courses**: Before cascading `is_published` to lessons, fetch the parent course's `course_type`. If the course is pre-recorded, skip the cascade entirely.
- The existing query already fetches `week.courses` via join — extend it to include `course_type`
- Wrap the cascade logic in a condition: `if (courseType !== 'pre-recorded')`

---

**File**: `backend/src/modules/teacher/controllers/teacherCourseController.ts`

**Function**: `addLesson`

**Change 4 — Force draft for pre-recorded course lessons**: When adding a video/resource/text lesson to a pre-recorded course, always set `is_published: false` regardless of the week's state.
- The existing query already fetches `week.courses` — extend it to include `course_type` from the joined courses table
- Add condition: if `course_type === 'pre-recorded'`, set `lessonInsert.is_published = false`

---

**File**: `backend/src/modules/student/controllers/courseController.ts`

**Function**: Student course content query

**Change 5 — Adjust student content visibility for pre-recorded courses**: For pre-recorded courses, the student content query should show weeks and lessons based on the course-level `is_published` status rather than individual `is_published` flags. When a pre-recorded course is published at the course level, all weeks and non-draft-quiz lessons should be visible.
- Add a check: if `course.course_type === 'pre-recorded'` and `course.is_published === true`, don't filter weeks/lessons by `is_published`
- For quizzes in pre-recorded courses, still respect the individual `is_published` flag

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that exercise each of the five bug paths on pre-recorded courses. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **DB Default Test**: Create a week via `createWeek` service for a pre-recorded course, verify `is_published` is `false` in the returned data (will reveal if DB default overrides app code)
2. **Cron Auto-Publish Test**: Set up a pre-recorded course week with past `unlock_date` and `status: 'draft'`, run `autoPublishContent`, verify the week is NOT promoted (will fail on unfixed code — cron will promote it)
3. **Cascade Test**: Call `updateWeek` with `is_published: true` on a pre-recorded course week containing lessons, verify lessons are NOT auto-published (will fail on unfixed code — cascade will publish them)
4. **Lesson Inheritance Test**: Add a video lesson to a pre-recorded course week where `is_published: true`, verify the lesson's `is_published` is `false` (will fail on unfixed code — lesson inherits week's state)

**Expected Counterexamples**:
- Week `is_published` reads as `true` after creation despite app code setting `false`
- Cron promotes pre-recorded course weeks from draft to published
- Lesson `is_published` becomes `true` when parent week is published in a pre-recorded course

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT result.week.is_published == false  // for week operations
  ASSERT result.lesson.is_published == false  // for lesson operations (non-quiz)
  ASSERT cronDidNotPromote(result)  // for auto-publish operations
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various course types, content types, week states)
- It catches edge cases that manual unit tests might miss (e.g., hybrid courses, edge content types)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for live course operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Live Course Auto-Publish Preservation**: Verify that live course weeks with past `unlock_date` continue to be auto-published by the cron
2. **Live Course Cascade Preservation**: Verify that publishing a live course week still cascades `is_published` to all lessons
3. **Lesson CRUD Preservation**: Verify that creating/updating/deleting lessons preserves all data fields correctly
4. **Course Metadata Preservation**: Verify that updating course-level fields (title, description) does not affect week/lesson publishing states
5. **Quiz Independent Publish Preservation**: Verify that toggling a quiz's `is_published` in any course type only affects that quiz

### Unit Tests

- Test `createWeek` for pre-recorded courses returns `is_published: false`
- Test `autoPublishContent` skips pre-recorded course weeks
- Test `updateWeek` with `is_published: true` does NOT cascade for pre-recorded courses
- Test `updateWeek` with `is_published: true` DOES cascade for live courses
- Test `addLesson` for video/resource in pre-recorded course sets `is_published: false`
- Test `addLesson` for video/resource in live course inherits week's `is_published`
- Test `addLesson` for quiz type always defaults to `is_published: false` (both course types)
- Test `togglePublishCourse` for pre-recorded course only updates course-level fields

### Property-Based Tests

- Generate random `{courseType, contentType, weekIsPublished}` tuples and verify that pre-recorded courses always produce `is_published: false` for weeks and non-quiz lessons, while live courses preserve existing behavior
- Generate random week configurations with various `unlock_date` values and verify the cron only auto-publishes live/hybrid course weeks
- Generate random lesson CRUD operations and verify data integrity is preserved across all course types

### Integration Tests

- Test full flow: create pre-recorded course → add weeks → add lessons → reload page → verify all states are draft
- Test full flow: create live course → add weeks with unlock_date → run cron → verify weeks are published
- Test full flow: publish pre-recorded course at course level → verify student can see all content → verify individual `is_published` flags unchanged
- Test that quiz `is_published` toggle works independently in both pre-recorded and live courses
