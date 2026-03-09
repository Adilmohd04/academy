import { Request, Response } from 'express';
import * as discussionService from '../services/discussionService';

export const getCourseDiscussions = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    const discussions = await discussionService.getCourseDiscussions(courseId, userId);

    res.json({ data: discussions });
  } catch (error: any) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch discussions' });
  }
};

export const createDiscussion = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, content } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const discussion = await discussionService.createDiscussion(
      courseId,
      userId,
      title,
      content
    );

    res.status(201).json(discussion);
  } catch (error: any) {
    console.error('Error creating discussion:', error);
    res.status(500).json({ error: error.message || 'Failed to create discussion' });
  }
};

export const getDiscussionReplies = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;

    const replies = await discussionService.getDiscussionReplies(discussionId);

    res.json(replies);
  } catch (error: any) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch replies' });
  }
};

export const createReply = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    const { content } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const reply = await discussionService.createReply(discussionId, userId, content);

    res.status(201).json(reply);
  } catch (error: any) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: error.message || 'Failed to create reply' });
  }
};

export const voteDiscussion = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    const { type, vote_type } = req.body; // support both 'type' and 'vote_type'
    const voteType = type || vote_type;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!voteType || !['up', 'down'].includes(voteType)) {
      return res.status(400).json({ error: 'Vote type must be "up" or "down"' });
    }

    await discussionService.voteDiscussion(discussionId, userId, voteType);

    res.json({ message: 'Vote recorded successfully' });
  } catch (error: any) {
    console.error('Error voting on discussion:', error);
    res.status(500).json({ error: error.message || 'Failed to vote on discussion' });
  }
};

// Keep for backwards compatibility
export const upvoteDiscussion = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await discussionService.voteDiscussion(discussionId, userId, 'up');

    res.json({ message: 'Upvoted successfully' });
  } catch (error: any) {
    console.error('Error upvoting discussion:', error);
    res.status(500).json({ error: error.message || 'Failed to upvote discussion' });
  }
};

export const editDiscussion = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    const { content, title } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await discussionService.editDiscussion(discussionId, userId, content, title);

    res.json(result);
  } catch (error: any) {
    console.error('Error editing discussion:', error);
    res.status(500).json({ error: error.message || 'Failed to edit discussion' });
  }
};

export const deleteDiscussion = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await discussionService.deleteDiscussion(discussionId, userId);

    res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting discussion:', error);
    res.status(500).json({ error: error.message || 'Failed to delete discussion' });
  }
};

export const pinDiscussion = async (req: Request, res: Response) => {
  try {
    const { discussionId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await discussionService.updateDiscussion(
      discussionId,
      userId,
      { is_pinned: req.body.is_pinned },
      true
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error pinning discussion:', error);
    res.status(500).json({ error: error.message || 'Failed to pin discussion' });
  }
};
