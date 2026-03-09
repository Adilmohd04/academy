'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  MessageCircle, User, Clock, Reply, Send, ChevronLeft, 
  ThumbsUp, MoreVertical, Flag, MessageSquare, Plus, Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Discussion {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string; // Should now be populated correctly by backend
  user_role: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  replies_count: number;
  author_name: string; // From backend service fix
  author_role: string; // From backend service fix
}

interface DiscussionReply {
  id: string;
  discussion_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string; // From backend service fix
  author_role: string; // From backend service fix
}

export default function CourseDiscussionsPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDiscussions();
  }, [params.courseId]);

  const fetchDiscussions = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/courses/${params.courseId}/discussions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle array wrapped in object or direct array
        const discussionsList = data.data || data; 
        setDiscussions(Array.isArray(discussionsList) ? discussionsList : []);
      }
    } catch (error) {
      console.error('Failed to fetch discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (discussionId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/discussions/${discussionId}/replies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReplies(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    
    setSubmitting(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/courses/${params.courseId}/discussions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });

      if (response.ok) {
        setNewTitle('');
        setNewContent('');
        setShowNewPost(false);
        await fetchDiscussions();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create discussion');
      }
    } catch (error) {
      console.error('Failed to create discussion:', error);
      alert('Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscussion || !replyContent.trim()) return;

    setSubmitting(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/discussions/${selectedDiscussion.id}/replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: replyContent }),
      });

      if (response.ok) {
        setReplyContent('');
        await fetchReplies(selectedDiscussion.id);
        // Optimistically update reply count
        setDiscussions(prev => prev.map(d => 
          d.id === selectedDiscussion.id 
            ? { ...d, replies_count: (d.replies_count || 0) + 1 } 
            : d
        ));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
      alert('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDiscussion = async (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    setShowNewPost(false);
    setReplies([]); // Clear previous replies
    // Scroll to top of detail view on mobile
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    await fetchReplies(discussion.id);
  };

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'just now';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredDiscussions = discussions.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-[#1B365D]">Class Discussions</h1>
          </div>
          <button
            onClick={() => {
              setShowNewPost(true);
              setSelectedDiscussion(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#C5A059] text-white rounded-lg hover:bg-[#B08D4C] transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Post</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-100px)]">
          
          {/* Left Panel: Discussion List */}
          <div className={`${selectedDiscussion || showNewPost ? 'hidden lg:block' : 'block'} lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col`}>
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search discussions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <div className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-sm">Loading topics...</span>
                </div>
              ) : filteredDiscussions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-center px-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-1">No discussions yet</h3>
                  <p className="text-xs text-gray-500">Be the first to start a conversation regarding this course.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredDiscussions.map((discussion) => (
                    <button
                      key={discussion.id}
                      onClick={() => handleSelectDiscussion(discussion)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedDiscussion?.id === discussion.id ? 'bg-amber-50/50 border-l-4 border-[#C5A059]' : 'border-l-4 border-transparent'
                      }`}
                    >
                      <h3 className={`font-semibold text-sm mb-1 line-clamp-1 ${selectedDiscussion?.id === discussion.id ? 'text-[#C5A059]' : 'text-gray-900'}`}>
                        {discussion.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                        {discussion.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                            {getInitials(discussion.author_name || discussion.user_name || 'U')}
                          </div>
                          <span className="text-xs text-gray-500 font-medium truncate max-w-[80px]">
                            {discussion.author_name || discussion.user_name || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {getTimeAgo(discussion.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Detail View */}
          <div className={`${!selectedDiscussion && !showNewPost ? 'hidden lg:flex' : 'flex'} lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-col items-center justify-center`}>
            
            {showNewPost ? (
              /* Create New Post Form */
              <div className="w-full h-full flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Create New Discussion</h2>
                  <button onClick={() => setShowNewPost(false)} className="text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                </div>
                <form onSubmit={handleCreateDiscussion} className="flex-1 p-6 overflow-y-auto">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 text-lg font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Elaborate on your question or topic..."
                        rows={12}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 resize-none"
                        required
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 bg-[#1B365D] text-white rounded-xl hover:bg-[#152a48] transition-colors font-medium disabled:opacity-50"
                      >
                        {submitting ? 'Posting...' : 'Post Discussion'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : selectedDiscussion ? (
              /* Discussion Detail */
              <div className="w-full h-full flex flex-col">
                {/* Mobile Back Button */}
                <div className="lg:hidden p-4 border-b border-gray-100">
                   <button 
                    onClick={() => setSelectedDiscussion(null)}
                    className="flex items-center text-sm text-gray-500 hover:text-[#1B365D]"
                   >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to list
                   </button>
                </div>

                {/* Main Post */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedDiscussion.title}</h2>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-[#1B365D]/10 flex items-center justify-center text-[#1B365D] font-bold">
                        {getInitials(selectedDiscussion.author_name || selectedDiscussion.user_name || 'U')}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {selectedDiscussion.author_name || selectedDiscussion.user_name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className={`capitalize px-1.5 py-0.5 rounded text-[10px] ${selectedDiscussion.author_role === 'teacher' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {selectedDiscussion.author_role || selectedDiscussion.user_role || 'Student'}
                          </span>
                          <span>•</span>
                          <span>{getTimeAgo(selectedDiscussion.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-xl border border-gray-100">
                      {selectedDiscussion.content}
                    </div>
                    <div className="flex items-center gap-4 mt-4 px-2">
                      <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#C5A059] transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Like</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#C5A059] transition-colors">
                        <Flag className="w-4 h-4" />
                        <span>Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Replies */}
                  <div className="space-y-6">
                    <h3 className="font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-[#C5A059]" />
                      {replies.length} Replies
                    </h3>
                    
                    {replies.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-8 italic">No replies yet. Be the first to answer!</p>
                    ) : (
                      replies.map((reply) => (
                        <div key={reply.id} className="flex gap-4 group">
                          <div className="mt-1">
                             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                              {getInitials(reply.author_name || reply.user_name || 'U')}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="bg-white group-hover:bg-gray-50 border border-gray-100 rounded-xl p-4 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900">
                                  {reply.author_name || reply.user_name || 'Unknown User'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {getTimeAgo(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{reply.content}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <form onSubmit={handleCreateReply} className="relative">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || submitting}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#C5A059] text-white rounded-lg hover:bg-[#B08D4C] transition-colors disabled:opacity-50 disabled:bg-gray-300"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              /* Empty State */
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-[#1B365D]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Select a discussion</h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm">
                  Choose a topic from the left sidebar to view details or start a new discussion.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
