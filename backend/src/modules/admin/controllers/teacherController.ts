import { Request, Response } from 'express';
import * as teacherService from '../services/teacherService';

export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    const teachers = await teacherService.getAllTeachers();
    res.json({ teachers });
  } catch (error: any) {
    console.error('Error in getAllTeachers:', error);
    res.status(500).json({ error: error.message });
  }
};
