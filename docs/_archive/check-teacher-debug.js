const pkg = require('pg');
const Pool = pkg.Pool;
require('dotenv').config({ path: './backend/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function check() {
  try {
    // Check courses
    const courses = await pool.query(
      "SELECT id, title, teacher_id, approval_status FROM courses WHERE title ILIKE '%islamic%' LIMIT 5"
    );
    console.log('=== Islamic Studies Courses ===');
    courses.rows.forEach(c => console.log(JSON.stringify(c)));

    // Check all courses teacher_ids
    const allCourses = await pool.query(
      "SELECT id, title, teacher_id FROM courses LIMIT 10"
    );
    console.log('\n=== All Courses ===');
    allCourses.rows.forEach(c => console.log(JSON.stringify(c)));

    // Check profiles
    const profiles = await pool.query(
      "SELECT id, clerk_user_id, full_name, email FROM profiles LIMIT 10"
    );
    console.log('\n=== Profiles ===');
    profiles.rows.forEach(p => console.log(JSON.stringify(p)));

    // Check course_teachers
    const ct = await pool.query(
      "SELECT ct.course_id, ct.teacher_id, p.full_name, p.clerk_user_id FROM course_teachers ct LEFT JOIN profiles p ON ct.teacher_id::uuid = p.id LIMIT 10"
    );
    console.log('\n=== Course Teachers (co-teachers) ===');
    ct.rows.forEach(c => console.log(JSON.stringify(c)));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
