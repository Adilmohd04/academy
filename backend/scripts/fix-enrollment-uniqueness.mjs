import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const duplicatesBefore = await client.query(`
      SELECT student_id, course_id, COUNT(*) AS duplicate_count
      FROM enrollments
      GROUP BY student_id, course_id
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `);

    console.log('Duplicates before cleanup:', duplicatesBefore.rows.length);

    await client.query('BEGIN');

    await client.query(`
      WITH ranked_enrollments AS (
        SELECT
          ctid,
          student_id,
          course_id,
          ROW_NUMBER() OVER (
            PARTITION BY student_id, course_id
            ORDER BY enrolled_at DESC NULLS LAST, id DESC
          ) AS rn
        FROM enrollments
      )
      DELETE FROM enrollments e
      USING ranked_enrollments r
      WHERE e.ctid = r.ctid
        AND r.rn > 1
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_student_course_unique'
        ) THEN
          ALTER TABLE enrollments
            ADD CONSTRAINT enrollments_student_course_unique
            UNIQUE (student_id, course_id);
        END IF;
      END $$
    `);

    await client.query('COMMIT');

    const duplicatesAfter = await client.query(`
      SELECT student_id, course_id, COUNT(*) AS duplicate_count
      FROM enrollments
      GROUP BY student_id, course_id
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `);

    const constraintCheck = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'enrollments_student_course_unique'
    `);

    console.log('Duplicates after cleanup:', duplicatesAfter.rows.length);
    console.log('Constraint present:', constraintCheck.rows.length > 0);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Failed to fix enrollment uniqueness:', error.message);
  process.exit(1);
});
