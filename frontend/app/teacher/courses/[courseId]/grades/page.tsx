"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  FileText,
  Link2,
  Type,
  Loader2,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  AlertCircle,
  Eye,
  ArrowLeft,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Assignment {
  lesson_id: string;
  title: string;
  deadline: string | null;
  max_grade: number;
  week_number: number;
  week_title: string;
}

interface Submission {
  id: string;
  lesson_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  assignment_title: string;
  week_number: number;
  week_title: string;
  submitted_at: string;
  file_url: string | null;
  file_name: string | null;
  link_url: string | null;
  text_content: string | null;
  submission_text: string | null;
  submission_type: string;
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  status: string;
  graded_at: string | null;
  is_late: boolean;
}

export default function TeacherSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "pending" | "graded">("all");

  useEffect(() => {
    if (courseId) {
      void loadData();
    }
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session is unavailable. Please sign in again.");
      const res = await fetch(
        `${API_URL}/api/teacher/courses/${courseId}/assignment-submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        setSubmissions(data.submissions || []);
        // Expand all weeks by default
        const weekNums = new Set<number>(
          (data.assignments || []).map((a: Assignment) => a.week_number)
        );
        setExpandedWeeks(weekNums);
      }
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  // Group assignments by week
  const weekGroups = assignments.reduce<
    Record<number, { week_title: string; assignments: Assignment[] }>
  >((acc, a) => {
    if (!acc[a.week_number]) {
      acc[a.week_number] = { week_title: a.week_title, assignments: [] };
    }
    acc[a.week_number].assignments.push(a);
    return acc;
  }, {});

  const getSubmissions = (lessonId: string) => {
    let subs = submissions.filter((s) => s.lesson_id === lessonId);
    if (filter === "pending") subs = subs.filter((s) => s.status !== "graded");
    if (filter === "graded") subs = subs.filter((s) => s.status === "graded");
    return subs;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "link":
        return <Link2 className="w-4 h-4 text-purple-500" />;
      default:
        return <Type className="w-4 h-4 text-gray-500" />;
    }
  };

  const totalSubmissions = submissions.length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  const pendingCount = totalSubmissions - gradedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">
          Assignment Submissions
        </h1>
        <p className="text-slate-600">
          Review and grade student assignment submissions, organized by week
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Total Submissions</p>
          <p className="text-2xl font-bold text-slate-800">{totalSubmissions}</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <p className="text-sm text-yellow-700">Pending Review</p>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-700">Graded</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{gradedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "graded"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All" : f === "pending" ? "Pending" : "Graded"}
          </button>
        ))}
      </div>

      {/* Week-wise Assignment List */}
      {Object.keys(weekGroups).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No assignments found
          </h3>
          <p className="text-slate-500">
            Create assignments in the course builder to see submissions here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(weekGroups)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([weekNum, group]) => {
              const wn = Number(weekNum);
              const isExpanded = expandedWeeks.has(wn);
              const weekSubs = submissions.filter((s) =>
                group.assignments.some((a) => a.lesson_id === s.lesson_id)
              );
              const weekGraded = weekSubs.filter(
                (s) => s.status === "graded"
              ).length;

              return (
                <div
                  key={weekNum}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  {/* Week Header */}
                  <button
                    onClick={() => toggleWeek(wn)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left bg-gradient-to-r from-slate-50 to-white"
                  >
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">
                        Week {weekNum}: {group.week_title}
                      </h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {group.assignments.length} assignment
                        {group.assignments.length !== 1 ? "s" : ""} &middot;{" "}
                        {weekSubs.length} submission
                        {weekSubs.length !== 1 ? "s" : ""} &middot;{" "}
                        {weekGraded}/{weekSubs.length} graded
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {/* Week Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      {group.assignments.map((assignment) => {
                        const subs = getSubmissions(assignment.lesson_id);
                        return (
                          <div key={assignment.lesson_id}>
                            {/* Assignment sub-header */}
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold text-slate-700">
                                  {assignment.title}
                                </span>
                                <span className="text-xs text-slate-400">
                                  Max: {assignment.max_grade} marks
                                </span>
                              </div>
                              {assignment.deadline && (
                                <span className="text-xs text-slate-500">
                                  Due:{" "}
                                  {new Date(
                                    assignment.deadline
                                  ).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              )}
                            </div>

                            {/* Submissions for this assignment */}
                            {subs.length === 0 ? (
                              <div className="px-5 py-6 text-center text-slate-400 text-sm border-b border-slate-100">
                                No {filter !== "all" ? filter : ""} submissions
                                for this assignment
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {subs.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() =>
                                      router.push(
                                        `/teacher/courses/${courseId}/grades/${sub.id}`
                                      )
                                    }
                                  >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                      {/* Avatar */}
                                      <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-emerald-700 font-semibold text-sm">
                                          {sub.student_name?.charAt(0) || "S"}
                                        </span>
                                      </div>

                                      {/* Student & type info */}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium text-slate-800 truncate">
                                            {sub.student_name}
                                          </p>
                                          {sub.is_late && (
                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-medium rounded">
                                              LATE
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {getTypeIcon(sub.submission_type)}
                                          <span className="text-xs text-slate-500 capitalize">
                                            {sub.submission_type || "text"}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            &middot;{" "}
                                            {new Date(
                                              sub.submitted_at
                                            ).toLocaleDateString("en-IN", {
                                              day: "2-digit",
                                              month: "short",
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Grade & status */}
                                    <div className="flex items-center gap-4">
                                      {sub.status === "graded" ? (
                                        <div className="text-right">
                                          <span className="text-lg font-bold text-green-700">
                                            {sub.grade}
                                          </span>
                                          <span className="text-sm text-slate-400">
                                            /{sub.max_grade}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                          <Clock className="w-3 h-3" />
                                          Pending
                                        </span>
                                      )}
                                      <Eye className="w-4 h-4 text-slate-400" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
