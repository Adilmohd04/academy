/**
 * Discussion/Query Portal Service
 * 
 * Handles:
 * - Students posting queries
 * - Teachers and students responding
 * - Everyone can see and interact
 * - Upvotes and accepted answers
 * 
 * Uses Supabase client for all database operations.
 */

import { supabase } from '../../../config/database';

interface CreateDiscussionData {
  course_id: string;
  week_id?: string;
  lesson_id?: string;
  author_id: string;
  author_role: 'student' | 'teacher' | 'admin';
  title: string;
  content: string;
  discussion_type?: 'question' | 'discussion' | 'announcement' | 'feedback';
}

interface CreateReplyData {
  discussion_id: string;
  parent_reply_id?: string;
  author_id: string;
  author_role: 'student' | 'teacher' | 'admin';
  content: string;
}

interface Discussion {
  id: string;
  course_id: string;
  week_id?: string;
  lesson_id?: string;
  author_id: string;
  author_role: string;
  author_name?: string;
  author_avatar?: string;
  title: string;
  content: string;
  discussion_type: string;
  status: string;
  is_pinned: boolean;
  is_resolved: boolean;
  upvotes: number;
  view_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

interface Reply {
  id: string;
  discussion_id: string;
  parent_reply_id?: string;
  author_id: string;
  author_role: string;
  author_name?: string;
  author_avatar?: string;
  content: string;
  is_accepted_answer: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

/**
 * Extract @mentions from text content
 */
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)];
};

/**
 * Resolve usernames to user IDs using profiles table
 */
const resolveUsernameToUserId = async (username: string): Promise<string | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('clerk_user_id')
    .ilike('full_name', `%${username}%`)
    .limit(1);
  
  return data?.[0]?.clerk_user_id || null;
};

/**
 * Helper: Enrich records with author info from profiles table
 */
async function enrichWithAuthorInfo(records: any[], authorIdField: string = 'author_id'): Promise<any[]> {
  if (!records || records.length === 0) return [];
  
  const authorIds = [...new Set(records.map(r => r[authorIdField]).filter(Boolean))];
  if (authorIds.length === 0) return records;
  
  // Fetch profiles by clerk_user_id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('clerk_user_id, full_name, email')
    .in('clerk_user_id', authorIds);
  
  const profilesMap: Record<string, any> = {};
  if (profiles) {
    profiles.forEach(p => { profilesMap[p.clerk_user_id] = p; });
  }
  
  return records.map(r => ({
    ...r,
    author_name: profilesMap[r[authorIdField]]?.full_name || null,
    author_avatar: null, // No avatar column in profiles table
  }));
}

/**
 * Create a new discussion/query
 */
