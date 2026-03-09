'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, Upload, Eye, EyeOff, Clock, CheckCircle, 
  AlertCircle, FileText, Video, HelpCircle, Calendar,
  ChevronDown, ChevronUp, Edit2, Trash2
} from 'lucide-react';

interface DraftContent {
  lessons: Array<{
    id: string;
    title: string;
    status: 'draft' | 'published';
    content_type: string;
    order_index: number;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    status: 'draft' | 'published';
    question_count: number;
  }>;
  live_classes: Array<{
    id: string;
    title: string;
    status: 'draft' | 'published';
    scheduled_at: string;
  }>;
}

interface Week {
  id: string;
  week_number: number;
  title: string;
  description?: string;
  status: 'draft' | 'published';
  published_at?: string;
  last_saved_at?: string;
  content: DraftContent;
  ready_to_publish: boolean;
  issues: string[];
}

interface WeekDraftEditorProps {
  week: Week;
  courseId: string;
  onSave: (data: Partial<Week>) => Promise<void>;
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
  autoSaveInterval?: number; // ms
}

export function WeekDraftEditor({
  week,
  courseId,
  onSave,
  onPublish,
  onUnpublish,
  autoSaveInterval = 30000
}: WeekDraftEditorProps) {
  const [editedWeek, setEditedWeek] = useState<Partial<Week>>({
    title: week.title,
    description: week.description
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    week.last_saved_at ? new Date(week.last_saved_at) : null
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    lessons: true,
    quizzes: true,
    live_classes: true
  });

  // Auto-save functionality
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(async () => {
      try {
        await onSave(editedWeek);
        setLastSaved(new Date());
        setHasChanges(false);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [editedWeek, hasChanges, autoSaveInterval, onSave]);

  const handleFieldChange = (field: keyof Week, value: any) => {
    setEditedWeek(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedWeek);
      setLastSaved(new Date());
      setHasChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusBadge = (status: 'draft' | 'published') => (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
      status === 'published' 
        ? 'bg-green-100 text-green-700' 
        : 'bg-amber-100 text-amber-700'
    }`}>
      {status === 'published' ? 'Published' : 'Draft'}
    </span>
  );

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-500">Week {week.week_number}</span>
              {getStatusBadge(week.status)}
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{week.title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Save Status */}
            <div className="text-sm text-gray-500 flex items-center gap-2">
              {hasChanges ? (
                <>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Unsaved changes
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Saved {formatTimeAgo(lastSaved)}
                </>
              ) : null}
            </div>
            
            {/* Save Button */}
            <button
              onClick={handleManualSave}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            {/* Publish/Unpublish Button */}
            {week.status === 'draft' ? (
              <button
                onClick={onPublish}
                disabled={!week.ready_to_publish}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Publish Week
              </button>
            ) : (
              <button
                onClick={onUnpublish}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
              >
                <EyeOff className="h-4 w-4" />
                Unpublish
              </button>
            )}
          </div>
        </div>

        {/* Issues Warning */}
        {week.issues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Cannot publish yet</h4>
                <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                  {week.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Basic Info Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Week Title
            </label>
            <input
              type="text"
              value={editedWeek.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter week title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={editedWeek.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Week description..."
            />
          </div>
        </div>
      </div>

      {/* Lessons Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('lessons')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-800">Lessons</span>
            <span className="text-sm text-gray-500">
              ({week.content.lessons.length} items)
            </span>
          </div>
          {expandedSections.lessons ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.lessons && (
          <div className="p-4">
            {week.content.lessons.length > 0 ? (
              <div className="space-y-2">
                {week.content.lessons
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((lesson) => (
                    <ContentItem
                      key={lesson.id}
                      title={lesson.title}
                      status={lesson.status}
                      icon={<FileText className="h-4 w-4" />}
                      subtitle={lesson.content_type}
                    />
                  ))}
              </div>
            ) : (
              <EmptyState 
                icon={<FileText className="h-8 w-8" />}
                message="No lessons added yet"
              />
            )}
            <button className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
              + Add Lesson
            </button>
          </div>
        )}
      </div>

      {/* Quizzes Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('quizzes')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-gray-800">Quizzes</span>
            <span className="text-sm text-gray-500">
              ({week.content.quizzes.length} items)
            </span>
          </div>
          {expandedSections.quizzes ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.quizzes && (
          <div className="p-4">
            {week.content.quizzes.length > 0 ? (
              <div className="space-y-2">
                {week.content.quizzes.map((quiz) => (
                  <ContentItem
                    key={quiz.id}
                    title={quiz.title}
                    status={quiz.status}
                    icon={<HelpCircle className="h-4 w-4" />}
                    subtitle={`${quiz.question_count} questions`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={<HelpCircle className="h-8 w-8" />}
                message="No quizzes added yet"
              />
            )}
            <button className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
              + Add Quiz
            </button>
          </div>
        )}
      </div>

      {/* Live Classes Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('live_classes')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-red-600" />
            <span className="font-medium text-gray-800">Live Classes</span>
            <span className="text-sm text-gray-500">
              ({week.content.live_classes.length} items)
            </span>
          </div>
          {expandedSections.live_classes ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.live_classes && (
          <div className="p-4">
            {week.content.live_classes.length > 0 ? (
              <div className="space-y-2">
                {week.content.live_classes.map((liveClass) => (
                  <ContentItem
                    key={liveClass.id}
                    title={liveClass.title}
                    status={liveClass.status}
                    icon={<Video className="h-4 w-4" />}
                    subtitle={new Date(liveClass.scheduled_at).toLocaleString()}
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={<Video className="h-8 w-8" />}
                message="No live classes scheduled"
              />
            )}
            <button className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
              + Schedule Live Class
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Content Item Component
function ContentItem({
  title,
  status,
  icon,
  subtitle
}: {
  title: string;
  status: 'draft' | 'published';
  icon: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <div>
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
          status === 'published' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          {status}
        </span>
        <button className="p-1 text-gray-400 hover:text-gray-600">
          <Edit2 className="h-4 w-4" />
        </button>
        <button className="p-1 text-gray-400 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="py-8 text-center text-gray-400">
      <div className="flex justify-center mb-2">{icon}</div>
      <p>{message}</p>
    </div>
  );
}

// Week Draft List Component
export function WeekDraftList({
  weeks,
  courseId,
  onSelectWeekAction
}: {
  weeks: Array<{
    id: string;
    week_number: number;
    title: string;
    status: 'draft' | 'published';
    lesson_count: number;
    quiz_count: number;
  }>;
  courseId: string;
  onSelectWeekAction: (weekId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {weeks.map((week) => (
        <button
          key={week.id}
          onClick={() => onSelectWeekAction(week.id)}
          className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Week {week.week_number}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              week.status === 'published' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {week.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">{week.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {week.lesson_count} lessons
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              {week.quiz_count} quizzes
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
