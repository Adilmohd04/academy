import pool from '../../../config/database';

interface CourseContentData {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail_url?: string;
  };
  weeks: Array<{
    id: string;
    title: string;
    description?: string;
    order_index: number;
    lessons: Array<{
      id: string;
      title: string;
      content_type: string;
      content_url?: string;
      duration_minutes?: number;
      order_index: number;
      is_completed: boolean;
      is_locked: boolean;
    }>;
  }>;
  progress: {
    total_lessons: number;
    completed_lessons: number;
    progress_percentage: number;
  };
}

export const getCourseContentWithProgress = async (
  courseId: string,
  studentId: string
): Promise<CourseContentData> => {
  const client = await pool.connect();
  
  try {
    // Get course details
    const courseResult = await client.query(
      `SELECT id, title, description, thumbnail_url 
       FROM courses 
       WHERE id = $1 AND status = 'published'`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      throw new Error('Course not found or not published');
    }

    const course = courseResult.rows[0];

    // Get weeks with lessons
    const weeksResult = await client.query(
      `SELECT 
        w.id,
        w.title,
        w.description,
        w.order_index,
        json_agg(
          json_build_object(
            'id', l.id,
            'title', l.title,
            'content_type', l.content_type,
            'content_url', l.content_url,
            'duration_minutes', l.duration_minutes,
            'order_index', l.order_index,
            'is_completed', COALESCE(lp.is_completed, false),
            'completed_at', lp.completed_at
          ) ORDER BY l.order_index
        ) as lessons
       FROM course_weeks w
       LEFT JOIN course_lessons l ON l.week_id = w.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $2
       WHERE w.course_id = $1
       GROUP BY w.id, w.title, w.description, w.order_index
       ORDER BY w.order_index`,
      [courseId, studentId]
    );

    // Calculate progress (including lessons and quizzes)
    const progressResult = await client.query(
      `SELECT 
        COUNT(l.id) as total_lessons,
        COUNT(lp.id) FILTER (WHERE lp.is_completed = true) as completed_lessons,
        COUNT(q.id) as total_quizzes,
        COUNT(DISTINCT qa.id) FILTER (WHERE qa.passed = true) as passed_quizzes
       FROM course_lessons l
       INNER JOIN course_weeks w ON w.id = l.week_id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $2
       LEFT JOIN quizzes q ON q.course_id = $1 AND q.is_published = true
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = $2
       WHERE w.course_id = $1`,
      [courseId, studentId]
    );

    const { total_lessons, completed_lessons, total_quizzes, passed_quizzes } = progressResult.rows[0];
    const total_items = parseInt(total_lessons) + parseInt(total_quizzes);
    const completed_items = parseInt(completed_lessons) + parseInt(passed_quizzes);
    const progress_percentage = total_items > 0 
      ? Math.round((completed_items / total_items) * 100)
      : 0;

    // Determine which lessons should be locked (sequential unlocking)
    const weeks = weeksResult.rows.map((week: any) => {
      let previousCompleted = true;
      
      const lessons = week.lessons.map((lesson: any) => {
        const isLocked = !previousCompleted;
        previousCompleted = lesson.is_completed;
        
        return {
          ...lesson,
          is_locked: isLocked
        };
      });

      return {
        ...week,
        lessons
      };
    });

    return {
      course,
      weeks,
      progress: {
        total_lessons: parseInt(total_lessons),
        completed_lessons: parseInt(completed_lessons),
        progress_percentage
      }
    };
  } finally {
    client.release();
  }
};

export const markLessonComplete = async (
  lessonId: string,
  studentId: string
): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insert or update lesson progress
    await client.query(
      `INSERT INTO lesson_progress (lesson_id, student_id, is_completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (lesson_id, student_id)
       DO UPDATE SET is_completed = true, completed_at = NOW()`,
      [lessonId, studentId]
    );

    // Update enrollment progress
    const courseResult = await client.query(
      `SELECT w.course_id 
       FROM course_lessons l
       INNER JOIN course_weeks w ON w.id = l.week_id
       WHERE l.id = $1`,
      [lessonId]
    );

    if (courseResult.rows.length > 0) {
      const courseId = courseResult.rows[0].course_id;

      // Calculate new progress
      const progressResult = await client.query(
        `SELECT 
          COUNT(l.id) as total_lessons,
          COUNT(lp.id) FILTER (WHERE lp.is_completed = true) as completed_lessons
         FROM course_lessons l
         INNER JOIN course_weeks w ON w.id = l.week_id
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $2
         WHERE w.course_id = $1`,
        [courseId, studentId]
      );

      const { total_lessons, completed_lessons } = progressResult.rows[0];
      const progress_percentage = total_lessons > 0 
        ? Math.round((completed_lessons / total_lessons) * 100)
        : 0;

      // Update enrollment
      await client.query(
        `UPDATE enrollments 
         SET progress_percentage = $1, last_accessed = NOW()
         WHERE course_id = $2 AND student_id = $3`,
        [progress_percentage, courseId, studentId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getLessonProgress = async (
  lessonId: string,
  studentId: string
): Promise<{ is_completed: boolean; completed_at?: Date }> => {
  const { data, error } = await pool
    .from('lesson_progress')
    .select('is_completed, completed_at')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { is_completed: false };
  }

  return data;
};