export const createDiscussion = async (data: CreateDiscussionData): Promise<Discussion> => {
  // Extract @mentions from content
  const mentionedUsernames = extractMentions(data.content);
  const mentionedUserIds: string[] = [];
  
  for (const username of mentionedUsernames) {
    const userId = await resolveUsernameToUserId(username);
    if (userId && userId !== data.author_id) {
      mentionedUserIds.push(userId);
    }
  }
  
  const { data: result, error } = await supabase
    .from('course_discussions')
    .insert({
      course_id: data.course_id,
      week_id: data.week_id || null,
      lesson_id: data.lesson_id || null,
      author_id: data.author_id,
      author_role: data.author_role,
      title: data.title,
      content: data.content,
      discussion_type: data.discussion_type || 'question',
      mentioned_users: JSON.stringify(mentionedUserIds),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create notifications for mentioned users
  for (const mentionedUserId of mentionedUserIds) {
    await supabase
      .from('discussion_notifications')
      .insert({
        user_id: mentionedUserId,
        discussion_id: result.id,
        notification_type: 'mention',
      });
  }
  
  return result;
};

/**
 * Get all discussions for a course
 */
export const getCourseDiscussions = async (
  courseId: string,
  options: {
    weekId?: string;
    lessonId?: string;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ discussions: Discussion[]; total: number }> => {
  // Build query for count
  let countQuery = supabase
    .from('course_discussions')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);
  
  // Build query for data
  let dataQuery = supabase
    .from('course_discussions')
    .select('*', { count: 'exact' })
    .eq('course_id', courseId);
  
  if (options.weekId) {
    countQuery = countQuery.eq('week_id', options.weekId);
    dataQuery = dataQuery.eq('week_id', options.weekId);
  }
  if (options.lessonId) {
    countQuery = countQuery.eq('lesson_id', options.lessonId);
    dataQuery = dataQuery.eq('lesson_id', options.lessonId);
  }
  if (options.status) {
    countQuery = countQuery.eq('status', options.status);
    dataQuery = dataQuery.eq('status', options.status);
  }
  if (options.type) {
    countQuery = countQuery.eq('discussion_type', options.type);
    dataQuery = dataQuery.eq('discussion_type', options.type);
  }
  
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  
  dataQuery = dataQuery
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
  
  if (dataResult.error) throw dataResult.error;
  
  // Enrich with author info
  const enriched = await enrichWithAuthorInfo(dataResult.data || []);
  
  return {
    discussions: enriched,
    total: countResult.count || 0,
  };
};

/**
 * Get a single discussion with replies
 */
export const getDiscussionWithReplies = async (discussionId: string): Promise<{
  discussion: Discussion;
  replies: Reply[];
}> => {
  // Increment view count - fetch current then update
  const { data: currentDisc } = await supabase
    .from('course_discussions')
    .select('view_count')
    .eq('id', discussionId)
    .single();
  
  if (currentDisc) {
    await supabase
      .from('course_discussions')
      .update({ view_count: (currentDisc.view_count || 0) + 1 })
      .eq('id', discussionId);
  }
  
  // Get discussion
  const { data: discussion, error: discError } = await supabase
    .from('course_discussions')
    .select('*')
    .eq('id', discussionId)
    .single();
  
  if (discError || !discussion) {
    throw new Error('Discussion not found');
  }
  
  // Get replies
  const { data: replies, error: repliesError } = await supabase
    .from('discussion_replies')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('is_accepted_answer', { ascending: false })
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: true });
  
  if (repliesError) throw repliesError;
  
  // Enrich with author info
  const [enrichedDiscussions, enrichedReplies] = await Promise.all([
    enrichWithAuthorInfo([discussion]),
    enrichWithAuthorInfo(replies || []),
  ]);
  
  return {
    discussion: enrichedDiscussions[0],
    replies: enrichedReplies,
  };
};

/**
 * Create a reply to a discussion
 */
