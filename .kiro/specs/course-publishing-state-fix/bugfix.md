# Bugfix Requirements Document

## Introduction

The course builder has a critical publishing state persistence bug. When content (videos, materials) is added inside a week/module and the page is reloaded, the entire week automatically becomes "published" instead of remaining in draft state. Publishing state propagates incorrectly from content to weeks, and from weeks to courses. For pre-recorded courses, the expected model is: everything stays in draft until the entire course is published at once. Weeks/modules should not have an independent publish state — they are containers only. The only exception is quizzes, which have their own independent publish lifecycle.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a new week is created in a pre-recorded course via the `course_weeks` migration schema THEN the system defaults `is_published` to `TRUE` (in `add_complete_publishing_system.sql`), causing newly created weeks to appear as published in the database despite the `addWeek` controller explicitly setting `is_published: false`

1.2 WHEN the `autoPublishContent` cron job runs and a week has a past `unlock_date` with `status = 'draft'` THEN the system automatically promotes the week to `status: 'published'` regardless of whether the parent course is published or whether the course is pre-recorded

1.3 WHEN a week's `is_published` is set to `true` (via the `updateWeek` controller) THEN the system automatically cascades `is_published: true` to ALL lessons in that week, including videos and resources that should not have independent publish states for pre-recorded courses

1.4 WHEN a new video or resource lesson is added to a week via `addLesson` THEN the system inherits the week's `is_published` state (`lessonInsert.is_published = week.is_published === true`), causing content to be immediately published if the week happens to be in a published state

1.5 WHEN the page is reloaded after adding content to a week THEN the week's publishing state read from the database may show `is_published: true` (due to the `DEFAULT TRUE` migration or auto-publish cron), making the entire week appear published even though the teacher never explicitly published it

1.6 WHEN the `togglePublishCourse` endpoint is called THEN the system only updates the course-level `status` and `is_published` fields but does not enforce any course-type-specific publishing rules — pre-recorded and live courses follow the same publishing logic

### Expected Behavior (Correct)

2.1 WHEN a new week is created in a pre-recorded course THEN the system SHALL default `is_published` to `FALSE` in both the database schema and the application code, ensuring weeks always start in draft state

2.2 WHEN the `autoPublishContent` cron job runs THEN the system SHALL NOT auto-publish weeks or lessons belonging to pre-recorded courses; auto-publishing SHALL only apply to live courses where week-level and content-level publishing is acceptable

2.3 WHEN content is added or modified inside a week of a pre-recorded course THEN the system SHALL NOT propagate any publishing state changes to the parent week — weeks in pre-recorded courses are containers only and SHALL NOT have a meaningful publish state

2.4 WHEN a new video or resource lesson is added to a week in a pre-recorded course THEN the system SHALL set `is_published` to `FALSE` by default, regardless of the week's current `is_published` state; content visibility SHALL be controlled only by the course-level publish status

2.5 WHEN the page is reloaded THEN the system SHALL correctly persist and display the draft state for all weeks and content in pre-recorded courses; no automatic promotion from draft to published SHALL occur

2.6 WHEN a pre-recorded course is published at the course level THEN the system SHALL make all weeks and content visible to students through the course-level status alone, without requiring or changing individual week/lesson `is_published` flags; quizzes SHALL retain their independent publish state (a quiz can remain in draft even when the course is published)

2.7 WHEN a quiz's `is_published` state is toggled in a pre-recorded course THEN the system SHALL update only that quiz's `is_published` flag without affecting the week, other lessons, or the course status

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a live course's weeks have `unlock_date` set and the date has passed THEN the system SHALL CONTINUE TO auto-publish those weeks and their lessons as it does today

3.2 WHEN a teacher creates, updates, or deletes lessons in a week THEN the system SHALL CONTINUE TO correctly persist lesson data (title, content_url, quiz_questions, assignment_details, etc.) without data loss

3.3 WHEN a teacher publishes or unpublishes a live course's week THEN the system SHALL CONTINUE TO cascade the publish state to all lessons within that week

3.4 WHEN a course is submitted for admin approval THEN the system SHALL CONTINUE TO follow the existing approval workflow (draft → pending_approval → approved/rejected)

3.5 WHEN a quiz or assignment has a `release_date` set in a live course THEN the system SHALL CONTINUE TO auto-publish that content when the release date passes

3.6 WHEN a teacher reorders weeks or lessons THEN the system SHALL CONTINUE TO persist the new order correctly without affecting any publishing states

3.7 WHEN a teacher saves course-level changes (title, description, settings) THEN the system SHALL CONTINUE TO persist those changes without affecting week or lesson publishing states
