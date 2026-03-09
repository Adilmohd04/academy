'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  BookOpen, Calendar, Clock, Play, CheckCircle, Users, 
  Video, FileText, Award, ChevronDown, ChevronRight,
  Radio, Lock, Unlock, PlayCircle, MessageSquare, Star,
  ClipboardList, GraduationCap, Trophy, AlertCircle,
  Upload, Mic, Camera, HelpCircle, Timer, Target, Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, isPast, isFuture } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ==================== TYPES ====================

interface CourseWeek {
  id: string;
  week_number: number;
  title: string;
  description?: string;
  status: 'locked' | 'current' | 'completed';
  unlock_date?: string;
  liveClasses: LiveClass[];
  lessons: Lesson[];
  quiz?: Quiz;
  assignment?: Assignment;
  progress_percentage: number;
}

interface LiveClass {
  id: string;
  title: string;
  topic: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string;
  recording_url?: string;
  status: 'upcoming' | 'live' | 'completed';
  teacher_name: string;
  attended?: boolean;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'audio';
  duration_minutes?: number;
  completed: boolean;
  content_url?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions_count: number;
  time_limit_minutes?: number;
  attempts_allowed: number;
  attempts_used: number;
  best_score?: number;
  status: 'not_started' | 'in_progress' | 'completed';
  deadline?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'file_upload' | 'text' | 'video' | 'audio';
  deadline: string;
  max_marks: number;
  submitted?: boolean;
  marks_obtained?: number;
  feedback?: string;
  status: 'pending' | 'submitted' | 'graded';
}

interface FinalExam {
  id: string;
  title: string;
  type: 'quiz' | 'video_upload' | 'audio_upload' | 'interview';
  scheduled_at?: string;
  deadline?: string;
  duration_minutes?: number;
  max_marks: number;
  status: 'locked' | 'available' | 'in_progress' | 'submitted' | 'graded';
  marks_obtained?: number;
  feedback?: string;
  answers_released?: boolean;
  answers_release_date?: string;
}

interface CourseGrading {
  activity_weight: number; // e.g., 40
  final_exam_weight: number; // e.g., 60
  activity_score: number;
  final_exam_score?: number;
  total_score?: number;
  grade?: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  teacher_name: string;
  teacher_image?: string;
  weeks: CourseWeek[];
  final_exam?: FinalExam;
  grading: CourseGrading;
  progress_percentage: number;
  certificate_eligible: boolean;
}

// ==================== COMPONENTS ====================

