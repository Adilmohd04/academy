'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { MessageSquare, ThumbsUp, ThumbsDown, Reply, Send, Loader2, Search } from 'lucide-react';

interface DiscussionPost {
  id: string;
  title: string;
  content: string;
  author: string;
  author_avatar?: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  replies_count: number;
  userVote?: 'up' | 'down' | null;
}

interface Reply {
  id: string;
  content: string;
  author: string;
  author_avatar?: string;
  created_at: string;
  upvotes: number;
}

export default function DiscussionPage() {
  const { userId, getToken } = useAuth();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedPost, setSelectedPost] = useState<DiscussionPost | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReplyContent, setNewReplyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [userId]);

  const fetchPosts = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/discussion`, {
        headers: {
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert('Please fill in title and content');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/discussion/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent
        })
      });

      if (response.ok) {
        setNewPostTitle('');
        setNewPostContent('');
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const votePost = async (postId: string, voteType: 'up' | 'down') => {
    try {
      const token = await getToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/discussion/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ voteType })
      });

      fetchPosts();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-blue-600" />
            Course Discussion Forum
          </h1>
          <p className="text-slate-600">Ask questions, share ideas, and help your classmates</p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Posts List - Left Side */}
          <div className="col-span-2">
            {/* Search Bar */}
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No posts yet. Be the first to start a discussion!</p>
                </div>
              ) : (
                filteredPosts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg hover:border-blue-400 border border-gray-200 p-6 cursor-pointer transition-all"
                  >
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{post.title}</h3>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">{post.content}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{post.author} • {new Date(post.created_at).toLocaleDateString()}</span>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.replies_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {post.upvotes}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Post Form & Details - Right Side */}
          <div className="col-span-1 space-y-6">
            {/* New Post Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Start Discussion</h3>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Post title..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />

                <textarea
                  placeholder="Share your thoughts..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />

                <button
                  onClick={createPost}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all font-semibold text-sm"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Posting...' : 'Post Discussion'}
                </button>
              </div>
            </div>

            {/* Selected Post Details */}
            {selectedPost && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  ← Back to Posts
                </button>

                <h3 className="text-lg font-bold text-slate-800 mb-2">{selectedPost.title}</h3>
                <p className="text-xs text-gray-500 mb-4">{selectedPost.author} • {new Date(selectedPost.created_at).toLocaleDateString()}</p>

                <p className="text-slate-700 mb-6 text-sm">{selectedPost.content}</p>

                {/* Vote Buttons */}
                <div className="flex gap-2 mb-6 pb-6 border-b border-gray-200">
                  <button
                    onClick={() => votePost(selectedPost.id, 'up')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedPost.userVote === 'up'
                        ? 'bg-green-100 text-green-700 font-semibold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {selectedPost.upvotes}
                  </button>
                  <button
                    onClick={() => votePost(selectedPost.id, 'down')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedPost.userVote === 'down'
                        ? 'bg-red-100 text-red-700 font-semibold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    {selectedPost.downvotes}
                  </button>
                </div>

                {/* Reply Section */}
                <h4 className="font-semibold text-slate-700 mb-3">Replies ({selectedPost.replies_count})</h4>
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {/* Replies would be displayed here */}
                </div>

                <textarea
                  placeholder="Write a reply..."
                  value={newReplyContent}
                  onChange={(e) => setNewReplyContent(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none mb-2"
                />
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all font-semibold text-sm">
                  <Reply className="w-4 h-4" />
                  Post Reply
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
