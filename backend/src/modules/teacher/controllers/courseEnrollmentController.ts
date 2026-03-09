import { Request, Response } from 'express';
import * as courseEnrollmentService from '../services/courseEnrollmentService';

export const getCourseEnrollments = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = await courseEnrollmentService.getCourseEnrollments(courseId, teacherId);

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch enrollments' });
  }
};

export const getStudentDetails = async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = await courseEnrollmentService.getStudentCourseDetails(
      courseId,
      studentId,
      teacherId
    );

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch student details' });
  }
};
