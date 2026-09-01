/**
 * Course equivalence administration.
 *
 * Courses sharing a `group_key` are interchangeable when satisfying a
 * prerequisite (see modules/student/services/prerequisiteService.ts). Without
 * these endpoints the table has no writer, which is precisely what left the
 * older `course_prerequisites` table dead and its eligibility check useless.
 *
 * Mounted at /api/admin. Guards are declared per route rather than with a
 * bare `router.use(...)`: this router shares its mount prefix with others, and
 * an unscoped guard there runs for every request entering the prefix, not just
 * the routes defined here.
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';

const router = express.Router();

const adminOnly = [requireAuth, requireRole(['admin'])];

/** Postgres: relation does not exist. */
const UNDEFINED_TABLE = '42P01';
const GROUP_KEY_MAX = 120;
const MIGRATION_HINT =
  'The course_equivalences table does not exist yet. Apply database/migrations/20260729_course_equivalences.sql.';

/**
 * Accept what an operator would naturally type ("Python Fundamentals") and
 * store one canonical form, so two admins describing the same academic course
 * do not create two groups that never match.
 */
export function normaliseGroupKey(value: unknown): { key?: string; error?: string } {
  if (typeof value !== 'string') return { error: 'groupKey is required' };

  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!key) return { error: 'groupKey must contain at least one letter or number' };
  if (key.length > GROUP_KEY_MAX) {
    return { error: `groupKey must be ${GROUP_KEY_MAX} characters or fewer` };
  }

  return { key };
}

const missingTable = (error: any) => error?.code === UNDEFINED_TABLE;

/**
 * GET /api/admin/course-equivalences
 * Every mapping, grouped by key, with course titles for display.
 */
router.get('/course-equivalences', ...adminOnly, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('course_equivalences')
      .select('course_id, group_key')
      .order('group_key', { ascending: true });

    if (error) {
      if (missingTable(error)) {
        return res.status(503).json({ error: 'migration_pending', message: MIGRATION_HINT });
      }
      console.error('[course-equivalences] list failed:', error);
      return res.status(500).json({ error: 'list_failed', message: 'Could not load course equivalences.' });
    }

    const rows = data ?? [];
    const courseIds = [...new Set(rows.map((row: any) => row.course_id))];
    const { data: courses } = courseIds.length
      ? await supabase.from('courses').select('id, title').in('id', courseIds)
      : { data: [] as any[] };

    const titleById = new Map((courses ?? []).map((c: any) => [c.id, c.title]));
    const groups = new Map<string, Array<{ courseId: string; title: string }>>();
    for (const row of rows) {
      const bucket = groups.get((row as any).group_key) ?? [];
      bucket.push({
        courseId: (row as any).course_id,
        title: titleById.get((row as any).course_id) || 'Unknown course',
      });
      groups.set((row as any).group_key, bucket);
    }

    return res.json({
      groups: [...groups.entries()].map(([groupKey, courses]) => ({ groupKey, courses })),
      total: rows.length,
    });
  } catch (error) {
    console.error('[course-equivalences] list failed:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Could not load course equivalences.' });
  }
});

/**
 * PUT /api/admin/course-equivalences/:courseId
 * Body: { groupKey: string }
 *
 * A course belongs to exactly one group, so this upserts on the primary key.
 */
router.put('/course-equivalences/:courseId', ...adminOnly, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { key, error: keyError } = normaliseGroupKey(req.body?.groupKey);
    if (keyError || !key) {
      return res.status(400).json({ error: 'invalid_group_key', message: keyError });
    }

    // Reject unknown courses here rather than relying on the foreign key, so
    // the operator gets a clear message instead of a constraint error.
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) {
      console.error('[course-equivalences] course lookup failed:', courseError);
      return res.status(500).json({ error: 'course_lookup_failed', message: 'Could not verify the course.' });
    }
    if (!course) {
      return res.status(404).json({ error: 'course_not_found', message: 'Course not found.' });
    }

    const now = new Date().toISOString();
    const { data: saved, error } = await supabase
      .from('course_equivalences')
      .upsert({ course_id: courseId, group_key: key, updated_at: now }, { onConflict: 'course_id' })
      .select('course_id, group_key')
      .single();

    if (error) {
      if (missingTable(error)) {
        return res.status(503).json({ error: 'migration_pending', message: MIGRATION_HINT });
      }
      console.error('[course-equivalences] upsert failed:', error);
      return res.status(500).json({ error: 'save_failed', message: 'Could not save the equivalence mapping.' });
    }

    return res.json({
      message: `"${course.title}" now satisfies prerequisites in group "${key}".`,
      equivalence: { courseId: saved.course_id, groupKey: saved.group_key },
    });
  } catch (error) {
    console.error('[course-equivalences] upsert failed:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Could not save the equivalence mapping.' });
  }
});

/**
 * DELETE /api/admin/course-equivalences/:courseId
 * The course then satisfies only prerequisites naming it directly.
 */
router.delete('/course-equivalences/:courseId', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('course_equivalences')
      .delete()
      .eq('course_id', req.params.courseId)
      .select('course_id')
      .maybeSingle();

    if (error) {
      if (missingTable(error)) {
        return res.status(503).json({ error: 'migration_pending', message: MIGRATION_HINT });
      }
      console.error('[course-equivalences] delete failed:', error);
      return res.status(500).json({ error: 'delete_failed', message: 'Could not remove the equivalence mapping.' });
    }

    if (!data) {
      return res.status(404).json({ error: 'not_found', message: 'This course has no equivalence mapping.' });
    }

    return res.json({ message: 'Equivalence mapping removed.', courseId: data.course_id });
  } catch (error) {
    console.error('[course-equivalences] delete failed:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Could not remove the equivalence mapping.' });
  }
});

export default router;
