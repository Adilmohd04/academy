'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  ArrowUp, ArrowDown, MessageSquare, Send, User, Clock, 
  Reply as ReplyIcon, MoreVertical, Edit2, Trash2, Check, X
} from 'lucide-react';

interface Discussion {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_vote?: number; // 1 for upvote, -1 for downvote, null for no vote
  replies_count: number;
}

interface Reply {
  id: string;
  discussion_id: string;
  parent_reply_id?: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_vote?: number;
  level: number;
}

export default function DiscussionsPage() {
  const params = useParams();
  const { userId } = useAuth();
  const courseId = params.courseId as string;

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [replies, setReplies] = useState<{ [key: string]: Reply[] }>({});
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDiscussions();
  }, [courseId]);

  const fetchDiscussions = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/discussions`,
        { headers: { 'x-clerk-user-id': userId || '' } }
      );
      if (res.ok) {
        const data = await res.json();
        setDiscussions(data);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (discussionId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}/replies`,
        { headers: { 'x-clerk-user-id': userId || '' } }
      );
      if (res.ok) {
        const data = await res.json();
        setReplies(prev => ({ ...prev, [discussionId]: data }));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const handleVote = async (type: 'discussion' | 'reply', id: string, vote: number) => {
    try {
      const endpoint = type === 'discussion' 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${id}/vote`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/discussion-replies/${id}/vote`;
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ vote })
      });

      if (type === 'discussion') {
        fetchDiscussions();
      } else {
        const discussionId = discussions.find(d => 
          replies[d.id]?.some(r => r.id === id)
        )?.id;
        if (discussionId) fetchReplies(discussionId);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/discussions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': userId || ''
          },
          body: JSON.stringify({ content: newMessage })
        }
      );

      if (res.ok) {
        setNewMessage('');
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Error posting message:', error);
    }
  };

  const handlePostReply = async (discussionId: string, parentReplyId?: string) => {
    if (!replyContent.trim()) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}/replies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': userId || ''
          },
          body: JSON.stringify({ 
            content: replyContent,
            parent_reply_id: parentReplyId 
          })
        }
      );

      if (res.ok) {
        setReplyContent('');
        setReplyingTo(null);
        fetchReplies(discussionId);
        fetchDiscussions(); // Update reply count
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const handleDelete = async (type: 'discussion' | 'reply', id: string, discussionId?: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      const endpoint = type === 'discussion'
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/discussion-replies/${id}`;

      await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'x-clerk-user-id': userId || '' }
      });

      if (type === 'discussion') {
        fetchDiscussions();
      } else if (discussionId) {
        fetchReplies(discussionId);
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const toggleExpand = (discussionId: string) => {
    const newExpanded = new Set(expandedDiscussions);
    if (newExpanded.has(discussionId)) {
      newExpanded.delete(discussionId);
    } else {
      newExpanded.add(discussionId);
      if (!replies[discussionId]) {
        fetchReplies(discussionId);
      }
    }
    setExpandedDiscussions(newExpanded);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading discussions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* New Message Box */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Share your thoughts or ask a question..."
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePostMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Post
            </button>
          </div>
        </div>

        {/* Discussions List */}
        <div className="space-y-4">
          {discussions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            discussions.map((discussion) => (
              <div key={discussion.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Discussion Content */}
                <div className="flex gap-3 p-4">
                  {/* Voting */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleVote('discussion', discussion.id, 1)}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        discussion.user_vote === 1 ? 'text-orange-600' : 'text-gray-400'
                      }`}
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                    <span className={`text-sm font-bold ${
                      (discussion.upvotes - discussion.downvotes) > 0 ? 'text-orange-600' :
                      (discussion.upvotes - discussion.downvotes) < 0 ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {discussion.upvotes - discussion.downvotes}
                    </span>
                    <button
                      onClick={() => handleVote('discussion', discussion.id, -1)}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        discussion.user_vote === -1 ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      <ArrowDown className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {discussion.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{discussion.user_name}</span>
                      <span className="text-xs text-gray-500">\u2022</span>
                      <span className="text-xs text-gray-500">{formatTimeAgo(discussion.created_at)}</span>
                      {discussion.user_id === userId && (
                        <button
                          onClick={() => handleDelete('discussion', discussion.id)}
                          className="ml-auto text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap mb-3">{discussion.content}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-4 text-sm">
                      <button
                        onClick={() => toggleExpand(discussion.id)}
                        className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 font-medium"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {discussion.replies_count} {discussion.replies_count === 1 ? 'reply' : 'replies'}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(discussion.id);
                          if (!expandedDiscussions.has(discussion.id)) {
                            toggleExpand(discussion.id);
                          }
                        }}
                        className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 font-medium"
                      >
                        <ReplyIcon className="w-4 h-4" />
                        Reply
                      </button>
                    </div>

                    {/* Replies */}
                    {expandedDiscussions.has(discussion.id) && (
                      <div className="mt-4 space-y-3 border-l-2 border-gray-200 pl-4">
                        {/* Reply Input */}
                        {replyingTo === discussion.id && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write your reply..."
                              className="w-full border border-gray-300 rounded p-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handlePostReply(discussion.id)}
                                disabled={!replyContent.trim()}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
                              >
                                Reply
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                }}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Reply List */}
                        {replies[discussion.id]?.map((reply) => (
                          <div key={reply.id} className="flex gap-2">
                            {/* Reply Voting */}
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => handleVote('reply', reply.id, 1)}
                                className={`p-0.5 rounded hover:bg-gray-100 ${
                                  reply.user_vote === 1 ? 'text-orange-600' : 'text-gray-400'
                                }`}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-bold text-gray-600">
                                {reply.upvotes - reply.downvotes}
                              </span>
                              <button
                                onClick={() => handleVote('reply', reply.id, -1)}
                                className={`p-0.5 rounded hover:bg-gray-100 ${
                                  reply.user_vote === -1 ? 'text-blue-600' : 'text-gray-400'
                                }`}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Reply Content */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {reply.user_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-gray-900">{reply.user_name}</span>
                                <span className="text-xs text-gray-500">\u2022</span>
                                <span className="text-xs text-gray-500">{formatTimeAgo(reply.created_at)}</span>
                                {reply.user_id === userId && (
                                  <button
                                    onClick={() => handleDelete('reply', reply.id, discussion.id)}
                                    className="ml-auto text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
