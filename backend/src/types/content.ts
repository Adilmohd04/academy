export const LANGUAGE_CODES = ['en', 'ta', 'ar'] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const LANGUAGE_COLUMN_MAP = {
  en: 'content_url_en',
  ta: 'content_url_ta',
  ar: 'content_url_ar',
} as const;

export type LessonLanguageColumn = (typeof LANGUAGE_COLUMN_MAP)[LanguageCode];

export interface LessonLanguageRecord {
  id: string;
  title?: string | null;
  description?: string | null;
  content_type?: string | null;
  content_url?: string | null;
  content_url_en?: string | null;
  content_url_ta?: string | null;
  content_url_ar?: string | null;
  duration_minutes?: number | null;
  order_index?: number | null;
  week_id?: string | null;
  created_at?: string | null;
}

export interface LessonOwnershipCourseRecord {
  teacher_id?: string | null;
}

export interface LessonOwnershipWeekRecord {
  course?: LessonOwnershipCourseRecord | LessonOwnershipCourseRecord[] | null;
}

export interface LessonOwnershipRecord {
  week?: LessonOwnershipWeekRecord | LessonOwnershipWeekRecord[] | null;
}

export interface CourseWeekRecord {
  id: string;
  title: string;
  description?: string | null;
  order_index: number;
  lessons?: LessonLanguageRecord[] | null;
}

export interface CourseContentRecord {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  weeks?: CourseWeekRecord[] | null;
}

export interface LanguageVersionMap {
  en?: string | null;
  ta?: string | null;
  ar?: string | null;
}