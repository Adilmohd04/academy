import { supabase } from '../../../config/database';

export interface Discussion {
  id: string;
  course_id: string;
  title: string;
  content: string;
  created_at: string;
  author_name: string;
  author_role: string;
  author_clerk_id: string;
  is_pinned: boolean;
  reply_count: number;
  upvotes: number;
  downvotes: number;
  user_vote?: 'up' | 'down' | null;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_role: string;
  author_clerk_id: string;
  upvotes: number;
  downvotes: number;
  user_vote?: 'up' | 'down' | null;
}

export const getCourseDiscussions = async (
  courseId: string,
  userId?: string
): Promise<Discussion[]> => {
  const { data, error } = await supabase
    .from('course_discussions')
    .select('*')
    .eq('course_id', courseId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch all discussions with user data, replies, and votes
  const discussionsWithUsers = await Promise.all(
    (data || []).map(async (row: any) => {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, clerk_user_id')
        .eq('clerk_user_id', row.user_id)
        .single();

      // Get reply count
      const { count: replyCount } = await supabase
        .from('discussion_replies')
        .select('*', { count: 'exact', head: true })
        .eq('discussion_id', row.id);

      // Get votes
      const { data: votes } = await supabase
        .from('discussion_votes')
        .select('vote_type, user_id')
        .eq('discussion_id', row.id);

      const upvotes = (votes || []).filter(v => v.vote_type === 'up').length;
      const downvotes = (votes || []).filter(v => v.vote_type === 'down').length;
      const userVote = userId ? (votes || []).find(v => v.user_id === userId)?.vote_type : null;

      // Get replies with their votes
      const { data: replies } = await supabase
        .from('discussion_replies')
        .select('*')
        .eq('discussion_id', row.id)
        .order('created_at', { ascending: true });

      const repliesWithData = await Promise.all(
        (replies || []).map(async (reply: any) => {
          const { data: replyProfile } = await supabase
            .from('profiles')
            .select('full_name, role, clerk_user_id')
            .eq('clerk_user_id', reply.user_id)
            .single();

          const { data: replyVotes } = await supabase
            .from('discussion_votes')
            .select('vote_type, user_id')
            .eq('discussion_id', reply.id);

          const replyUpvotes = (replyVotes || []).filter(v => v.vote_type === 'up').length;
          const replyDownvotes = (replyVotes || []).filter(v => v.vote_type === 'down').length;
          const replyUserVote = userId ? (replyVotes || []).find(v => v.user_id === userId)?.vote_type : null;

          return {
            id: reply.id,
            content: reply.content,
            created_at: reply.created_at,
            author_name: replyProfile ? replyProfile.full_name : 'Unknown',
            author_role: replyProfile?.role || 'student',
            author_clerk_id: reply.user_id,
            upvotes: replyUpvotes,
            downvotes: replyDownvotes,
            user_vote: replyUserVote
          };
        })
      );

      return {
        id: row.id,
        course_id: row.course_id,
        title: row.title,
        content: row.content,
        created_at: row.created_at,
        author_name: profile ? profile.full_name : 'Unknown',
        author_role: profile?.role || 'student',
        author_clerk_id: row.user_id,
        is_pinned: row.is_pinned || false,
        reply_count: replyCount || 0,
        upvotes,
        downvotes,
        user_vote: userVote,
        replies: repliesWithData
      };
    })
  );

  return discussionsWithUsers;
};

export const createDiscussion = async (
  courseId: string,
  userId: string,
  title: string,
  content: string
): Promise<Discussion> => {
  // Verify user is enrolled or is the teacher - simple direct check
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', userId)
    .maybeSingle();
  
  const { data: course } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('id', courseId)
    .single();
  
  if (!course) {
    throw new Error('Course not found');
  }

  // Check if user is the teacher (need to get profile ID from clerk_user_id)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  const isTeacher = userProfile && course.teacher_id === userProfile.id;
  
  if (!enrollment && !isTeacher) {
    throw new Error('Not authorized to post in this course');
  }

  // Insert discussion
  const { data, error } = await supabase
    .from('course_discussions')
    .insert({
      course_id: courseId,
      user_id: userId,
      title,
      content
    })
    .select('*')
    .single();

  if (error) throw error;

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('clerk_user_id', userId)
    .single();

  return {
    id: data.id,
    course_id: data.course_id,
    title: data.title,
    content: data.content,
    created_at: data.created_at,
    author_name: profile ? profile.full_name : 'Unknown',
    author_role: profile?.role || 'student',
    author_clerk_id: data.user_id,
    is_pinned: data.is_pinned || false,
    reply_count: 0,
    upvotes: 0,
    downvotes: 0
  };
};

export const getDiscussionReplies = async (
  discussionId: string
): Promise<Reply[]> => {
  const { data, error } = await supabase
    .from('discussion_replies')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching discussion replies:', error);
    return [];
  }

  // Manually fetch profile data for each reply
  const repliesWithProfiles = await Promise.all(
    (data || []).map(async (row: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('clerk_user_id', row.user_id)
        .single();

      return {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        author_name: profile ? profile.full_name : 'Unknown User',
        author_role: profile?.role || 'student',
        author_clerk_id: row.user_id,
        upvotes: 0,
        downvotes: 0
      };
    })
  );

  return repliesWithProfiles;
};

