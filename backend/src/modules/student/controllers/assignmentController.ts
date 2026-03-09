import { Request, Response } from 'express';
import * as assignmentService from '../services/assignmentService';

export const getAssignment = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = await assignmentService.getAssignmentByLesson(lessonId, studentId);

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignment' });
  }
};

export const submitAssignment = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { textSubmission, linkUrl } = req.body;
    const studentId = req.auth?.userId;
    const file = (req as any).file;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!file && !textSubmission && !linkUrl) {
      return res.status(400).json({ error: 'Please provide a file, link, or text submission' });
    }

    const submission = await assignmentService.submitAssignment(
      lessonId,
      studentId,
      file,
      textSubmission,
      linkUrl
    );

    res.json({ submission });
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to submit assignment' });
  }
};

export const getSubmissions = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;

    const submissions = await assignmentService.getSubmissionsByAssignment(assignmentId);

    res.json(submissions);
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
};

export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback, status } = req.body;

    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }

    await assignmentService.gradeSubmission(submissionId, score, feedback, status);

    res.json({ message: 'Submission graded successfully' });
  } catch (error: any) {
    console.error('Error grading submission:', error);
    res.status(500).json({ error: error.message || 'Failed to grade submission' });
  }
};
