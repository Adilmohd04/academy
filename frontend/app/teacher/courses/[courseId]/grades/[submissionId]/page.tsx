"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowLeft,
  FileText,
  Link2,
  Type,
  Loader2,
  CheckCircle,
  Clock,
  ExternalLink,
  Download,
  Send,
  AlertCircle,
  MessageSquare,
  Calendar,
  User,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

interface SubmissionDetail {
  id: string;
  lesson_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  assignment_title: string;
  assignment_details: any;
  deadline: string | null;
  week_number: number | null;
  week_title: string;
  submitted_at: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  link_url: string | null;
  text_content: string | null;
  submission_text: string | null;
  submission_type: string;
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  status: string;
  graded_at: string | null;
  graded_by: string | null;
  is_late: boolean;
  attempt_number: number | null;
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const courseId = params.courseId as string;
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradeValue, setGradeValue] = useState<string>("");
  const [feedbackValue, setFeedbackValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (courseId && submissionId && userId) {
      loadSubmission();
    }
  }, [courseId, submissionId, userId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/teacher/courses/${courseId}/submissions/${submissionId}`,
        { headers: { "x-clerk-user-id": userId || "" } }
      );
      if (res.ok) {
        const data = await res.json();
        const sub = data.submission;
        setSubmission(sub);
        setGradeValue(sub.grade?.toString() || "");
        setFeedbackValue(sub.feedback || "");
      }
    } catch (err) {
      console.error("Failed to load submission:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!submission || gradeValue === "") return;
    setSubmitting(true);
    setSuccess(false);

    try {
      const res = await fetch(
        `${API_URL}/api/teacher/courses/${courseId}/submissions/${submissionId}/grade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-clerk-user-id": userId || "",
          },
          body: JSON.stringify({
            grade: Number(gradeValue),
            feedback: feedbackValue.trim() || null,
          }),
        }
      );

      if (res.ok) {
        setSuccess(true);
        await loadSubmission();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to grade submission");
      }
    } catch (err) {
      console.error("Failed to grade:", err);
      alert("Failed to grade submission");
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          Submission not found
        </h2>
        <button
          onClick={() => router.push(`/teacher/courses/${courseId}/grades`)}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Back to Submissions
        </button>
      </div>
    );
  }

  const isGraded = submission.status === "graded";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push(`/teacher/courses/${courseId}/grades`)}
        className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-700 font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Submissions
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{submission.assignment_title}</h1>
              <p className="text-emerald-100 mt-1">
                {submission.week_number
                  ? `Week ${submission.week_number}: ${submission.week_title}`
                  : "Assignment Submission"}
              </p>
            </div>
            {isGraded ? (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-emerald-100">Grade</p>
                <p className="text-2xl font-bold">
                  {submission.grade}/{submission.max_grade}
                </p>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/90 text-yellow-900 text-sm font-medium rounded-full">
                <Clock className="w-3.5 h-3.5" />
                Awaiting Grade
              </span>
            )}
          </div>
        </div>

        {/* Student Info */}
        <div className="px-6 py-4 flex items-center gap-4 bg-slate-50 border-b border-slate-200">
          <div className="w-11 h-11 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-lg">
              {submission.student_name?.charAt(0) || "S"}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">
              {submission.student_name}
            </p>
            <p className="text-sm text-slate-500">{submission.student_email}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                Submitted{" "}
                {new Date(submission.submitted_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                at{" "}
                {new Date(submission.submitted_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {submission.is_late && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                LATE
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Submission Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submission Content Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              {submission.submission_type === "file" ? (
                <FileText className="w-5 h-5 text-blue-600" />
              ) : submission.submission_type === "link" ? (
                <Link2 className="w-5 h-5 text-purple-600" />
              ) : (
                <Type className="w-5 h-5 text-slate-600" />
              )}
              <h2 className="font-semibold text-slate-800">
                Student&apos;s Submission
              </h2>
              <span className="ml-auto text-xs text-slate-400 capitalize">
                {submission.submission_type || "text"} submission
              </span>
            </div>

            <div className="p-6">
              {/* File submission */}
              {submission.submission_type === "file" && submission.file_url ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-900 truncate">
                        {submission.file_name || "Submitted File"}
                      </p>
                      {submission.file_size && (
                        <p className="text-sm text-blue-600">
                          {formatFileSize(submission.file_size)}
                        </p>
                      )}
                    </div>
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      View / Download
                    </a>
                  </div>
                </div>
              ) : /* Link submission */
              submission.submission_type === "link" && submission.link_url ? (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Link2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-purple-900 mb-1">
                          Submitted Link
                        </p>
                        <p className="text-sm text-purple-600 truncate">
                          {submission.link_url}
                        </p>
                      </div>
                    </div>
                    <a
                      href={submission.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Link in New Tab
                    </a>
                  </div>
                </div>
              ) : (
                /* Text submission */
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {submission.text_content ||
                      submission.submission_text ||
                      "No text content provided"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Description */}
          {submission.assignment_details?.description && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">
                  Assignment Description
                </h2>
              </div>
              <div className="p-6">
                <p className="text-slate-700 whitespace-pre-wrap">
                  {submission.assignment_details.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Grade & Comment */}
        <div className="space-y-6">
          {/* Grade Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-800">
                {isGraded ? "Update Grade" : "Grade Submission"}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Success message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">
                    Grade saved successfully!
                  </p>
                </div>
              )}

              {/* Grade Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Grade (out of {submission.max_grade})
                </label>
                <input
                  type="number"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  min="0"
                  max={submission.max_grade}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-medium"
                  placeholder={`0 - ${submission.max_grade}`}
                />
                {gradeValue !== "" && (
                  <p className="text-xs text-slate-500 mt-1">
                    {Math.round(
                      (Number(gradeValue) / submission.max_grade) * 100
                    )}
                    % score
                  </p>
                )}
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Comment / Feedback
                </label>
                <textarea
                  value={feedbackValue}
                  onChange={(e) => setFeedbackValue(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="Write your feedback or comments for this student..."
                />
              </div>

              {/* Submit button */}
              <button
                onClick={handleGrade}
                disabled={submitting || gradeValue === ""}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting
                  ? "Saving..."
                  : isGraded
                  ? "Update Grade & Comment"
                  : "Submit Grade"}
              </button>
            </div>
          </div>

          {/* Grading Info */}
          {isGraded && submission.graded_at && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-5">
              <h3 className="font-semibold text-green-800 text-sm mb-3">
                Grading History
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Status:</span>
                  <span className="font-medium text-green-900 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Graded
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Graded on:</span>
                  <span className="font-medium text-green-900">
                    {new Date(submission.graded_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Score:</span>
                  <span className="font-bold text-green-900">
                    {submission.grade}/{submission.max_grade} (
                    {Math.round(
                      ((submission.grade || 0) / submission.max_grade) * 100
                    )}
                    %)
                  </span>
                </div>
              </div>
              {submission.feedback && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">
                    Your comment:
                  </p>
                  <p className="text-sm text-green-900">
                    {submission.feedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Assignment Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">
              Assignment Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Max Grade:</span>
                <span className="font-medium text-slate-800">
                  {submission.max_grade}
                </span>
              </div>
              {submission.deadline && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Deadline:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(submission.deadline).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {submission.attempt_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Attempt:</span>
                  <span className="font-medium text-slate-800">
                    #{submission.attempt_number}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
