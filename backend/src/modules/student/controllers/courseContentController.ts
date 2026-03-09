import { Request, Response, NextFunction } from 'express';
import * as courseContentService from '../../teacher/services/courseContentService';

export const createWeek = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { course_id, week_number, title, description, unlock_date } = req.body;
    const week = await courseContentService.createWeek({
      course_id,
      week_number,
      title,
      description,
      unlock_date
    });
    res.status(201).json({ success: true, data: week });
  } catch (error) {
    next(error);
  }
};

export const getCourseWeeks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const weeks = await courseContentService.getCourseWeeks(courseId);
    res.json({ success: true, data: weeks });
  } catch (error) {
    next(error);
  }
};

export const createContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { week_id, type, title, content_url, duration_minutes, scheduled_at, meet_link, is_required } = req.body;
    const content = await courseContentService.createContent({
      week_id,
      type,
      title,
      content_url,
      duration_minutes,
      scheduled_at,
      meet_link,
      is_required
    });
    res.status(201).json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
};

export const getWeekContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { weekId } = req.params;
    const content = await courseContentService.getWeekContent(weekId);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
};
