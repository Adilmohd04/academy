-- Course equivalence groups.
--
-- Different offerings of the same academic course (different batches, teachers,
-- schedules) must satisfy the same prerequisite. Equivalence is modelled as a
-- shared group_key rather than pairwise course links so that satisfying a
-- prerequisite never requires computing a transitive closure:
--
--   Python Fundamentals               -> group_key 'python-fundamentals'
--   Python Fundamentals (2024 Batch)  -> group_key 'python-fundamentals'
--   Python Fundamentals - Weekend     -> group_key 'python-fundamentals'
--
-- A prerequisite naming any one of the above is satisfied by completing any
-- other course sharing its group_key.
--
-- Prerequisites themselves continue to live in courses.prerequisite_courses,
-- which is what the teacher course builder writes. The older
-- course_prerequisites join table is written by nothing and is not used.

CREATE TABLE IF NOT EXISTS course_equivalences (
  course_id  UUID PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
  group_key  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- course_id is the primary key: a course belongs to exactly one equivalence
-- group. This keeps "which courses satisfy X" a single indexed lookup.
CREATE INDEX IF NOT EXISTS idx_course_equivalences_group_key
  ON course_equivalences (group_key);

COMMENT ON TABLE course_equivalences IS
  'Maps each course to an equivalence group. Courses sharing a group_key are interchangeable when satisfying a prerequisite.';
COMMENT ON COLUMN course_equivalences.group_key IS
  'Stable slug identifying the academic course, e.g. python-fundamentals. Shared by every equivalent offering.';

ALTER TABLE course_equivalences ENABLE ROW LEVEL SECURITY;

-- Equivalence mappings are not sensitive and the student-facing prerequisite
-- check must be able to read them.
DROP POLICY IF EXISTS "Anyone can view course equivalences" ON course_equivalences;
CREATE POLICY "Anyone can view course equivalences" ON course_equivalences
  FOR SELECT USING (true);

-- Only administrators curate equivalence groups. A teacher must not be able to
-- make their own course count as a prerequisite for someone else's.
DROP POLICY IF EXISTS "Admins can manage course equivalences" ON course_equivalences;
CREATE POLICY "Admins can manage course equivalences" ON course_equivalences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
        AND profiles.role = 'admin'
    )
  );
