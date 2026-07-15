import { Request, Response } from 'express';
import * as courseService from '../services/courseService';
import { getErrorMessage } from '../../../utils/errors';

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    console.log('[CourseController] getAllCourses called');
    const courses = await courseService.getAllCourses();
    console.log('[CourseController] Returning', courses.length, 'courses');
    res.json(courses);
  } catch (error: unknown) {
    console.error('[CourseController] Error:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getPendingCourses = async (req: Request, res: Response) => {
  try {
    const courses = await courseService.getPendingCourses();
    res.json(courses);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const approveCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await courseService.updateCourseStatus(id, 'approved');
    res.json(course);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const rejectCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await courseService.updateCourseStatus(id, 'rejected');
    res.json(course);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await courseService.deleteCourse(id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const addCoTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }
    
    const result = await courseService.addCoTeacher(id, teacherId);
    res.json(result);
  } catch (error: unknown) {
    console.error('Error adding co-teacher:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const removeCoTeacher = async (req: Request, res: Response) => {
  try {
    const { id, teacherId } = req.params;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }
    
    const result = await courseService.removeCoTeacher(id, teacherId);
    res.json({ message: 'Co-teacher removed successfully', result });
  } catch (error: unknown) {
    console.error('Error removing co-teacher:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const updateCoursePrice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    
    if (price === undefined || price === null) {
      return res.status(400).json({ error: 'Price is required' });
    }
    
    const result = await courseService.updateCoursePrice(id, price);
    res.json(result);
  } catch (error: unknown) {
    console.error('Error updating course price:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
