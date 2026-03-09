'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, CheckCircle, AlertCircle, 
  Upload, Download, Eye, Send, X,
  Calendar, Award, Paperclip, MessageSquare
} from 'lucide-react';
import { 
  WeekActivity, ActivitySubmission, SubmissionStatus 
} from '@/types/lms';
import { format, isAfter, differenceInDays } from 'date-fns';

interface CourseActivitiesProps {
  courseId: string;
}

// Helper function for status badges
const getStatusBadge = (status: SubmissionStatus, isLate: boolean = false) => {
  const badges = {
      not_started: (
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Not Started
        </span>
      ),
      in_progress: (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-1">
          <Clock className="h-3 w-3" />
          In Progress
        </span>
      ),
      submitted: (
        <span className={`px-3 py-1 ${isLate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'} text-sm font-medium rounded-full flex items-center gap-1`}>
          <CheckCircle className="h-3 w-3" />
          {isLate ? 'Submitted (Late)' : 'Submitted'}
        </span>
      ),
      graded: (
        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full flex items-center gap-1">
          <Award className="h-3 w-3" />
          Graded
        </span>
      ),
      late: (
        <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Late Submission
        </span>
      )
    };

    return badges[status] || badges.not_started;
};

// Helper function for activity type colors
const getTypeColor = (type: string) => {
  const colors = {
    quiz: 'from-purple-500 to-indigo-600',
    activity: 'from-blue-500 to-cyan-600',
    assignment: 'from-emerald-500 to-teal-600',
    midterm: 'from-amber-500 to-orange-600',
    final_exam: 'from-red-500 to-rose-600'
  };
  return colors[type as keyof typeof colors] || colors.activity;
};

