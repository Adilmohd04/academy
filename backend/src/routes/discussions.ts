import express from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as discussionController from '../modules/shared/controllers/discussionController';

const router = express.Router();

// Get all discussions for a course
router.get(
  '/courses/:courseId/discussions',
  requireAuth,
  discussionController.getCourseDiscussions
);

// Create new discussion
router.post(
  '/courses/:courseId/discussions',
  requireAuth,
  discussionController.createDiscussion
);

// Get replies for a discussion
router.get(
  '/discussions/:discussionId/replies',
  requireAuth,
  discussionController.getDiscussionReplies
);

// Create reply to discussion
router.post(
  '/discussions/:discussionId/replies',
  requireAuth,
  discussionController.createReply
);

// Upvote a discussion or reply (legacy)
router.post(
  '/discussions/:discussionId/upvote',
  requireAuth,
  discussionController.upvoteDiscussion
);

// Vote on a discussion or reply (up/down)
router.post(
  '/discussions/:discussionId/vote',
  requireAuth,
  discussionController.voteDiscussion
);

// Edit a discussion or reply
router.put(
  '/discussions/:discussionId',
  requireAuth,
  discussionController.editDiscussion
);

// Delete discussion or reply
router.delete(
  '/discussions/:discussionId',
  requireAuth,
  discussionController.deleteDiscussion
);

// Pin/unpin discussion
router.post(
  '/discussions/:discussionId/pin',
  requireAuth,
  discussionController.pinDiscussion
);

export default router;
