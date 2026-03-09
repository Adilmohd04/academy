/**
 * Leaderboard Routes
 * 
 * Routes for leaderboard functionality:
 * - Weekly leaderboard (during live courses)
 * - Course overall leaderboard
 * - Student rankings
 * - Live class attendance
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as leaderboardController from '../modules/shared/controllers/leaderboardController';

const router = express.Router();

// Public routes (for viewing leaderboards - may require course enrollment)
const authRequired = [requireAuth];
const teacherAuth = [requireAuth, requireRole(['teacher', 'admin'])];

// ==========================================
// WEEKLY LEADERBOARD
// ==========================================

// Get weekly leaderboard
router.get('/courses/:courseId/weeks/:weekId/leaderboard', 
  ...authRequired, 
  leaderboardController.getWeeklyLeaderboard
);

// Get weekly top 5 (for live class display)
router.get('/courses/:courseId/weeks/:weekId/leaderboard/top5', 
  ...authRequired, 
  leaderboardController.getWeeklyTop5
);

// Get student's weekly rank
router.get('/courses/:courseId/weeks/:weekId/my-rank', 
  ...authRequired, 
  leaderboardController.getStudentWeeklyRank
);

// Refresh weekly leaderboard (teacher/admin only)
router.post('/courses/:courseId/weeks/:weekId/leaderboard/refresh', 
  ...teacherAuth, 
  leaderboardController.refreshWeeklyLeaderboard
);

// ==========================================
// COURSE LEADERBOARD (OVERALL)
// ==========================================

// Get course leaderboard
router.get('/courses/:courseId/leaderboard', 
  ...authRequired, 
  leaderboardController.getCourseLeaderboard
);

// Get course top 5
router.get('/courses/:courseId/leaderboard/top5', 
  ...authRequired, 
  leaderboardController.getCourseTop5
);

// Get student's course rank
router.get('/courses/:courseId/my-rank', 
  ...authRequired, 
  leaderboardController.getStudentCourseRank
);

// Refresh course leaderboard (teacher/admin only)
router.post('/courses/:courseId/leaderboard/refresh', 
  ...teacherAuth, 
  leaderboardController.refreshCourseLeaderboard
);

// Get leaderboard summary (top 5 overall + weekly)
router.get('/courses/:courseId/leaderboard/summary', 
  ...authRequired, 
  leaderboardController.getLeaderboardSummary
);

// ==========================================
// LIVE CLASS ATTENDANCE
// ==========================================

// Record joining live class
router.post('/live-class/:scheduleId/join', 
  ...authRequired, 
  leaderboardController.joinLiveClass
);

// Record leaving live class
router.post('/live-class/:scheduleId/leave', 
  ...authRequired, 
  leaderboardController.leaveLiveClass
);

export default router;
