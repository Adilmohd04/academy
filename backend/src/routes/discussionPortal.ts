/**
 * Discussion Portal Routes
 * 
 * Routes for course discussions where:
 * - Students can post queries
 * - Teachers and students can respond
 * - Everyone can see and interact
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as discussionController from '../modules/shared/controllers/discussionPortalController';
import * as mentionController from '../modules/shared/controllers/discussionMentionController';

const router = express.Router();

const authRequired = [requireAuth];
const teacherAuth = [requireAuth, requireRole(['teacher', 'admin'])];

// ==========================================
// DISCUSSIONS (QUERIES)
// ==========================================

// Create a new discussion/query
router.post('/courses/:courseId/discussions', ...authRequired, discussionController.createDiscussion);

// Get all discussions for a course
router.get('/courses/:courseId/discussions', ...authRequired, discussionController.getCourseDiscussions);

// Get a single discussion with replies
router.get('/discussions/:discussionId', ...authRequired, discussionController.getDiscussion);

// Update a discussion (author only)
router.put('/discussions/:discussionId', ...authRequired, discussionController.updateDiscussion);

// Delete a discussion (author within 1 hour, or admin anytime)
router.delete('/discussions/:discussionId', ...authRequired, discussionController.deleteDiscussion);

// Upvote a discussion
router.post('/discussions/:discussionId/upvote', ...authRequired, discussionController.upvoteDiscussion);

// Pin/unpin discussion (teacher/admin only)
router.post('/discussions/:discussionId/pin', ...teacherAuth, discussionController.togglePin);

// ==========================================
// REPLIES
// ==========================================

// Create a reply
router.post('/discussions/:discussionId/replies', ...authRequired, discussionController.createReply);

// Update a reply (author only)
router.put('/replies/:replyId', ...authRequired, discussionController.updateReply);

// Delete a reply (author within 1 hour, or admin anytime)
router.delete('/replies/:replyId', ...authRequired, discussionController.deleteReply);

// Upvote a reply
router.post('/replies/:replyId/upvote', ...authRequired, discussionController.upvoteReply);

// Mark reply as accepted answer
router.post('/discussions/:discussionId/replies/:replyId/accept', ...authRequired, discussionController.markAcceptedAnswer);

// ==========================================
// @MENTION AUTOCOMPLETE
// ==========================================

// Get enrolled students for @mention autocomplete
router.get('/courses/:courseId/mention/students', ...authRequired, mentionController.getEnrolledStudentsForMention);

// Get teachers for @mention autocomplete
router.get('/courses/:courseId/mention/teachers', ...authRequired, mentionController.getCourseTeachersForMention);

// ==========================================
// NOTIFICATIONS
// ==========================================

// Get user's discussion notifications
router.get('/discussion-notifications', ...authRequired, discussionController.getNotifications);

// Mark notifications as read
router.post('/discussion-notifications/read', ...authRequired, discussionController.markNotificationsRead);

export default router;