export const createReply = async (data: CreateReplyData): Promise<Reply> => {
  // Extract @mentions from content
  const mentionedUsernames = extractMentions(data.content);
  const mentionedUserIds: string[] = [];
  
  for (const username of mentionedUsernames) {
    const userId = await resolveUsernameToUserId(username);
    if (userId && userId !== data.author_id) {
      mentionedUserIds.push(userId);
    }
  }
  
  const { data: result, error } = await supabase
    .from('discussion_replies')
    .insert({
      discussion_id: data.discussion_id,
      parent_reply_id: data.parent_reply_id || null,
      author_id: data.author_id,
      author_role: data.author_role,
      content: data.content,
      mentioned_users: JSON.stringify(mentionedUserIds),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create notification for discussion author (if not the replier)
  const { data: discussion } = await supabase
    .from('course_discussions')
    .select('author_id, reply_count')
    .eq('id', data.discussion_id)
    .single();
  
  if (discussion && discussion.author_id !== data.author_id) {
    await supabase
      .from('discussion_notifications')
      .insert({
        user_id: discussion.author_id,
        discussion_id: data.discussion_id,
        reply_id: result.id,
        notification_type: 'new_reply',
      });
  }
  
  // Create notifications for mentioned users
  for (const mentionedUserId of mentionedUserIds) {
    await supabase
      .from('discussion_notifications')
      .insert({
        user_id: mentionedUserId,
        discussion_id: data.discussion_id,
        reply_id: result.id,
        notification_type: 'mention',
      });
  }
  
  // Increment reply_count on discussion
  if (discussion) {
    await supabase
      .from('course_discussions')
      .update({ reply_count: (discussion.reply_count || 0) + 1 })
      .eq('id', data.discussion_id);
  }
  
  return result;
};

/**
 * Update a discussion
 */
export const updateDiscussion = async (
  discussionId: string,
  authorId: string,
  updates: { title?: string; content?: string }
): Promise<Discussion> => {
  // Verify ownership
  const { data: existing } = await supabase
    .from('course_discussions')
    .select('author_id')
    .eq('id', discussionId)
    .single();
  
  if (!existing) throw new Error('Discussion not found');
  if (existing.author_id !== authorId) throw new Error('Not authorized to edit this discussion');
  
  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  
  const { data: result, error } = await supabase
    .from('course_discussions')
    .update(updateData)
    .eq('id', discussionId)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

/**
 * Update a reply
 */
export const updateReply = async (
  replyId: string,
  authorId: string,
  content: string
): Promise<Reply> => {
  // Verify ownership
  const { data: existing } = await supabase
    .from('discussion_replies')
    .select('author_id')
    .eq('id', replyId)
    .single();
  
  if (!existing) throw new Error('Reply not found');
  if (existing.author_id !== authorId) throw new Error('Not authorized to edit this reply');
  
  const { data: result, error } = await supabase
    .from('discussion_replies')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', replyId)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

/**
 * Delete a discussion (author or admin only)
 * Students can only delete within 1 hour
 */
export const deleteDiscussion = async (
  discussionId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> => {
  const { data: existing } = await supabase
    .from('course_discussions')
    .select('author_id, created_at')
    .eq('id', discussionId)
    .single();
  
  if (!existing) throw new Error('Discussion not found');
  if (existing.author_id !== userId && !isAdmin) throw new Error('Not authorized to delete this discussion');
  
  if (!isAdmin) {
    const createdAt = new Date(existing.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
    
    if (diffMinutes > 60) {
      throw new Error(`Cannot delete discussion after 1 hour. Created ${Math.floor(diffMinutes)} minutes ago.`);
    }
  }
  
  const { error } = await supabase
    .from('course_discussions')
    .delete()
    .eq('id', discussionId);
  
  if (error) throw error;
};

/**
 * Delete a reply (author or admin only)
 * Students can only delete within 1 hour
 */
export const deleteReply = async (
  replyId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> => {
  const { data: existing } = await supabase
    .from('discussion_replies')
    .select('author_id, created_at')
    .eq('id', replyId)
    .single();
  
  if (!existing) throw new Error('Reply not found');
  if (existing.author_id !== userId && !isAdmin) throw new Error('Not authorized to delete this reply');
  
  if (!isAdmin) {
    const createdAt = new Date(existing.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
    
    if (diffMinutes > 60) {
      throw new Error(`Cannot delete reply after 1 hour. Created ${Math.floor(diffMinutes)} minutes ago.`);
    }
  }
  
  const { error } = await supabase
    .from('discussion_replies')
    .delete()
    .eq('id', replyId);
  
  if (error) throw error;
};

/**
 * Upvote a discussion
 */
export const upvoteDiscussion = async (
  discussionId: string,
  userId: string
): Promise<{ upvotes: number; action: 'added' | 'removed' }> => {
  // Check if already upvoted
  const { data: existing } = await supabase
    .from('discussion_upvotes')
    .select('id')
    .eq('user_id', userId)
    .eq('discussion_id', discussionId)
    .maybeSingle();
  
  if (existing) {
    // Remove upvote
    await supabase
      .from('discussion_upvotes')
      .delete()
      .eq('user_id', userId)
      .eq('discussion_id', discussionId);
    
    // Get current upvotes and decrement
    const { data: disc } = await supabase
      .from('course_discussions')
      .select('upvotes')
      .eq('id', discussionId)
      .single();
    
    const newUpvotes = Math.max(0, (disc?.upvotes || 1) - 1);
    await supabase
      .from('course_discussions')
      .update({ upvotes: newUpvotes })
      .eq('id', discussionId);
    
    return { upvotes: newUpvotes, action: 'removed' };
  } else {
    // Add upvote
    await supabase
      .from('discussion_upvotes')
      .insert({ user_id: userId, discussion_id: discussionId });
    
    const { data: disc } = await supabase
      .from('course_discussions')
      .select('upvotes')
      .eq('id', discussionId)
      .single();
    
    const newUpvotes = (disc?.upvotes || 0) + 1;
    await supabase
      .from('course_discussions')
      .update({ upvotes: newUpvotes })
      .eq('id', discussionId);
    
    return { upvotes: newUpvotes, action: 'added' };
  }
};

/**
 * Upvote a reply
 */
export const upvoteReply = async (
  replyId: string,
  userId: string
): Promise<{ upvotes: number; action: 'added' | 'removed' }> => {
  const { data: existing } = await supabase
    .from('discussion_upvotes')
    .select('id')
    .eq('user_id', userId)
    .eq('reply_id', replyId)
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from('discussion_upvotes')
      .delete()
      .eq('user_id', userId)
      .eq('reply_id', replyId);
    
    const { data: reply } = await supabase
      .from('discussion_replies')
      .select('upvotes')
      .eq('id', replyId)
      .single();
    
    const newUpvotes = Math.max(0, (reply?.upvotes || 1) - 1);
    await supabase
      .from('discussion_replies')
      .update({ upvotes: newUpvotes })
      .eq('id', replyId);
    
    return { upvotes: newUpvotes, action: 'removed' };
  } else {
    await supabase
      .from('discussion_upvotes')
      .insert({ user_id: userId, reply_id: replyId });
    
    const { data: reply } = await supabase
      .from('discussion_replies')
      .select('upvotes')
      .eq('id', replyId)
      .single();
    
    const newUpvotes = (reply?.upvotes || 0) + 1;
    await supabase
      .from('discussion_replies')
      .update({ upvotes: newUpvotes })
      .eq('id', replyId);
    
    return { upvotes: newUpvotes, action: 'added' };
  }
};

/**
 * Mark reply as accepted answer (discussion author or teacher only)
 */
export const markAcceptedAnswer = async (
  replyId: string,
  discussionId: string,
  userId: string,
  isTeacher: boolean = false
): Promise<void> => {
  // Verify permission
  const { data: discussion } = await supabase
    .from('course_discussions')
    .select('author_id')
    .eq('id', discussionId)
    .single();
  
  if (!isTeacher && discussion?.author_id !== userId) {
    throw new Error('Not authorized to mark accepted answer');
  }
  
  // Unmark any existing accepted answer
  await supabase
    .from('discussion_replies')
    .update({ is_accepted_answer: false })
    .eq('discussion_id', discussionId);
  
  // Mark new accepted answer
  await supabase
    .from('discussion_replies')
    .update({ is_accepted_answer: true })
    .eq('id', replyId);
  
  // Update discussion status
  await supabase
    .from('course_discussions')
    .update({
      status: 'answered',
      is_resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', discussionId);
};

/**
 * Pin/unpin discussion (teacher/admin only)
 */
export const togglePinDiscussion = async (
  discussionId: string,
  isPinned: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('course_discussions')
    .update({ is_pinned: isPinned })
    .eq('id', discussionId);
  
  if (error) throw error;
};

/**
 * Get user's notifications
 */
export const getUserNotifications = async (
  userId: string,
  unreadOnly: boolean = false
): Promise<any[]> => {
  let query = supabase
    .from('discussion_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (unreadOnly) {
    query = query.eq('is_read', false);
  }
  
  const { data: notifications, error } = await query;
  
  if (error) throw error;
  if (!notifications || notifications.length === 0) return [];
  
  // Enrich with discussion titles and reply previews
  const discussionIds = [...new Set(notifications.map(n => n.discussion_id).filter(Boolean))];
  const replyIds = [...new Set(notifications.map(n => n.reply_id).filter(Boolean))];
  
  let discussionsMap: Record<string, any> = {};
  if (discussionIds.length > 0) {
    const { data: discussions } = await supabase
      .from('course_discussions')
      .select('id, title')
      .in('id', discussionIds);
    if (discussions) {
      discussions.forEach(d => { discussionsMap[d.id] = d; });
    }
  }
  
  let repliesMap: Record<string, any> = {};
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('discussion_replies')
      .select('id, content')
      .in('id', replyIds);
    if (replies) {
      replies.forEach(r => { repliesMap[r.id] = r; });
    }
  }
  
  return notifications.map(n => ({
    ...n,
    discussion_title: discussionsMap[n.discussion_id]?.title || null,
    reply_preview: repliesMap[n.reply_id]?.content || null,
  }));
};

/**
 * Mark notifications as read
 */
export const markNotificationsRead = async (
  userId: string,
  notificationIds?: string[]
): Promise<void> => {
  if (notificationIds && notificationIds.length > 0) {
    const { error } = await supabase
      .from('discussion_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', notificationIds);
    
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('discussion_notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
    
    if (error) throw error;
  }
};
