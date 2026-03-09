import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';

export const getStudentDashboard = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = await dashboardService.getStudentDashboard(studentId);

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
  }
};