export default function CourseActivities({ courseId }: CourseActivitiesProps) {
  const [activities, setActivities] = useState<WeekActivity[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, ActivitySubmission>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [selectedActivity, setSelectedActivity] = useState<WeekActivity | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [courseId]);

  const fetchActivities = async () => {
    // TODO: Fetch from API
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Activities & Assignments</h2>
            <p className="text-gray-600">
              Track and submit your coursework
            </p>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {['all', 'pending', 'submitted', 'graded'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600">No activities available</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Mock Activity Card */}
          <ActivityCard
            activity={{
              id: '1',
              weekId: '1',
              type: 'assignment',
              title: 'Week 1: Islamic History Essay',
              description: 'Write a comprehensive essay on the early Islamic period',
              instructions: 'Your essay should be 1000-1500 words and cover the key events of the early Islamic period.',
              assignedDate: new Date().toISOString(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              lateSubmissionAllowed: true,
              latePenaltyPercentage: 10,
              totalMarks: 100,
              attachments: [],
              submissionType: 'file',
              maxFileSize_mb: 10,
              allowedFileTypes: ['.pdf', '.doc', '.docx'],
              requiresPeerReview: false,
              isPublished: true,
              createdBy: 'teacher1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }}
            submission={undefined}
            onViewDetails={setSelectedActivity}
          />
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          submission={submissions.get(selectedActivity.id)}
          onClose={() => setSelectedActivity(null)}
          onSubmit={async (data) => {
            // TODO: Handle submission
            console.log('Submitting:', data);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}

// Activity Card Component
function ActivityCard({ 
  activity, 
  submission, 
  onViewDetails 
}: { 
  activity: WeekActivity;
  submission?: ActivitySubmission;
  onViewDetails: (activity: WeekActivity) => void;
}) {
  const dueDate = new Date(activity.dueDate);
  const isOverdue = isAfter(new Date(), dueDate) && !submission;
  const daysUntilDue = differenceInDays(dueDate, new Date());

  const status: SubmissionStatus = submission 
    ? (submission.status)
    : (isOverdue ? 'late' : 'not_started');

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Type Badge */}
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTypeColor(activity.type)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <FileText className="h-7 w-7 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    activity.type === 'assignment' ? 'bg-emerald-100 text-emerald-700' :
                    activity.type === 'activity' ? 'bg-blue-100 text-blue-700' :
                    activity.type === 'quiz' ? 'bg-purple-100 text-purple-700' :
                    activity.type === 'midterm' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {activity.type}
                  </span>
                  {getStatusBadge(status, submission?.isLate)}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{activity.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2">{activity.description}</p>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm mb-4">
              <div className={`flex items-center gap-1 ${isOverdue && !submission ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                <Clock className="h-4 w-4" />
                <span>
                  Due: {format(dueDate, 'MMM d, h:mm a')}
                  {!isOverdue && !submission && daysUntilDue <= 3 && (
                    <span className="ml-1 text-amber-600 font-medium">
                      ({daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'} left)
                    </span>
                  )}
                  {isOverdue && !submission && (
                    <span className="ml-1 font-bold">(Overdue)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Award className="h-4 w-4" />
                <span>{activity.totalMarks} marks</span>
              </div>
              {activity.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Paperclip className="h-4 w-4" />
                  <span>{activity.attachments.length} {activity.attachments.length === 1 ? 'attachment' : 'attachments'}</span>
                </div>
              )}
            </div>

            {/* Submission Info */}
            {submission && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Submitted on {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                    {submission.status === 'graded' && submission.marksObtained !== undefined && (
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        Score: {submission.marksObtained}/{activity.totalMarks} ({submission.percentage?.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                  {submission.status === 'graded' && submission.feedback && (
                    <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      View Feedback
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => onViewDetails(activity)}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Details & Submit
              </button>
              {activity.attachments.length > 0 && (
                <button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Materials
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Detail Modal
function ActivityDetailModal({
  activity,
  submission,
  onClose,
  onSubmit
}: {
  activity: WeekActivity;
  submission?: ActivitySubmission;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [textContent, setTextContent] = useState(submission?.textContent || '');
  const [linkUrl, setLinkUrl] = useState(submission?.linkUrl || '');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        activityId: activity.id,
        textContent: activity.submissionType === 'text' || activity.submissionType === 'multiple' ? textContent : undefined,
        linkUrl: activity.submissionType === 'link' || activity.submissionType === 'multiple' ? linkUrl : undefined,
        files: activity.submissionType === 'file' || activity.submissionType === 'multiple' ? files : []
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = submission?.status !== 'graded';
  const dueDate = new Date(activity.dueDate);
  const isOverdue = isAfter(new Date(), dueDate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium uppercase">
                {activity.type}
              </span>
            </div>
            <h2 className="text-2xl font-bold">{activity.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-bold text-gray-800 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{activity.description}</p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Instructions
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{activity.instructions}</p>
          </div>

          {/* Meta Info */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Due Date</p>
              <p className={`font-bold ${isOverdue && canSubmit ? 'text-red-600' : 'text-gray-800'}`}>
                {format(dueDate, 'MMM d, yyyy h:mm a')}
              </p>
              {isOverdue && canSubmit && (
                <p className="text-xs text-red-600 mt-1">Overdue</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Marks</p>
              <p className="text-2xl font-bold text-gray-800">{activity.totalMarks}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Late Submission</p>
              <p className="font-bold text-gray-800">
                {activity.lateSubmissionAllowed ? `Allowed (-${activity.latePenaltyPercentage}%)` : 'Not Allowed'}
              </p>
            </div>
          </div>

          {/* Attachments */}
          {activity.attachments.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-emerald-600" />
                Activity Materials
              </h3>
              <div className="space-y-2">
                {activity.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                  >
                    <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{attachment.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Previous Submission */}
          {submission && (
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Your Submission
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Submitted on {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
              </p>
              {submission.status === 'graded' && (
                <>
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Your Score</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {submission.marksObtained}/{activity.totalMarks}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Percentage</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {submission.percentage?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {submission.feedback && (
                    <div className="bg-white rounded-lg p-3 border border-emerald-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">Teacher Feedback:</p>
                      <p className="text-gray-600">{submission.feedback}</p>
                    </div>
                  )}
                </>
              )}
              {submission.status === 'submitted' && (
                <p className="text-sm text-gray-600">⏳ Waiting for teacher review</p>
              )}
            </div>
          )}

          {/* Submission Form */}
          {canSubmit && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Submit Your Work
              </h3>

              {(activity.submissionType === 'text' || activity.submissionType === 'multiple') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Type your answer here..."
                  />
                </div>
              )}

              {(activity.submissionType === 'link' || activity.submissionType === 'multiple') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link URL
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              )}

              {(activity.submissionType === 'file' || activity.submissionType === 'multiple') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Files
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      multiple={activity.submissionType === 'multiple'}
                      accept={activity.allowedFileTypes?.join(',')}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600 font-medium">Click to upload files</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Max size: {activity.maxFileSize_mb}MB
                        {activity.allowedFileTypes && ` • ${activity.allowedFileTypes.join(', ')}`}
                      </p>
                    </label>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <FileText className="h-5 w-5 text-emerald-600" />
                          <span className="flex-1 text-sm text-gray-700">{file.name}</span>
                          <button
                            onClick={() => setFiles(files.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {canSubmit && (
          <div className="border-t border-gray-200 p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Assignment
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
