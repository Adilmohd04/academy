import { Request, Response } from 'express';
import * as courseEnrollmentService from '../services/courseEnrollmentService';

export const getBrowseCourses = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const courses = await courseEnrollmentService.getBrowseCourses(studentId);

    res.json(courses);
  } catch (error: any) {
    console.error('Error fetching browse courses:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch courses' });
  }
};

export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await courseEnrollmentService.enrollInCourse(courseId, studentId);

    res.json({ message: 'Successfully enrolled in course' });
  } catch (error: any) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: error.message || 'Failed to enroll in course' });
  }
};

export const getCourseOverview = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const course = await courseEnrollmentService.getCourseOverview(courseId, studentId);

    res.json(course);
  } catch (error: any) {
    console.error('Error fetching course overview:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch course overview' });
  }
};