export const createReply = async (
  discussionId: string,
  userId: string,
  content: string
): Promise<Reply> => {
  // Verify user has access to the discussion
  const { data: discussion } = await supabase
    .from('course_discussions')
    .select('course_id')
    .eq('id', discussionId)
    .single();

  if (!discussion) {
    throw new Error('Discussion not found');
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', discussion.course_id)
    .eq('student_id', userId)
    .maybeSingle();
  
  // Check if user is the teacher (teacher_id is profile UUID, userId is clerk ID)
  let isTeacher = false;
  if (!enrollment) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle();
    if (userProfile) {
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', discussion.course_id)
        .eq('teacher_id', userProfile.id)
        .maybeSingle();
      isTeacher = !!course;
    }
  }
  
  if (!enrollment && !isTeacher) {
    throw new Error('Not authorized to reply to this discussion');
  }

  // Insert reply
  const { data, error } = await supabase
    .from('discussion_replies')
    .insert({
      discussion_id: discussionId,
      user_id: userId,
      content
    })
    .select('*')
    .single();

  if (error) throw error;

  // Fetch profile data manually
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('clerk_user_id', userId)
    .single();

  return {
    id: data.id,
    content: data.content,
    created_at: data.created_at,
    author_name: profile ? profile.full_name : 'Unknown User',
    author_role: profile?.role || 'student',
    author_clerk_id: data.user_id,
    upvotes: 0,
    downvotes: 0
  };
};

export const upvoteDiscussion = async (
  discussionId: string,
  userId: string
): Promise<void> => {
  // Check if already upvoted
  const { data: existingVote } = await supabase
    .from('discussion_upvotes')
    .select('id')
    .eq('discussion_id', discussionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingVote) {
    // Remove upvote (toggle off)
    await supabase
      .from('discussion_upvotes')
      .delete()
      .eq('discussion_id', discussionId)
      .eq('user_id', userId);
  } else {
    // Add upvote
    await supabase
      .from('discussion_upvotes')
      .insert({
        discussion_id: discussionId,
        user_id: userId
      });
  }
};

// New unified vote method supporting upvote/downvote
export const voteDiscussion = async (
  discussionId: string,
  userId: string,
  voteType: 'up' | 'down'
): Promise<void> => {
  // Check for existing vote
  const { data: existingVote } = await supabase
    .from('discussion_votes')
    .select('id, vote_type')
    .eq('discussion_id', discussionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      // Toggle off - remove vote
      await supabase
        .from('discussion_votes')
        .delete()
        .eq('id', existingVote.id);
    } else {
      // Change vote type
      await supabase
        .from('discussion_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id);
    }
  } else {
    // Add new vote
    await supabase
      .from('discussion_votes')
      .insert({
        discussion_id: discussionId,
        user_id: userId,
        vote_type: voteType
      });
  }
};

