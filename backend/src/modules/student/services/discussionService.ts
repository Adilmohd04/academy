import { supabase } from '../../../config/database';

export interface CourseDiscussion {
  id: string;
  course_id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  content: string;
  parent_id?: string;
  attachments?: string[];
  created_at: string;
}

export interface CreatePostInput {
  course_id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  content: string;
  attachments?: string[];
}

export interface CreateReplyInput {
  course_id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  content: string;
  parent_id: string;
  attachments?: string[];
}

/**
 * Create a discussion post
 */
export const createPost = async (data: CreatePostInput): Promise<CourseDiscussion> => {
  const { data: post, error } = await supabase
    .from('course_discussions')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create post: ${error.message}`);
  return post;
};

/**
 * Reply to a post
 */
export const createReply = async (data: CreateReplyInput): Promise<CourseDiscussion> => {
  const { data: reply, error } = await supabase
    .from('course_discussions')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create reply: ${error.message}`);
  return reply;
};

/**
 * Get discussion posts for a course (with replies)
 */
export const getCourseDiscussions = async (courseId: string): Promise<any[]> => {
  // Get all posts (parent_id is null)
  const { data: posts, error: postsError } = await supabase
    .from('course_discussions')
    .select('*')
    .eq('course_id', courseId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  if (postsError) throw new Error(`Failed to fetch posts: ${postsError.message}`);

  // Get all replies
  const { data: replies, error: repliesError } = await supabase
    .from('course_discussions')
    .select('*')
    .eq('course_id', courseId)
    .not('parent_id', 'is', null)
    .order('created_at', { ascending: true });

  if (repliesError) throw new Error(`Failed to fetch replies: ${repliesError.message}`);

  // Attach replies to posts
  const postsWithReplies = (posts || []).map((post) => ({
    ...post,
    replies: (replies || []).filter((reply) => reply.parent_id === post.id),
  }));

  return postsWithReplies;
};

/**
 * Delete post/reply
 */
export const deleteDiscussion = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('course_discussions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete discussion: ${error.message}`);
};