// Tab Navigation
function TabNavigation({ 
  activeTab, 
  onTabChange,
  hasNewContent
}: { 
  activeTab: string; 
  onTabChange: (tab: string) => void;
  hasNewContent?: { schedule?: boolean; grades?: boolean };
}) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'schedule', label: 'Schedule', icon: Calendar, hasNew: hasNewContent?.schedule },
    { id: 'grades', label: 'Grades', icon: Award, hasNew: hasNewContent?.grades },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1B365D] text-[#1B365D]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.hasNew && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status, type = 'class' }: { status: string; type?: 'class' | 'assignment' | 'exam' }) {
  const configs: Record<string, { bg: string; text: string; icon?: React.ReactNode; label: string }> = {
    // Live Class statuses
    live: { bg: 'bg-red-100', text: 'text-red-700', icon: <Radio className="h-3 w-3 animate-pulse" />, label: 'LIVE' },
    upcoming: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="h-3 w-3" />, label: 'Upcoming' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed' },
    // Assignment statuses  
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="h-3 w-3" />, label: 'Pending' },
    submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircle className="h-3 w-3" />, label: 'Submitted' },
    graded: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Star className="h-3 w-3" />, label: 'Graded' },
    // Exam statuses
    locked: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <Lock className="h-3 w-3" />, label: 'Locked' },
    available: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <Unlock className="h-3 w-3" />, label: 'Available' },
    in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Timer className="h-3 w-3" />, label: 'In Progress' },
  };

  const config = configs[status] || configs.pending;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 ${config.bg} ${config.text} text-xs font-medium rounded-full`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Week Section Component
function WeekSection({ 
  week, 
  isExpanded, 
  onToggle,
  onJoinClass,
  onWatchRecording,
  onStartQuiz,
  onViewAssignment,
  onStartLesson
}: { 
  week: CourseWeek;
  isExpanded: boolean;
  onToggle: () => void;
  onJoinClass: (id: string) => void;
  onWatchRecording: (id: string) => void;
  onStartQuiz: (id: string) => void;
  onViewAssignment: (id: string) => void;
  onStartLesson: (id: string) => void;
}) {
  const isLocked = week.status === 'locked';
  const isCurrent = week.status === 'current';
  const liveNow = week.liveClasses.find(c => c.status === 'live');
  
  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
      isCurrent ? 'border-[#C5A059] shadow-lg shadow-[#C5A059]/10' : 
      isLocked ? 'border-gray-200 opacity-60' : 'border-gray-200'
    }`}>
      {/* Week Header */}
      <button
        onClick={onToggle}
        disabled={isLocked}
        className={`w-full p-4 flex items-center justify-between ${
          isLocked ? 'cursor-not-allowed' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCurrent ? 'bg-[#C5A059] text-white' :
            week.status === 'completed' ? 'bg-green-500 text-white' :
            'bg-gray-200 text-gray-500'
          }`}>
            {isLocked ? <Lock className="h-5 w-5" /> :
             week.status === 'completed' ? <CheckCircle className="h-5 w-5" /> :
             <span className="font-bold">{week.week_number}</span>}
          </div>
          
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1B365D]">Week {week.week_number}: {week.title}</h3>
              {isCurrent && (
                <span className="px-2 py-0.5 bg-[#C5A059] text-white text-xs font-medium rounded-full">
                  Current
                </span>
              )}
              {liveNow && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full animate-pulse">
                  🔴 LIVE NOW
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {week.liveClasses.length} classes • {week.lessons.length} lessons
              {week.quiz && ' • Quiz'}
              {week.assignment && ' • Assignment'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Progress */}
          {!isLocked && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#C5A059] rounded-full transition-all"
                  style={{ width: `${week.progress_percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">{week.progress_percentage}%</span>
            </div>
          )}
          
          {!isLocked && (
            isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : 
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Week Content */}
      {isExpanded && !isLocked && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Live Classes */}
          {week.liveClasses.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Video className="h-4 w-4" />
                Live Classes
              </h4>
              <div className="space-y-2">
                {week.liveClasses.map((cls) => (
                  <div 
                    key={cls.id}
                    className={`p-4 rounded-xl border ${
                      cls.status === 'live' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={cls.status} />
                          <span className="text-xs text-gray-500">
                            {format(new Date(cls.scheduled_at), 'EEE, MMM d • h:mm a')}
                          </span>
                        </div>
                        <h5 className="font-medium text-[#1B365D]">{cls.title}</h5>
                        <p className="text-sm text-gray-500 mt-1">Topic: {cls.topic}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {cls.duration_minutes} min • {cls.teacher_name}
                        </p>
                      </div>
                      
                      <div className="ml-4">
                        {cls.status === 'live' && (
                          <button
                            onClick={() => onJoinClass(cls.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 animate-pulse"
                          >
                            <Play className="h-4 w-4" />
                            Join Now
                          </button>
                        )}
                        {cls.status === 'upcoming' && (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                          >
                            <Clock className="h-4 w-4 inline mr-1" />
                            Starts {formatDistanceToNow(new Date(cls.scheduled_at), { addSuffix: true })}
                          </button>
                        )}
                        {cls.status === 'completed' && cls.recording_url && (
                          <button
                            onClick={() => onWatchRecording(cls.id)}
                            className="px-4 py-2 bg-[#1B365D] text-white rounded-lg text-sm font-medium hover:bg-[#1B365D]/90 flex items-center gap-2"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Watch Recording
                          </button>
                        )}
                        {cls.status === 'completed' && !cls.recording_url && (
                          <span className="text-xs text-gray-400">
                            {cls.attended ? '✓ Attended' : 'Missed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Lessons/Videos */}
          {week.lessons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Lessons
              </h4>
              <div className="space-y-2">
                {week.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => onStartLesson(lesson.id)}
                    className="w-full p-3 rounded-lg border border-gray-200 bg-white hover:border-[#C5A059] hover:shadow-sm transition-all flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      lesson.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {lesson.type === 'video' ? <PlayCircle className="h-5 w-5" /> :
                       lesson.type === 'audio' ? <Mic className="h-5 w-5" /> :
                       <FileText className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 text-left">
                      <h5 className="font-medium text-[#1B365D]">{lesson.title}</h5>
                      <p className="text-xs text-gray-400">
                        {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
                        {lesson.duration_minutes && ` • ${lesson.duration_minutes} min`}
                      </p>
                    </div>
                    {lesson.completed && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Quiz */}
          {week.quiz && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Weekly Quiz</span>
                    <StatusBadge status={week.quiz.status} type="exam" />
                  </div>
                  <h5 className="font-medium text-[#1B365D]">{week.quiz.title}</h5>
                  <p className="text-sm text-gray-500 mt-1">
                    {week.quiz.questions_count} questions
                    {week.quiz.time_limit_minutes && ` • ${week.quiz.time_limit_minutes} min limit`}
                    {week.quiz.deadline && ` • Due ${format(new Date(week.quiz.deadline), 'MMM d')}`}
                  </p>
                  {week.quiz.best_score !== undefined && (
                    <p className="text-sm text-green-600 mt-1 font-medium">
                      Best Score: {week.quiz.best_score}%
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => onStartQuiz(week.quiz!.id)}
                  disabled={week.quiz.status === 'completed' && week.quiz.attempts_used >= week.quiz.attempts_allowed}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    week.quiz.status === 'not_started' ? 'bg-purple-600 text-white hover:bg-purple-700' :
                    week.quiz.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                    'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {week.quiz.status === 'not_started' ? 'Start Quiz' :
                   week.quiz.status === 'in_progress' ? 'Continue Quiz' :
                   'View Results'}
                </button>
              </div>
            </div>
          )}
          
          {/* Assignment */}
          {week.assignment && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {week.assignment.type === 'video' ? <Camera className="h-4 w-4 text-blue-600" /> :
                     week.assignment.type === 'audio' ? <Mic className="h-4 w-4 text-blue-600" /> :
                     <Upload className="h-4 w-4 text-blue-600" />}
                    <span className="text-sm font-medium text-blue-700">Assignment</span>
                    <StatusBadge status={week.assignment.status} type="assignment" />
                  </div>
                  <h5 className="font-medium text-[#1B365D]">{week.assignment.title}</h5>
                  <p className="text-sm text-gray-500 mt-1">
                    {week.assignment.type.replace('_', ' ')} submission
                    • Due {format(new Date(week.assignment.deadline), 'MMM d, h:mm a')}
                  </p>
                  {week.assignment.marks_obtained !== undefined && (
                    <p className="text-sm text-green-600 mt-1 font-medium">
                      Score: {week.assignment.marks_obtained}/{week.assignment.max_marks}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => onViewAssignment(week.assignment!.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    week.assignment.status === 'pending' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {week.assignment.status === 'pending' ? 'Submit' : 'View'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Final Exam Section Component
function FinalExamSection({ 
  exam, 
  onStart 
}: { 
  exam: FinalExam;
  onStart: (id: string) => void;
}) {
  const isAvailable = exam.status === 'available';
  const isLocked = exam.status === 'locked';
  
  const typeIcons = {
    quiz: <ClipboardList className="h-6 w-6" />,
    video_upload: <Camera className="h-6 w-6" />,
    audio_upload: <Mic className="h-6 w-6" />,
    interview: <Users className="h-6 w-6" />
  };
  
  const typeLabels = {
    quiz: 'Online Quiz',
    video_upload: 'Video Submission',
    audio_upload: 'Audio Submission',
    interview: 'Live Interview'
  };

  return (
    <div className={`bg-gradient-to-br rounded-2xl p-6 border-2 ${
      isLocked ? 'from-gray-50 to-gray-100 border-gray-200' :
      isAvailable ? 'from-[#C5A059]/10 to-amber-50 border-[#C5A059]' :
      'from-green-50 to-emerald-50 border-green-300'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          isLocked ? 'bg-gray-200 text-gray-500' :
          isAvailable ? 'bg-[#C5A059] text-white' :
          'bg-green-500 text-white'
        }`}>
          {isLocked ? <Lock className="h-6 w-6" /> : typeIcons[exam.type]}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-[#1B365D]" />
            <span className="text-sm font-medium text-gray-600">Final Exam</span>
            <StatusBadge status={exam.status} type="exam" />
          </div>
          
          <h3 className="text-xl font-bold text-[#1B365D] mb-2">{exam.title}</h3>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {typeLabels[exam.type]}
            </span>
            {exam.duration_minutes && (
              <span className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                {exam.duration_minutes} minutes
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {exam.max_marks} marks
            </span>
            {exam.scheduled_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(exam.scheduled_at), 'MMM d, h:mm a')}
              </span>
            )}
            {exam.deadline && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Due: {format(new Date(exam.deadline), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
          
          {/* Graded Info */}
          {exam.status === 'graded' && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Your Score:</span>
                <span className="text-2xl font-bold text-[#1B365D]">
                  {exam.marks_obtained}/{exam.max_marks}
                </span>
              </div>
              {exam.feedback && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600"><strong>Feedback:</strong> {exam.feedback}</p>
                </div>
              )}
              {exam.answers_released && (
                <button className="mt-3 text-sm text-[#C5A059] font-medium hover:underline">
                  View Correct Answers →
                </button>
              )}
              {!exam.answers_released && exam.answers_release_date && (
                <p className="mt-3 text-xs text-gray-400">
                  Answers will be released on {format(new Date(exam.answers_release_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          )}
          
          {/* Action Button */}
          {isLocked && (
            <div className="flex items-center gap-2 text-gray-500">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Complete all weeks to unlock</span>
            </div>
          )}
          
          {isAvailable && (
            <button
              onClick={() => onStart(exam.id)}
              className="px-6 py-3 bg-[#C5A059] text-white rounded-xl font-medium hover:bg-[#B8934D] transition-colors flex items-center gap-2"
            >
              <Play className="h-5 w-5" />
              Start Final Exam
            </button>
          )}
          
          {exam.status === 'submitted' && (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Awaiting teacher review...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Grading Overview Component
function GradingOverview({ grading, finalExam }: { grading: CourseGrading; finalExam?: FinalExam }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-[#1B365D] mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#C5A059]" />
        Your Grades
      </h3>
      
      {/* Grade Distribution */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Activities</span>
            <span className="text-xs text-gray-400">{grading.activity_weight}%</span>
          </div>
          <div className="text-2xl font-bold text-[#1B365D]">
            {grading.activity_score.toFixed(1)}%
          </div>
          <div className="w-full h-2 bg-blue-200 rounded-full mt-2">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${grading.activity_score}%` }}
            />
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Final Exam</span>
            <span className="text-xs text-gray-400">{grading.final_exam_weight}%</span>
          </div>
          <div className="text-2xl font-bold text-[#1B365D]">
            {grading.final_exam_score !== undefined ? `${grading.final_exam_score.toFixed(1)}%` : '—'}
          </div>
          <div className="w-full h-2 bg-purple-200 rounded-full mt-2">
            <div 
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${grading.final_exam_score || 0}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Total Grade */}
      {grading.total_score !== undefined && (
        <div className="p-4 bg-gradient-to-br from-[#1B365D] to-[#2a4a7d] rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Grade</p>
              <p className="text-3xl font-bold">{grading.total_score.toFixed(1)}%</p>
            </div>
            {grading.grade && (
              <div className="w-16 h-16 bg-[#C5A059] rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">{grading.grade}</span>
              </div>
            )}
          </div>
          <p className="text-xs opacity-60 mt-2">
            ({grading.activity_weight}% Activities + {grading.final_exam_weight}% Final Exam)
          </p>
        </div>
      )}
      
      {/* Grade Formula */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
        <strong>Grading Formula:</strong> Activity Score × {grading.activity_weight/100} + Final Exam Score × {grading.final_exam_weight/100}
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.id as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Mock data for demonstration
  useEffect(() => {
    // Simulating API call
    setTimeout(() => {
      setCourse({
        id: courseId,
        title: 'Arabic Language Fundamentals',
        description: 'Master the foundations of Arabic language including grammar, vocabulary, and conversation skills.',
        thumbnail: '',
        teacher_name: 'Ustadh Ahmad',
        teacher_image: '',
        progress_percentage: 65,
        certificate_eligible: false,
        grading: {
          activity_weight: 40,
          final_exam_weight: 60,
          activity_score: 78.5,
          final_exam_score: undefined,
          total_score: undefined,
          grade: undefined
        },
        weeks: [
          {
            id: 'week-1',
            week_number: 1,
            title: 'Introduction to Arabic',
            status: 'completed',
            progress_percentage: 100,
            liveClasses: [
              {
                id: 'class-1',
                title: 'Welcome & Course Overview',
                topic: 'Introduction to Arabic Script',
                scheduled_at: '2024-12-20T10:00:00Z',
                duration_minutes: 60,
                status: 'completed',
                teacher_name: 'Ustadh Ahmad',
                recording_url: '/recordings/class-1',
                attended: true
              },
              {
                id: 'class-2',
                title: 'Arabic Alphabet',
                topic: 'Learning the 28 Letters',
                scheduled_at: '2024-12-22T10:00:00Z',
                duration_minutes: 45,
                status: 'completed',
                teacher_name: 'Ustadh Ahmad',
                recording_url: '/recordings/class-2',
                attended: true
              }
            ],
            lessons: [
              { id: 'l1', title: 'Arabic Script History', type: 'video', duration_minutes: 15, completed: true },
              { id: 'l2', title: 'Pronunciation Guide', type: 'audio', duration_minutes: 20, completed: true }
            ],
            quiz: {
              id: 'q1',
              title: 'Week 1 Assessment',
              questions_count: 10,
              time_limit_minutes: 15,
              attempts_allowed: 3,
              attempts_used: 1,
              best_score: 85,
              status: 'completed'
            },
            assignment: {
              id: 'a1',
              title: 'Record Yourself',
              description: 'Record yourself pronouncing the Arabic alphabet',
              type: 'audio',
              deadline: '2024-12-25T23:59:00Z',
              max_marks: 20,
              submitted: true,
              marks_obtained: 18,
              status: 'graded'
            }
          },
          {
            id: 'week-2',
            week_number: 2,
            title: 'Basic Grammar',
            status: 'current',
            progress_percentage: 45,
            liveClasses: [
              {
                id: 'class-3',
                title: 'Noun Cases Introduction',
                topic: 'إعراب Basics',
                scheduled_at: new Date().toISOString(),
                duration_minutes: 60,
                status: 'live',
                teacher_name: 'Ustadh Ahmad',
                meeting_url: 'https://meet.google.com/abc'
              },
              {
                id: 'class-4',
                title: 'Verb Conjugation',
                topic: 'Past Tense Verbs',
                scheduled_at: '2024-12-31T10:00:00Z',
                duration_minutes: 45,
                status: 'upcoming',
                teacher_name: 'Ustadh Ahmad'
              }
            ],
            lessons: [
              { id: 'l3', title: 'Grammar Overview', type: 'video', duration_minutes: 25, completed: true },
              { id: 'l4', title: 'Practice Exercises', type: 'reading', completed: false }
            ],
            quiz: {
              id: 'q2',
              title: 'Grammar Quiz',
              questions_count: 15,
              time_limit_minutes: 20,
              attempts_allowed: 2,
              attempts_used: 0,
              status: 'not_started',
              deadline: '2025-01-05T23:59:00Z'
            },
            assignment: {
              id: 'a2',
              title: 'Sentence Construction',
              description: 'Write 10 sentences using correct grammar',
              type: 'file_upload',
              deadline: '2025-01-03T23:59:00Z',
              max_marks: 25,
              status: 'pending'
            }
          },
          {
            id: 'week-3',
            week_number: 3,
            title: 'Vocabulary Building',
            status: 'locked',
            unlock_date: '2025-01-06T00:00:00Z',
            progress_percentage: 0,
            liveClasses: [],
            lessons: []
          }
        ],
        final_exam: {
          id: 'final-1',
          title: 'Arabic Fundamentals Final Exam',
          type: 'quiz',
          scheduled_at: '2025-01-20T10:00:00Z',
          deadline: '2025-01-20T12:00:00Z',
          duration_minutes: 90,
          max_marks: 100,
          status: 'locked'
        }
      });
      setLoading(false);
      
      // Auto-expand current week
      setExpandedWeeks(new Set(['week-2']));
    }, 500);
  }, [courseId]);

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  };

  // Action handlers
  const handleJoinClass = (classId: string) => {
    // Open meeting URL
    console.log('Joining class:', classId);
    window.open('https://meet.google.com/abc', '_blank');
  };

  const handleWatchRecording = (classId: string) => {
    router.push(`/student/courses/${courseId}/recording/${classId}`);
  };

  const handleStartQuiz = (quizId: string) => {
    router.push(`/student/courses/${courseId}/quiz/${quizId}`);
  };

  const handleViewAssignment = (assignmentId: string) => {
    router.push(`/student/courses/${courseId}/assignment/${assignmentId}`);
  };

  const handleStartLesson = (lessonId: string) => {
    router.push(`/student/courses/${courseId}/player?lesson=${lessonId}`);
  };

  const handleStartExam = (examId: string) => {
    router.push(`/student/courses/${courseId}/exam/${examId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Course Not Found</h2>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#1B365D] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-[#1B365D] to-[#2a4a7d] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center">
              <BookOpen className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <p className="text-white/70 mt-1">{course.teacher_name}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-white/20 rounded-full">
                    <div 
                      className="h-full bg-[#C5A059] rounded-full"
                      style={{ width: `${course.progress_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm">{course.progress_percentage}% complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        hasNewContent={{ schedule: true }}
      />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Weeks */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-[#1B365D] mb-4">Course Schedule</h2>
              
              {course.weeks.map((week) => (
                <WeekSection
                  key={week.id}
                  week={week}
                  isExpanded={expandedWeeks.has(week.id)}
                  onToggle={() => toggleWeek(week.id)}
                  onJoinClass={handleJoinClass}
                  onWatchRecording={handleWatchRecording}
                  onStartQuiz={handleStartQuiz}
                  onViewAssignment={handleViewAssignment}
                  onStartLesson={handleStartLesson}
                />
              ))}
              
              {/* Final Exam */}
              {course.final_exam && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-[#1B365D] mb-4 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Final Assessment
                  </h2>
                  <FinalExamSection 
                    exam={course.final_exam} 
                    onStart={handleStartExam}
                  />
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              <GradingOverview grading={course.grading} finalExam={course.final_exam} />
              
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="font-semibold text-[#1B365D] mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-[#C5A059]" />
                    <span className="text-sm font-medium text-gray-700">Ask a Question</span>
                  </button>
                  <button 
                    onClick={() => router.push(`/student/courses/${course.id}/discussions`)}
                    className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <Users className="h-5 w-5 text-[#C5A059]" />
                    <span className="text-sm font-medium text-gray-700">Discussion Forum</span>
                  </button>
                  <button className="w-full p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#C5A059]" />
                    <span className="text-sm font-medium text-gray-700">Course Materials</span>
                  </button>
                </div>
              </div>
              
              {/* Certificate */}
              {course.certificate_eligible && (
                <div className="bg-gradient-to-br from-[#C5A059] to-amber-500 rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <Award className="h-8 w-8" />
                    <div>
                      <h3 className="font-semibold">Certificate Ready!</h3>
                      <p className="text-xs opacity-80">You've completed this course</p>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-white text-[#C5A059] rounded-lg font-medium hover:bg-gray-100 transition-colors">
                    Download Certificate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#1B365D]">All Live Classes Schedule</h2>
            
            {course.weeks.filter(w => w.status !== 'locked').map((week) => (
              <div key={week.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-[#1B365D]">
                    Week {week.week_number}: {week.title}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {week.liveClasses.length > 0 ? week.liveClasses.map((cls) => (
                    <div key={cls.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          cls.status === 'live' ? 'bg-red-100 text-red-600' :
                          cls.status === 'completed' ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {cls.status === 'live' ? <Radio className="h-6 w-6 animate-pulse" /> :
                           cls.status === 'completed' ? <CheckCircle className="h-6 w-6" /> :
                           <Calendar className="h-6 w-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[#1B365D]">{cls.title}</h4>
                            <StatusBadge status={cls.status} />
                          </div>
                          <p className="text-sm text-gray-500">Topic: {cls.topic}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(cls.scheduled_at), 'EEEE, MMMM d, yyyy • h:mm a')} • {cls.duration_minutes} min
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        {cls.status === 'live' && (
                          <button
                            onClick={() => handleJoinClass(cls.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 animate-pulse"
                          >
                            Join Now
                          </button>
                        )}
                        {cls.status === 'upcoming' && (
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(cls.scheduled_at), { addSuffix: true })}
                          </span>
                        )}
                        {cls.status === 'completed' && cls.recording_url && (
                          <button
                            onClick={() => handleWatchRecording(cls.id)}
                            className="px-4 py-2 bg-[#1B365D] text-white rounded-lg font-medium hover:bg-[#1B365D]/90"
                          >
                            Watch Recording
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-gray-500">
                      No classes scheduled for this week
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <GradingOverview grading={course.grading} finalExam={course.final_exam} />
            
            {/* Detailed Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-[#1B365D]">Grade Breakdown</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {course.weeks.filter(w => w.quiz || w.assignment).map((week) => (
                  <div key={week.id} className="p-4">
                    <h4 className="font-medium text-gray-700 mb-3">Week {week.week_number}: {week.title}</h4>
                    <div className="space-y-2 pl-4">
                      {week.quiz && week.quiz.best_score !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Quiz: {week.quiz.title}</span>
                          <span className="font-medium text-[#1B365D]">{week.quiz.best_score}%</span>
                        </div>
                      )}
                      {week.assignment && week.assignment.marks_obtained !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Assignment: {week.assignment.title}</span>
                          <span className="font-medium text-[#1B365D]">
                            {week.assignment.marks_obtained}/{week.assignment.max_marks}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {course.final_exam && course.final_exam.marks_obtained !== undefined && (
                  <div className="p-4 bg-purple-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-700">Final Exam</span>
                      <span className="font-bold text-purple-700">
                        {course.final_exam.marks_obtained}/{course.final_exam.max_marks}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