// Edit discussion/reply
export const editDiscussion = async (
  discussionId: string,
  userId: string,
  content: string,
  title?: string
): Promise<void> => {
  // Get user's profile to check role
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  const isTeacherOrAdmin = userProfile?.role === 'teacher' || userProfile?.role === 'admin';

  // First check if it's a discussion or reply
  const { data: discussion } = await supabase
    .from('course_discussions')
    .select('user_id, created_at, course_id')
    .eq('id', discussionId)
    .maybeSingle();

  if (discussion) {
    // It's a main discussion post
    // Check if user is the course teacher
    let isTeacher = false;
    if (userProfile) {
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', discussion.course_id)
        .single();
      
      isTeacher = !!(course && course.teacher_id === userProfile.id);
    }

    if (discussion.user_id !== userId && !isTeacher && !isTeacherOrAdmin) {
      throw new Error('Not authorized to edit this discussion');
    }

    // Check if within 2 hours for students (teachers/admins can edit anytime)
    if (discussion.user_id === userId && !isTeacher && !isTeacherOrAdmin) {
      const hoursSincePost = (new Date().getTime() - new Date(discussion.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSincePost > 2) {
        throw new Error('Students can only edit posts within 2 hours');
      }
    }

    // Update discussion
    const updateData: any = { content, updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    await supabase
      .from('course_discussions')
      .update(updateData)
      .eq('id', discussionId);
    
    return;
  }

  // Check if it's a reply
  const { data: reply } = await supabase
    .from('discussion_replies')
    .select('user_id, created_at, discussion_id')
    .eq('id', discussionId)
    .maybeSingle();

  if (reply) {
    // Check if user is the course teacher
    let isTeacher = false;
    if (userProfile) {
      const { data: discussion } = await supabase
        .from('course_discussions')
        .select('course_id')
        .eq('id', reply.discussion_id)
        .single();

      if (discussion) {
        const { data: course } = await supabase
          .from('courses')
          .select('teacher_id')
          .eq('id', discussion.course_id)
          .single();
        
        isTeacher = !!(course && course.teacher_id === userProfile.id);
      }
    }

    if (reply.user_id !== userId && !isTeacher && !isTeacherOrAdmin) {
      throw new Error('Not authorized to edit this reply');
    }

    // Check if within 2 hours for students (teachers/admins can edit anytime)
    if (reply.user_id === userId && !isTeacher && !isTeacherOrAdmin) {
      const hoursSincePost = (new Date().getTime() - new Date(reply.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSincePost > 2) {
        throw new Error('Students can only edit replies within 2 hours');
      }
    }

    // Update reply
    await supabase
      .from('discussion_replies')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', discussionId);
    
    return;
  }

  throw new Error('Discussion or reply not found');
};

export const deleteDiscussion = async (
  discussionId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> => {
  // Check if user owns the discussion or is admin/teacher
  const { data: discussion } = await supabase
    .from('course_discussions')
    .select('user_id, course_id')
    .eq('id', discussionId)
    .maybeSingle();

  if (!discussion) {
    // Check if it's a reply instead
    const { data: reply } = await supabase
      .from('discussion_replies')
      .select('user_id, discussion_id, created_at')
      .eq('id', discussionId)
      .maybeSingle();

    if (reply) {
      // Deleting a reply - forward to deleteReply
      return deleteReply(discussionId, userId, isAdmin);
    }
    throw new Error('Discussion not found');
  }

  // Get user's profile to check if they're the teacher
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .single();

  // Check if user is the course teacher
  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', discussion.course_id)
    .single();

  const isTeacher = userProfile && course && course.teacher_id === userProfile.id;
  const isTeacherOrAdmin = userProfile?.role === 'teacher' || userProfile?.role === 'admin';

  if (discussion.user_id !== userId && !isAdmin && !isTeacher && !isTeacherOrAdmin) {
    throw new Error('Not authorized to delete this discussion');
  }

  // Delete discussion (cascading deletes will handle replies)
  const { error } = await supabase
    .from('course_discussions')
    .delete()
    .eq('id', discussionId);

  if (error) throw error;
};

export const deleteReply = async (
  replyId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> => {
  // Check if user owns the reply or is admin
  const { data: reply } = await supabase
    .from('discussion_replies')
    .select('user_id, created_at, discussion_id')
    .eq('id', replyId)
    .single();

  if (!reply) {
    throw new Error('Reply not found');
  }

  // Get user's profile to check role and ID
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .single();

  // Check if within 2 hours for students
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const createdAt = new Date(reply.created_at);
  const isWithinTwoHours = createdAt > twoHoursAgo;

  // Check if user is the course teacher
  const { data: discussion } = await supabase
    .from('course_discussions')
    .select('course_id')
    .eq('id', reply.discussion_id)
    .single();

  let isTeacher = false;
  if (discussion && userProfile) {
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', discussion.course_id)
      .maybeSingle();
    
    // Fixed: Compare profile.id with teacher_id
    isTeacher = !!(course && course.teacher_id === userProfile.id);
  }

  const isTeacherOrAdmin = userProfile?.role === 'teacher' || userProfile?.role === 'admin';

  if (reply.user_id !== userId && !isAdmin && !isTeacher && !isTeacherOrAdmin) {
    throw new Error('Not authorized to delete this reply');
  }

  if (reply.user_id === userId && !isWithinTwoHours && !isAdmin && !isTeacher && !isTeacherOrAdmin) {
    throw new Error('Can only delete your own replies within 2 hours');
  }

  // Delete reply
  const { error } = await supabase
    .from('discussion_replies')
    .delete()
    .eq('id', replyId);

  if (error) throw error;
};

export const updateDiscussion = async (
  discussionId: string,
  userId: string,
  updates: { title?: string; content?: string; is_pinned?: boolean },
  isTeacher: boolean = false
): Promise<Discussion> => {
  // Check if user owns the discussion or is teacher (for pinning)
  const { data: discussion } = await supabase
    .from('course_discussions')
    .select('user_id, course_id')
    .eq('id', discussionId)
    .single();

  if (!discussion) {
    throw new Error('Discussion not found');
  }

  // Only owner can edit content/title
  if (discussion.user_id !== userId && (updates.title || updates.content)) {
    throw new Error('Not authorized to edit this discussion');
  }

  // Only teacher can pin
  if (updates.is_pinned !== undefined && !isTeacher) {
    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', discussion.course_id)
      .single();
    
    if (!course || course.teacher_id !== userId) {
      throw new Error('Only teachers can pin discussions');
    }
  }

  // Update discussion
  const { data, error } = await supabase
    .from('course_discussions')
    .update(updates)
    .eq('id', discussionId)
    .select('*')
    .single();

  if (error) throw error;

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('clerk_user_id', data.user_id)
    .single();

  return {
    id: data.id,
    course_id: data.course_id,
    title: data.title,
    content: data.content,
    created_at: data.created_at,
    author_name: profile ? profile.full_name : 'Unknown',
    author_role: profile?.role || 'student',
    author_clerk_id: data.user_id,
    is_pinned: data.is_pinned || false,
    reply_count: 0,
    upvotes: 0,
    downvotes: 0
  };
};

export const updateReply = async (
  replyId: string,
  userId: string,
  content: string
): Promise<Reply> => {
  // Check if user owns the reply
  const { data: reply } = await supabase
    .from('discussion_replies')
    .select('user_id, created_at')
    .eq('id', replyId)
    .single();

  if (!reply) {
    throw new Error('Reply not found');
  }

  if (reply.user_id !== userId) {
    throw new Error('Not authorized to edit this reply');
  }

  // Check if within 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const createdAt = new Date(reply.created_at);
  
  if (createdAt < twoHoursAgo) {
    throw new Error('Can only edit replies within 2 hours of creation');
  }

  // Update reply
  const { data, error } = await supabase
    .from('discussion_replies')
    .update({ content })
    .eq('id', replyId)
    .select('*')
    .single();

  if (error) throw error;

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('clerk_user_id', data.user_id)
    .single();

  return {
    id: data.id,
    content: data.content,
    created_at: data.created_at,
    author_name: profile ? profile.full_name : 'Unknown',
    author_role: profile?.role || 'student',
    author_clerk_id: data.user_id,
    upvotes: 0,
    downvotes: 0
  };
};
