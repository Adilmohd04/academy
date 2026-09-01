import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { getErrorMessage } from '../utils/errors';
import {
  CourseContentRecord,
  LANGUAGE_CODES,
  LANGUAGE_COLUMN_MAP,
  LanguageCode,
  LanguageVersionMap,
  LessonLanguageRecord,
  LessonOwnershipRecord,
  LessonOwnershipCourseRecord,
} from '../types/content';

const isLanguageCode = (value: string): value is LanguageCode =>
  (LANGUAGE_CODES as readonly string[]).includes(value);

const parseLanguageCode = (value: unknown): LanguageCode | null => {
  const requested = typeof value === 'string' ? value : 'en';
  return isLanguageCode(requested) ? requested : null;
};

const getOwningCourse = (lesson: LessonOwnershipRecord): LessonOwnershipCourseRecord | null => {
  const week = lesson.week;
  const weekData = Array.isArray(week) ? week[0] : week;
  const course = weekData?.course;

  if (!course) {
    return null;
  }

  return Array.isArray(course) ? course[0] ?? null : course;
};

const getAvailableLanguages = (lesson: LessonLanguageRecord): LanguageVersionMap => ({
  en: lesson.content_url_en,
  ta: lesson.content_url_ta,
  ar: lesson.content_url_ar,
});

/**
 * Add or update language version for a lesson
 * POST /api/teacher/lessons/:lessonId/language
 */
export const addLessonLanguage = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { language, content_url } = req.body;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate language
    if (!isLanguageCode(language)) {
      return res.status(400).json({ 
        error: 'Invalid language',
        message: 'Language must be one of: en (English), ta (Tamil), ar (Arabic)'
      });
    }

    if (!content_url) {
      return res.status(400).json({ error: 'content_url is required' });
    }

    // Verify teacher owns this lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id, week:course_weeks!inner(course:courses!inner(teacher_id))')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseData = getOwningCourse(lesson as LessonOwnershipRecord);

    if (courseData?.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this lesson' });
    }

    // Update the language-specific column
    const columnName = `content_url_${language}`;
    const { data, error } = await supabase
      .from('course_lessons')
      .update({ [columnName]: content_url })
      .eq('id', lessonId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: `${language.toUpperCase()} version updated successfully`,
      lesson: data
    });
  } catch (error: unknown) {
    console.error('Error adding lesson language:', error);
    res.status(500).json({ error: getErrorMessage(error, 'Failed to add lesson language') });
  }
};

/**
 * Get lesson with language-specific content
 * GET /api/student/lessons/:lessonId?language=en
 */
export const getLessonWithLanguage = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const language = parseLanguageCode(req.query.language);
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate language
    if (!language) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    // Get lesson with all language versions
    const { data: lesson, error } = await supabase
      .from('course_lessons')
      .select(`
        id,
        title,
        description,
        content_type,
        content_url,
        content_url_en,
        content_url_ta,
        content_url_ar,
        duration_minutes,
        order_index,
        week_id,
        created_at,
        week:course_weeks!inner(
          id,
          title,
          order_index,
          course_id
        )
      `)
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Get the language-specific URL
    const languageUrls = getAvailableLanguages(lesson as LessonLanguageRecord);

    const selectedUrl = languageUrls[language];
    const availableLanguages = Object.entries(languageUrls)
      .filter(([, url]) => Boolean(url))
      .map(([lang]) => lang as LanguageCode);

    // Check if lesson has the requested language
    if (!selectedUrl) {
      return res.status(404).json({ 
        error: 'Language not available',
        message: `This lesson is not available in ${language}`,
        available_languages: availableLanguages
      });
    }

    // Return lesson with selected language only
    res.json({
      ...lesson,
      content_url: selectedUrl,
      selected_language: language,
      available_languages: availableLanguages,
      // Remove language-specific columns from response
      content_url_en: undefined,
      content_url_ta: undefined,
      content_url_ar: undefined
    });
  } catch (error: unknown) {
    console.error('Error fetching lesson with language:', error);
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch lesson') });
  }
};

/**
 * Get course content with language filter
 * GET /api/student/courses/:courseId/content?language=en
 */
export const getCourseContentWithLanguage = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const language = parseLanguageCode(req.query.language);
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate language
    if (!language) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    // Get course with weeks and lessons
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        weeks:course_weeks(
          id,
          title,
          description,
          order_index,
          lessons:course_lessons(
            id,
            title,
            description,
            content_type,
            content_url_en,
            content_url_ta,
            content_url_ar,
            duration_minutes,
            order_index
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Filter lessons based on language availability
    const columnName = LANGUAGE_COLUMN_MAP[language];
    const courseData = course as CourseContentRecord;
    const filteredWeeks = (courseData.weeks ?? [])
      .map((week) => ({
        ...week,
        lessons: (week.lessons ?? [])
          .filter((lesson) => lesson[columnName]) // Only include lessons with this language
          .map((lesson) => ({
          ...lesson,
          content_url: lesson[columnName],
          selected_language: language,
          has_en: !!lesson.content_url_en,
          has_ta: !!lesson.content_url_ta,
          has_ar: !!lesson.content_url_ar,
          // Remove language-specific columns
          content_url_en: undefined,
          content_url_ta: undefined,
          content_url_ar: undefined
          }))
      }))
      .filter((week) => week.lessons && week.lessons.length > 0); // Remove empty weeks

    res.json({
      ...courseData,
      weeks: filteredWeeks,
      selected_language: language,
      total_weeks: filteredWeeks?.length || 0,
      total_lessons: filteredWeeks?.reduce((sum: number, week) => 
        sum + (week.lessons?.length || 0), 0
      )
    });
  } catch (error: unknown) {
    console.error('Error fetching course content with language:', error);
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch course content') });
  }
};

/**
 * Get all language versions for a lesson
 * GET /api/lessons/:lessonId/languages
 */
export const getAllLessonLanguages = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    // Get lesson with all language versions
    const { data: lesson, error } = await supabase
      .from('course_lessons')
      .select(`
        id,
        title,
        description,
        content_type,
        content_url_en,
        content_url_ta,
        content_url_ar,
        duration_minutes,
        order_index
      `)
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(lesson as LessonLanguageRecord);
  } catch (error: unknown) {
    console.error('Error fetching lesson languages:', error);
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch lesson languages') });
  }
};

/**
 * Delete language version from lesson
 * DELETE /api/teacher/lessons/:lessonId/language/:language
 */
export const deleteLessonLanguage = async (req: Request, res: Response) => {
  try {
    const { lessonId, language } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isLanguageCode(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    // Verify teacher owns this lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id, week:course_weeks!inner(course:courses!inner(teacher_id))')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseData = getOwningCourse(lesson as LessonOwnershipRecord);

    if (courseData?.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove the language version
    const columnName = `content_url_${language}`;
    const { data, error } = await supabase
      .from('course_lessons')
      .update({ [columnName]: null })
      .eq('id', lessonId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: `${language.toUpperCase()} version removed`,
      lesson: data
    });
  } catch (error: unknown) {
    console.error('Error deleting lesson language:', error);
    res.status(500).json({ error: getErrorMessage(error, 'Failed to delete lesson language') });
  }
};
