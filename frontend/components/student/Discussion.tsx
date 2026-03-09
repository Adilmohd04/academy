'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, ThumbsUp, MessageCircle, Pin, Check, 
  Send, Clock, User, ChevronDown, ChevronUp 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Author {
  id: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  profile_image_url?: string;
}

interface Reply {
  id: string;
  content: string;
  author: Author;
  upvotes: number;
  is_upvoted?: boolean;
  is_accepted_answer?: boolean;
  created_at: string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  author: Author;
  course_title?: string;
  week_title?: string;
  upvotes: number;
  reply_count: number;
  is_upvoted?: boolean;
  is_pinned?: boolean;
  is_answered?: boolean;
  created_at: string;
  replies?: Reply[];
}

interface DiscussionListProps {
  discussions: Discussion[];
  currentUserId?: string;
  onUpvote?: (discussionId: string) => void;
  onViewDiscussion?: (discussionId: string) => void;
  onNewDiscussion?: () => void;
}

interface DiscussionDetailProps {
  discussion: Discussion;
  currentUserId?: string;
  isTeacher?: boolean;
  onUpvote?: (discussionId: string) => void;
  onUpvoteReply?: (replyId: string) => void;
  onAcceptAnswer?: (replyId: string) => void;
  onReply?: (content: string) => void;
  onPin?: (discussionId: string) => void;
}

const AuthorBadge = ({ role }: { role: string }) => {
  const colors = {
    teacher: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700',
    student: 'bg-gray-100 text-gray-700'
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[role as keyof typeof colors] || colors.student}`}>
      {role}
    </span>
  );
};

const AuthorAvatar = ({ author }: { author: Author }) => (
  author.profile_image_url ? (
    <img 
      src={author.profile_image_url} 
      alt={author.name}
      className="w-10 h-10 rounded-full object-cover"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
      {author.name.charAt(0).toUpperCase()}
    </div>
  )
);

export function DiscussionList({
  discussions,
  currentUserId,
  onUpvote,
  onViewDiscussion,
  onNewDiscussion
}: DiscussionListProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-800">Discussions</h2>
        </div>
        {onNewDiscussion && (
          <button
            onClick={onNewDiscussion}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Ask Question
          </button>
        )}
      </div>

      {/* Discussion List */}
      <div className="space-y-3">
        {discussions.map((discussion) => (
          <div
            key={discussion.id}
            className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow ${
              discussion.is_pinned ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
            }`}
            onClick={() => onViewDiscussion?.(discussion.id)}
          >
            {/* Pinned Badge */}
            {discussion.is_pinned && (
              <div className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-2">
                <Pin className="h-3 w-3" />
                Pinned
              </div>
            )}

            <div className="flex gap-4">
              {/* Votes */}
              <div 
                className="flex flex-col items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpvote?.(discussion.id);
                }}
              >
                <button className={`p-1 rounded hover:bg-gray-100 ${
                  discussion.is_upvoted ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  <ThumbsUp className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium text-gray-700">{discussion.upvotes}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800 mb-1 line-clamp-2">
                  {discussion.title}
                  {discussion.is_answered && (
                    <Check className="inline-block ml-2 h-4 w-4 text-green-500" />
                  )}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {discussion.content}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{discussion.author.name}</span>
                    <AuthorBadge role={discussion.author.role} />
                  </div>
                  {discussion.course_title && (
                    <span className="text-emerald-600">{discussion.course_title}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{discussion.reply_count} replies</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {discussions.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium">No discussions yet</p>
            <p className="text-sm text-gray-500">Be the first to ask a question!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DiscussionDetail({
  discussion,
  currentUserId,
  isTeacher = false,
  onUpvote,
  onUpvoteReply,
  onAcceptAnswer,
  onReply,
  onPin
}: DiscussionDetailProps) {
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(true);

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply?.(replyContent);
      setReplyContent('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Discussion */}
      <div className={`bg-white rounded-xl border p-6 ${
        discussion.is_pinned ? 'border-amber-300' : 'border-gray-200'
      }`}>
        {/* Actions Bar (for teacher) */}
        {isTeacher && (
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={() => onPin?.(discussion.id)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                discussion.is_pinned 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Pin className="h-4 w-4" />
              {discussion.is_pinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <AuthorAvatar author={discussion.author} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-800">{discussion.author.name}</span>
              <AuthorBadge role={discussion.author.role} />
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
              {discussion.course_title && (
                <span className="ml-2 text-emerald-600">in {discussion.course_title}</span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-gray-800 mb-3">{discussion.title}</h2>
        <div className="prose prose-sm max-w-none text-gray-700 mb-4">
          {discussion.content}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => onUpvote?.(discussion.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              discussion.is_upvoted 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{discussion.upvotes}</span>
          </button>
          <span className="text-sm text-gray-500">
            {discussion.reply_count} {discussion.reply_count === 1 ? 'reply' : 'replies'}
          </span>
        </div>
      </div>

      {/* Replies Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowReplies(!showReplies)}
          className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="font-medium text-gray-800">
            Replies ({discussion.replies?.length || 0})
          </span>
          {showReplies ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {showReplies && (
          <>
            {/* Reply List */}
            <div className="divide-y divide-gray-100">
              {discussion.replies?.map((reply) => (
                <div 
                  key={reply.id} 
                  className={`p-4 ${reply.is_accepted_answer ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                >
                  {reply.is_accepted_answer && (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium mb-2">
                      <Check className="h-4 w-4" />
                      Accepted Answer
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <AuthorAvatar author={reply.author} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{reply.author.name}</span>
                        <AuthorBadge role={reply.author.role} />
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{reply.content}</p>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => onUpvoteReply?.(reply.id)}
                          className={`flex items-center gap-1 text-sm ${
                            reply.is_upvoted ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {reply.upvotes}
                        </button>
                        
                        {isTeacher && discussion.author.id === currentUserId && !reply.is_accepted_answer && (
                          <button
                            onClick={() => onAcceptAnswer?.(reply.id)}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600"
                          >
                            <Check className="h-4 w-4" />
                            Accept Answer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!discussion.replies || discussion.replies.length === 0) && (
                <div className="p-8 text-center text-gray-500">
                  No replies yet. Be the first to respond!
                </div>
              )}
            </div>

            {/* Reply Form */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex gap-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  rows={2}
                  className="flex-1 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// New Discussion Form
export function NewDiscussionForm({
  courseId,
  weekId,
  onSubmitAction,
  onCancelAction
}: {
  courseId: string;
  weekId?: string;
  onSubmitAction: (data: { title: string; content: string }) => void;
  onCancelAction: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onSubmitAction({ title, content });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Ask a Question</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your question?"
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Provide more context about your question..."
            rows={5}
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelAction}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Post Question
          </button>
        </div>
      </div>
    </form>
  );
}
