import { Request, Response } from 'express';
import * as liveSessionService from '../services/liveSessionService';

export const getLessonLiveSession = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const session = await liveSessionService.getLessonLiveSession(lessonId);

    res.json(session);
  } catch (error: any) {
    console.error('Error fetching live session:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch live session' });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await liveSessionService.markSessionAttendance(sessionId, studentId);

    res.json({ message: 'Attendance marked successfully' });
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: error.message || 'Failed to mark attendance' });
  }
};

export const getCourseLiveSessions = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await liveSessionService.getCourseLiveSessions(courseId, studentId);

    res.json(sessions);
  } catch (error: any) {
    console.error('Error fetching live sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch live sessions' });
  }
};
