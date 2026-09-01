-- Fix Course Visibility Consistency
-- 
-- Problem: Courses that were approved by admin but never had their
-- `status` and `is_published` fields updated remain invisible to students.
-- The student browse query requires BOTH approval_status='approved' AND
-- (status='published' OR is_published=true).
--
-- This migration fixes any courses that are approved but not yet marked
-- as published, ensuring they appear in the student browse page.

-- Fix courses where approval_status is 'approved' but status is not 'published'
UPDATE courses
SET 
  status = 'published',
  is_published = true,
  published_at = COALESCE(published_at, updated_at, NOW()),
  updated_at = NOW()
WHERE 
  approval_status = 'approved'
  AND (status != 'published' OR status IS NULL OR is_published IS NOT TRUE);

-- Also fix any courses where status was incorrectly set to 'approved'
-- (which is not a valid value for the status column - valid: draft/published/archived)
UPDATE courses
SET 
  status = 'published',
  is_published = true,
  approval_status = 'approved',
  published_at = COALESCE(published_at, updated_at, NOW()),
  updated_at = NOW()
WHERE 
  status = 'approved';
