import { Request, Response } from 'express';
import * as assignmentManagementService from '../services/assignmentManagementService';

export const getSubmissions = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const submissions = await assignmentManagementService.getAssignmentSubmissions(
      assignmentId,
      teacherId
    );

    res.json(submissions);
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
};

export const bulkGrade = async (req: Request, res: Response) => {
  try {
    const { grades } = req.body; // Array of { id, score, feedback }
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(grades)) {
      return res.status(400).json({ error: 'Grades must be an array' });
    }

    await assignmentManagementService.bulkGradeAssignments(grades, teacherId);

    res.json({ message: 'Assignments graded successfully' });
  } catch (error: any) {
    console.error('Error bulk grading:', error);
    res.status(500).json({ error: error.message || 'Failed to grade assignments' });
  }
};

export const exportGrades = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const csv = await assignmentManagementService.getAssignmentGradesCSV(
      assignmentId,
      teacherId
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=grades-${assignmentId}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting grades:', error);
    res.status(500).json({ error: error.message || 'Failed to export grades' });
  }
};
