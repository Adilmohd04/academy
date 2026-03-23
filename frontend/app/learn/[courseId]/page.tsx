'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { 
  BookOpen, FileText, ClipboardList, ChevronRight, ChevronDown, 
  Loader2, Video, FileQuestion, BarChart3, Upload, 
  Link as LinkIcon, ArrowLeft, Home, MessageSquare, PlayCircle, Award, Calendar,
  CheckCircle, XCircle, AlertTriangle, Clock, ThumbsUp, ThumbsDown, Reply, Pencil, Trash2, Send, Pin
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'text' | 'quiz' | 'assignment' | 'resource';
  content_url?: string;
  content_url_en?: string;
  content_url_ta?: string;
  content_url_ar?: string;
  order_index: number;
  video_duration_minutes?: number;
  is_preview: boolean;
  is_published?: boolean;
  video_urls?: { language: string; url: string }[];
  completed?: boolean;
  deadline?: string;
  release_date?: string;
}

interface Module {
  id: string;
  week_number: number;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  long_description?: string;
  course_image_url?: string;
  thumbnail_url?: string;
  thumbnail_image?: string;
  category?: string;
  level?: string;
  teacher_name?: string;
  co_teachers?: Array<{
    id?: string;
    full_name?: string | null;
    email?: string | null;
  }>;
  teacher?: {
    full_name?: string;
    email?: string;
    clerk_user_id?: string;
  };
  learning_outcomes?: string[];
  skills_gained?: string[];
  estimated_hours?: number;
  language?: string | string[];
  subtitle_languages?: string[];
  course_language?: string;
  course_type?: string;
  duration_weeks?: number;
  starts_at?: string;
  ends_at?: string;
  enrollment_deadline?: string;
  enrollment_cap?: number | null;
  schedule_timezone?: string;
  course_format_description?: string;
  syllabus?: string;
  prerequisites?: Array<{ id?: string; title?: string; description?: string }> | string | string[];
  teacher_bio?: string;
  teacher_title?: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  progress: number;
  completed: boolean;
  last_accessed?: string;
  status: string;
}

interface CourseFinalExam {
  id: string;
  title: string;
  description?: string | null;
  exam_type: 'quiz' | 'interview' | 'document' | 'project';
  points?: number;
  due_date?: string | null;
  instructions?: string | null;
  is_published?: boolean;
  submission?: {
    id: string;
    status?: string;
    submitted_at?: string;
    grade?: number | null;
    feedback?: string | null;
  } | null;
  interview?: {
    id?: string;
    scheduled_date?: string;
    duration_minutes?: number;
    meeting_link?: string | null;
    status?: string;
  } | null;
}

// Helper function to convert YouTube URL to embed format
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  
  // If already an embed URL, return as is
  if (url.includes('/embed/')) return url;
  
  // Extract video ID from various YouTube URL formats
  let videoId = '';
  
  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v') || '';
  }
  // Format: https://youtu.be/VIDEO_ID
  else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
  }
  // Format: https://www.youtube.com/VIDEO_ID
  else if (url.includes('youtube.com/')) {
    videoId = url.split('youtube.com/')[1]?.split('?')[0] || '';
  }
  
  // Return embed URL if we found a video ID
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // Return original URL if it's not YouTube
  return url;
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('v');
  }

  if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1]?.split('?')[0] || null;
  }

  if (url.includes('youtube.com/embed/')) {
    return url.split('youtube.com/embed/')[1]?.split('?')[0] || null;
  }

  return null;
}

function isYouTubeUrl(url: string): boolean {
  return Boolean(getYouTubeVideoId(url));
}

function normalizeList(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated parsing.
    }
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString();
}

export default function LearnPage() {
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [finalExams, setFinalExams] = useState<CourseFinalExam[]>([]);
  const [activeFinalExam, setActiveFinalExam] = useState<CourseFinalExam | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedContentGroups, setExpandedContentGroups] = useState<Set<string>>(new Set());
  const [showAbout, setShowAbout] = useState(true);
  const [showGradingPolicy, setShowGradingPolicy] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [selectedVideoLanguage, setSelectedVideoLanguage] = useState<string>('English');
  const [leftSidebarTab, setLeftSidebarTab] = useState<'content' | 'grades' | 'discussion' | 'certificate'>('content');
  const [discussionPosts, setDiscussionPosts] = useState<any[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [quizReview, setQuizReview] = useState<any>(null);
  const [gradesData, setGradesData] = useState<any>(null);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [videoSiblings, setVideoSiblings] = useState<any[]>([]);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  // Assignment submission state
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentLink, setAssignmentLink] = useState('');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentSubmission, setAssignmentSubmission] = useState<any>(null);
  const [assignmentFileError, setAssignmentFileError] = useState('');

  // Final exam submission state
  const [finalExamSubmissionType, setFinalExamSubmissionType] = useState<'text' | 'link' | 'file'>('text');
  const [finalExamTextContent, setFinalExamTextContent] = useState('');
  const [finalExamLinkUrl, setFinalExamLinkUrl] = useState('');
  const [finalExamFileUrl, setFinalExamFileUrl] = useState('');
  const [finalExamSubmitting, setFinalExamSubmitting] = useState(false);

  useEffect(() => {
    if (userId && courseId) {
      fetchCourseData();
    }
  }, [userId, courseId]);

  useEffect(() => {
    if (leftSidebarTab === 'content' && !activeLesson && !showSchedule && !showGradingPolicy) {
      setShowAbout(true);
    }
  }, [leftSidebarTab, activeLesson, showSchedule, showGradingPolicy]);

  useEffect(() => {
    if (activeLesson?.content_type === 'video' && activeLesson.video_urls?.length) {
      setSelectedVideoLanguage(activeLesson.video_urls[0].language);
    }
    // Detect same-titled video siblings in the same module for language switching
    if (activeLesson?.content_type === 'video' && activeModule) {
      const siblings = activeModule.lessons.filter(
        (l: any) => l.content_type === 'video' && l.title === activeLesson.title
      );
      setVideoSiblings(siblings.length > 1 ? siblings : []);
    } else {
      setVideoSiblings([]);
    }
  }, [activeLesson?.id]);

  const fetchCourseData = async () => {
    try {
      const token = await getToken();
      
      const [courseRes, modulesRes, enrollmentRes, finalExamsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/details`, {
          headers: { 
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/modules`, {
          headers: { 
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/enrollments/course/${courseId}`, {
          headers: { 
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/final-exams`, {
          headers: {
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        const resolvedCourse = courseData?.course || courseData?.data || courseData;
        setCourse(resolvedCourse);
      } else {
        console.error('Course fetch failed:', await courseRes.text());
      }

      if (modulesRes.ok) {
        const modulesData = await modulesRes.json();
        const modulesArray = Array.isArray(modulesData) ? modulesData : (modulesData.data || []);
        setModules(modulesArray);
      } else {
        const errorText = await modulesRes.text();
        console.error('Modules fetch failed:', errorText);
      }

      if (enrollmentRes.ok) {
        const enrollmentData = await enrollmentRes.json();
        setEnrollment(enrollmentData.enrollment || enrollmentData);
      } else {
        console.error('Enrollment fetch failed:', await enrollmentRes.text());
      }

      if (finalExamsRes.ok) {
        const finalExamData = await finalExamsRes.json();
        setFinalExams(finalExamData.finalExams || []);
      } else {
        console.error('Final exams fetch failed:', await finalExamsRes.text());
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleLessonClick = async (lesson: Lesson, module: Module) => {
    setActiveLesson(lesson);
    setActiveFinalExam(null);
    setActiveModule(module);
    setShowAbout(false);
    setShowGradingPolicy(false);
    setShowSchedule(false);
    setQuizReview(null);

    // If it's a quiz, fetch quiz data
    if (lesson.content_type === 'quiz') {
      setQuizLoading(true);
      try {
        const token = await getToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/student/lessons/${lesson.id}/quiz`,
          {
            headers: {
              'x-clerk-user-id': userId || '',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setQuizData(data);
          setQuizAnswers({});
          
          // Auto-show previous submission review if answers can be revealed
          if (data.last_submission && data.quiz.show_answers_after_deadline) {
            setQuizReview({
              score: data.last_submission.score,
              total: data.quiz.questions?.reduce((sum: number, q: any) => sum + (q.marks || 1), 0) || 0,
              percentage: data.last_submission.score != null && data.quiz.questions?.length > 0
                ? (data.last_submission.score / data.quiz.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0)) * 100
                : 0,
              submitted_at: data.last_submission.submitted_at,
              answers: data.last_submission.answers || {},
              questions: data.quiz.questions || [],
              show_answers: true,
              has_deadline: !!data.quiz.deadline,
              deadline: data.quiz.deadline,
              deadline_passed: data.deadline_passed
            });
          }
        } else {
          console.error('Failed to fetch quiz:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
      } finally {
        setQuizLoading(false);
      }
    } else {
      setQuizData(null);
    }

    // If it's an assignment, fetch existing submission
    if (lesson.content_type === 'assignment') {
      setAssignmentFile(null);
      setAssignmentLink('');
      setAssignmentFileError('');
      setAssignmentSubmission(null);
      fetchAssignmentSubmission(lesson.id);
    }
  };

  const handleFinalExamClick = (exam: CourseFinalExam) => {
    setActiveFinalExam(exam);
    setActiveLesson(null);
    setShowAbout(false);
    setShowGradingPolicy(false);
    setShowSchedule(false);
    setQuizReview(null);
    setFinalExamSubmissionType('text');
    setFinalExamTextContent('');
    setFinalExamLinkUrl('');
    setFinalExamFileUrl('');
  };

  const handleFinalExamSubmit = async () => {
    if (!activeFinalExam || finalExamSubmitting || activeFinalExam.submission) return;

    const textValue = finalExamTextContent.trim();
    const linkValue = finalExamLinkUrl.trim();
    const fileValue = finalExamFileUrl.trim();

    if (finalExamSubmissionType === 'text' && !textValue) {
      alert('Please enter your final exam response before submitting.');
      return;
    }

    if (finalExamSubmissionType === 'link' && !linkValue) {
      alert('Please provide a valid link before submitting.');
      return;
    }

    if (finalExamSubmissionType === 'file' && !fileValue) {
      alert('Please provide a file URL before submitting.');
      return;
    }

    try {
      setFinalExamSubmitting(true);
      const token = await getToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/final-exams/${activeFinalExam.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submission_type: finalExamSubmissionType,
          text_content: finalExamSubmissionType === 'text' ? textValue : null,
          link_url: finalExamSubmissionType === 'link' ? linkValue : null,
          file_url: finalExamSubmissionType === 'file' ? fileValue : null,
          file_type: finalExamSubmissionType === 'file' ? 'url' : null
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit final exam.');
      }

      const newSubmission = data?.submission || null;

      setFinalExams((prev) =>
        prev.map((exam) =>
          exam.id === activeFinalExam.id
            ? {
                ...exam,
                submission: newSubmission
                  ? {
                      id: newSubmission.id,
                      status: newSubmission.status,
                      submitted_at: newSubmission.submitted_at,
                      grade: newSubmission.grade,
                      feedback: newSubmission.feedback
                    }
                  : exam.submission
              }
            : exam
        )
      );

      setActiveFinalExam((prev) =>
        prev
          ? {
              ...prev,
              submission: newSubmission
                ? {
                    id: newSubmission.id,
                    status: newSubmission.status,
                    submitted_at: newSubmission.submitted_at,
                    grade: newSubmission.grade,
                    feedback: newSubmission.feedback
                  }
                : prev.submission
            }
          : prev
      );

      alert('Final exam submitted successfully.');
    } catch (error: any) {
      console.error('Error submitting final exam:', error);
      alert(error?.message || 'Failed to submit final exam.');
    } finally {
      setFinalExamSubmitting(false);
    }
  };

  const handleQuizSubmit = async () => {
    if (!activeLesson || !quizData) return;

    setQuizSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/student/lessons/${activeLesson.id}/quiz/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ answers: quizAnswers })
        }
      );

      if (response.ok) {
        const result = await response.json();
        // Set quiz review data to show inline results
        setQuizReview({
          score: result.submission.score,
          total: result.submission.total_points,
          percentage: result.submission.percentage,
          submitted_at: result.submission.submitted_at,
          answers: quizAnswers,
          questions: quizData.quiz.questions,
          show_answers: result.show_answers ?? true,
          has_deadline: result.has_deadline ?? false,
          deadline: result.deadline,
          deadline_passed: result.deadline_passed ?? false
        });
        // Keep quizData for reference but clear answers
        setQuizAnswers({});
        updateLessonCompletionState(activeLesson.id);
        fetchGrades();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const getLessonIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'quiz': return <FileQuestion className="w-4 h-4" />;
      case 'assignment': return <ClipboardList className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getLessonStatus = (lesson: Lesson) => {
    if (lesson.completed) return 'completed';
    if (lesson.deadline && new Date(lesson.deadline) < new Date()) return 'missed';
    return 'pending';
  };

  const renderStatusIndicator = (status: 'completed' | 'pending' | 'missed') => {
    if (status === 'completed') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
          <CheckCircle className="w-4 h-4" />
          Completed
        </span>
      );
    }

    if (status === 'missed') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-red-500">
          <XCircle className="w-4 h-4" />
          Missed
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
        <Clock className="w-4 h-4" />
        Pending
      </span>
    );
  };

  const updateLessonCompletionState = (lessonId: string) => {
    setModules((prev) => prev.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, completed: true } : lesson
      )
    })));

    if (activeLesson?.id === lessonId) {
      setActiveLesson((prev) => prev ? { ...prev, completed: true } : prev);
    }
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!lessonId || isMarkingComplete) return;

    setIsMarkingComplete(true);
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: {
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        updateLessonCompletionState(lessonId);
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Fetch existing assignment submission when opening an assignment
  const fetchAssignmentSubmission = async (lessonId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}/assignment`,
        {
          headers: {
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAssignmentSubmission(data.submission || null);
      } else {
        setAssignmentSubmission(null);
      }
    } catch {
      setAssignmentSubmission(null);
    }
  };

  // Handle assignment file selection with 5MB check
  const handleAssignmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAssignmentFileError('');
    if (file && file.size > 5 * 1024 * 1024) {
      setAssignmentFileError('File size exceeds 5 MB. Please upload via Google Drive and paste the link below.');
      setAssignmentFile(null);
      e.target.value = '';
      return;
    }
    setAssignmentFile(file);
  };

  // Submit assignment (file or Google Drive link)
  const handleAssignmentSubmit = async () => {
    if (!activeLesson || assignmentSubmitting) return;
    if (!assignmentFile && !assignmentLink.trim()) {
      alert('Please upload a file or paste a Google Drive link.');
      return;
    }

    // Check deadline
    if (activeLesson.deadline && new Date(activeLesson.deadline) < new Date()) {
      alert('The deadline for this assignment has passed.');
      return;
    }

    setAssignmentSubmitting(true);
    try {
      const token = await getToken();
      const formData = new FormData();

      if (assignmentFile) {
        formData.append('file', assignmentFile);
      }
      if (assignmentLink.trim()) {
        formData.append('textSubmission', assignmentLink.trim());
        formData.append('linkUrl', assignmentLink.trim());
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${activeLesson.id}/assignment/submit`,
        {
          method: 'POST',
          headers: {
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const result = await response.json();
        setAssignmentSubmission(result.submission || result);
        setAssignmentFile(null);
        setAssignmentLink('');
        setAssignmentFileError('');
        updateLessonCompletionState(activeLesson.id);
        fetchGrades();
        alert('Assignment submitted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit assignment');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Error submitting assignment');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  // Build available video language options from various sources
  const getVideoLanguageOptions = (): { language: string; url: string; lessonId?: string }[] => {
    if (!activeLesson || activeLesson.content_type !== 'video') return [];

    // Priority 1: video_urls JSON array on the active lesson
    if (activeLesson.video_urls && activeLesson.video_urls.length > 0) {
      // Deduplicate by language name
      const seen = new Set<string>();
      return activeLesson.video_urls
        .filter((v: any) => v.url && v.language)
        .filter((v: any) => {
          const key = v.language.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((v: any) => ({ language: v.language, url: v.url }));
    }

    // Priority 2: Collect video_urls from same-titled sibling lessons
    if (videoSiblings.length > 1) {
      const allLangs: { language: string; url: string; lessonId?: string }[] = [];
      for (const s of videoSiblings) {
        if (s.video_urls && s.video_urls.length > 0) {
          for (const v of s.video_urls) {
            if (v.url && v.language) {
              allLangs.push({ language: v.language, url: v.url, lessonId: s.id });
            }
          }
        } else if (s.content_url) {
          // Try to detect language from title, description, or language field
          const langLabel = s.language
            || (s.title?.match(/\b(english|tamil|arabic|urdu|hindi)\b/i)?.[1])
            || (s.description?.match(/\b(english|tamil|arabic|urdu|hindi)\b/i)?.[1])
            || null;
          allLangs.push({ 
            language: langLabel ? langLabel.charAt(0).toUpperCase() + langLabel.slice(1).toLowerCase() : `Version ${allLangs.length + 1}`, 
            url: s.content_url, 
            lessonId: s.id 
          });
        }
      }
      if (allLangs.length > 1) return allLangs;
    }

    // Priority 3: Per-column language URLs
    const columnLangs: { language: string; url: string }[] = [];
    if (activeLesson.content_url_en) columnLangs.push({ language: 'English', url: activeLesson.content_url_en });
    if (activeLesson.content_url_ta) columnLangs.push({ language: 'Tamil', url: activeLesson.content_url_ta });
    if (activeLesson.content_url_ar) columnLangs.push({ language: 'Arabic', url: activeLesson.content_url_ar });
    // Only add content_url as fallback if no language-specific columns found
    if (columnLangs.length === 0 && activeLesson.content_url) {
      columnLangs.push({ language: 'Default', url: activeLesson.content_url });
    }
    if (columnLangs.length > 1) return columnLangs;

    return [];
  };

  const getActiveVideoUrl = () => {
    if (!activeLesson) return '';
    
    // Check video_urls JSON array first
    if (activeLesson.video_urls && activeLesson.video_urls.length > 0) {
      // Try exact language match first, then case-insensitive
      const selectedVideo = activeLesson.video_urls.find((v: any) => v.language === selectedVideoLanguage)
        || activeLesson.video_urls.find((v: any) => v.language?.toLowerCase() === selectedVideoLanguage?.toLowerCase());
      return selectedVideo?.url || activeLesson.video_urls[0].url;
    }

    // Check per-column language URLs
    const columnLangs: Record<string, string> = {};
    if (activeLesson.content_url_en) columnLangs['English'] = activeLesson.content_url_en;
    if (activeLesson.content_url_ta) columnLangs['Tamil'] = activeLesson.content_url_ta;
    if (activeLesson.content_url_ar) columnLangs['Arabic'] = activeLesson.content_url_ar;
    if (activeLesson.content_url) columnLangs['Default'] = activeLesson.content_url;
    
    if (selectedVideoLanguage && columnLangs[selectedVideoLanguage]) {
      return columnLangs[selectedVideoLanguage];
    }

    return activeLesson.content_url || '';
  };

  useEffect(() => {
    if (!activeLesson || activeLesson.content_type !== 'video') return;
    const videoUrl = getActiveVideoUrl();
    if (!isYouTubeUrl(videoUrl)) return;

    if ((window as any).YT && (window as any).YT.Player) {
      setYtReady(true);
      return;
    }

    const existingScript = document.querySelector('script[data-yt-embed]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.ytEmbed = 'true';
    document.body.appendChild(script);

    (window as any).onYouTubeIframeAPIReady = () => {
      setYtReady(true);
    };
  }, [activeLesson, selectedVideoLanguage]);

  useEffect(() => {
    if (!activeLesson || activeLesson.content_type !== 'video') return;
    const videoUrl = getActiveVideoUrl();
    const videoId = getYouTubeVideoId(videoUrl || '');
    if (!ytReady || !videoId || !videoContainerRef.current) return;

    if (ytPlayerRef.current?.destroy) {
      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    }

    ytPlayerRef.current = new (window as any).YT.Player(videoContainerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        modestbranding: 1,
        rel: 0
      },
      events: {
        onStateChange: (event: any) => {
          if (event.data === (window as any).YT.PlayerState.ENDED) {
            if (!activeLesson.completed) {
              markLessonComplete(activeLesson.id);
            }
          }
        }
      }
    });

    return () => {
      if (ytPlayerRef.current?.destroy) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, [activeLesson?.id, selectedVideoLanguage, ytReady]);

  useEffect(() => {
    if (activeLesson && activeLesson.content_type === 'video') return;
    if (ytPlayerRef.current?.destroy) {
      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    }
  }, [activeLesson?.id]);

  // Fetch live sessions for schedule
  const fetchLiveSessions = async () => {
    const currentToken = await getToken();
    
    if (!currentToken || !courseId) return;
    
    setScheduleLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/live-sessions`, {
        headers: {
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLiveSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Fetch grades data
  const fetchGrades = async () => {
    const currentToken = await getToken();
    if (!currentToken || !courseId) return;
    
    setGradesLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/grades`, {
        headers: {
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGradesData(data.grades || data || null);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setGradesLoading(false);
    }
  };

  // Fetch discussions for course
  const fetchDiscussions = async (silent = false) => {
    const currentToken = await getToken();
    if (!currentToken || !courseId) return;
    
    if (!silent) setDiscussionLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/discussions`, {
        headers: {
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDiscussionPosts(data.data || data.discussions || []);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      if (!silent) setDiscussionLoading(false);
    }
  };

  // Poll discussions when discussion tab is active
  useEffect(() => {
    if (leftSidebarTab !== 'discussion') return;
    
    const pollInterval = setInterval(() => {
      fetchDiscussions(true); // silent refresh
    }, 8000);
    
    return () => clearInterval(pollInterval);
  }, [leftSidebarTab, courseId]);

  // Post new discussion
  const postDiscussion = async () => {
    const currentToken = await getToken();
    if (!currentToken || !courseId || !newPostContent.trim()) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ title: newPostTitle || 'Discussion', content: newPostContent })
      });
      
      if (response.ok) {
        setNewPostTitle('');
        setNewPostContent('');
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Error posting discussion:', error);
    }
  };

  // Vote on a discussion
  const voteDiscussion = async (discussionId: string, voteType: 'up' | 'down') => {
    const currentToken = await getToken();
    if (!currentToken) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-clerk-user-id': userId || '', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ vote_type: voteType })
      });
      fetchDiscussions();
    } catch (error) { console.error('Error voting:', error); }
  };

  // Reply to a discussion
  const replyToDiscussion = async (discussionId: string) => {
    const currentToken = await getToken();
    if (!currentToken || !replyContent.trim()) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-clerk-user-id': userId || '', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ content: replyContent })
      });
      if (response.ok) {
        setReplyContent('');
        fetchDiscussions();
      }
    } catch (error) { console.error('Error replying:', error); }
  };

  // Edit a discussion
  const editDiscussion = async (discussionId: string) => {
    const currentToken = await getToken();
    if (!currentToken || !editContent.trim()) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-clerk-user-id': userId || '', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ title: editTitle, content: editContent })
      });
      if (response.ok) {
        setEditingPost(null);
        setEditContent('');
        setEditTitle('');
        fetchDiscussions();
      }
    } catch (error) { console.error('Error editing discussion:', error); }
  };

  // Delete a discussion
  const deleteDiscussion = async (discussionId: string) => {
    if (!confirm('Are you sure you want to delete this discussion?')) return;
    const currentToken = await getToken();
    if (!currentToken) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}`, {
        method: 'DELETE',
        headers: { 'x-clerk-user-id': userId || '', 'Authorization': `Bearer ${currentToken}` }
      });
      if (response.ok) fetchDiscussions();
    } catch (error) { console.error('Error deleting discussion:', error); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">Loading course content...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 font-semibold">Course not found</p>
          <button
            onClick={() => router.push('/student/courses')}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const overallScore = gradesData?.overall ?? gradesData?.total_score ?? gradesData?.internal_score ?? null;
  const passingPercentage = gradesData?.passing_percentage ?? (course as any)?.passing_percentage ?? 70;
  const gradingWeights = gradesData?.grading_weights ?? (course as any)?.grading_weights ?? { quiz_percentage: 30, assignment_percentage: 40, final_exam_percentage: 30 };
  const certificateEligible = gradesData?.certificate_eligible ?? (overallScore != null ? overallScore >= passingPercentage : null);
  const headerImage = course.course_image_url || course.thumbnail_url || course.thumbnail_image || '';
  const learningOutcomes = normalizeList(course.learning_outcomes as any);
  const skillsGained = normalizeList(course.skills_gained as any);
  const subtitleLanguages = normalizeList(course.subtitle_languages as any);
  const courseLanguage = Array.isArray(course.language)
    ? course.language.join(', ')
    : (course.language || course.course_language || 'English');
  const prerequisiteCourses = Array.isArray(course.prerequisites) && typeof course.prerequisites[0] === 'object'
    ? (course.prerequisites as Array<{ id?: string; title?: string; description?: string }>)
    : [];
  const prerequisiteItems = Array.isArray(course.prerequisites) && typeof course.prerequisites[0] === 'string'
    ? (course.prerequisites as string[])
    : normalizeList(typeof course.prerequisites === 'string' ? course.prerequisites : null);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
        {/* Top Header - Logo left, Course title center, Back button right */}
        <header className="w-full bg-white border-b border-gray-200 shadow-sm z-40 flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 leading-tight">Little Muslimah</h1>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Academy</p>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200 mx-1"></div>
            {headerImage && (
              <img
                src={headerImage}
                alt={course?.title || 'Course'}
                className="h-9 w-9 rounded-lg object-cover border border-gray-200"
              />
            )}
            <div>
              <h2 className="text-base font-bold text-slate-800 line-clamp-1">{course?.title || 'Course Learning Page'}</h2>
              <p className="text-xs text-slate-500">{course?.category || ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/student/courses')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>My Courses</span>
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">

        {/* FIRST LEFT SIDEBAR - Tab Navigation (75px, Modern Blue) */}
        <aside className="w-19 bg-gradient-to-b from-slate-800 to-slate-900 text-white overflow-hidden flex-shrink-0 flex flex-col items-center py-6 border-r border-slate-700 h-full">
          {/* Course Content Tab */}
          <button
            onClick={() => {
              setLeftSidebarTab('content');
              setShowSchedule(false);
              setShowAbout(true);
              setShowGradingPolicy(false);
              setActiveLesson(null);
            }}
            className={`w-16 h-16 rounded-lg mb-3 flex flex-col items-center justify-center transition-all ${
              leftSidebarTab === 'content'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Course Content"
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-xs mt-1">Content</span>
          </button>

          {/* Grades Tab */}
          <button
            onClick={() => {
              setLeftSidebarTab('grades');
              setShowSchedule(false);
              setShowAbout(false);
              setShowGradingPolicy(false);
              setActiveLesson(null);
              fetchGrades();
            }}
            className={`w-16 h-16 rounded-lg mb-3 flex flex-col items-center justify-center transition-all ${
              leftSidebarTab === 'grades'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Grades"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs mt-1">Grades</span>
          </button>

          {/* Certificate Tab */}
          <button
            onClick={() => {
              setLeftSidebarTab('certificate');
              setShowSchedule(false);
              setShowAbout(false);
              setShowGradingPolicy(false);
              setActiveLesson(null);
            }}
            className={`w-16 h-16 rounded-lg mb-3 flex flex-col items-center justify-center transition-all ${
              leftSidebarTab === 'certificate'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Certificate"
          >
            <Award className="w-6 h-6" />
            <span className="text-xs mt-1">Certificate</span>
          </button>

          {/* Discussion Tab */}
          <button
            onClick={() => {
              setLeftSidebarTab('discussion');
              setShowSchedule(false);
              setShowAbout(false);
              setShowGradingPolicy(false);
              setActiveLesson(null);
              fetchDiscussions();
            }}
            className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all ${
              leftSidebarTab === 'discussion'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Discussion"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs mt-1">Discuss</span>
          </button>
        </aside>

        {/* SECOND LEFT SIDEBAR - Dynamic Content (290px, WHITE) */}
        <aside className="w-72 bg-white text-gray-800 overflow-y-auto flex-shrink-0 border-r border-gray-200 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* MODULES VIEW */}
          {leftSidebarTab === 'content' && (
            <div>

              {/* Course Introduction */}
              <button
                onClick={() => {
                  setShowAbout(true);
                  setShowGradingPolicy(false);
                  setShowSchedule(false);
                  setActiveLesson(null);
                }}
                className={`w-full flex items-center space-x-3 px-5 py-3.5 border-b border-gray-100 transition-all ${
                  showAbout
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <PlayCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">Course Introduction</span>
              </button>

              {/* Grading Policy */}
              <button
                onClick={() => {
                  setShowGradingPolicy(true);
                  setShowAbout(false);
                  setActiveLesson(null);
                  setShowSchedule(false);
                }}
                className={`w-full flex items-center space-x-3 px-5 py-3.5 border-b border-gray-100 transition-all ${
                  showGradingPolicy
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Award className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">Grading Policy</span>
              </button>

              {/* Schedule */}
              <button
                onClick={() => {
                  setShowSchedule(true);
                  setShowAbout(false);
                  setShowGradingPolicy(false);
                  setActiveLesson(null);
                  fetchLiveSessions();
                }}
                className={`w-full flex items-center space-x-3 px-5 py-3.5 border-b border-gray-200 transition-all ${
                  showSchedule
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">Schedule</span>
              </button>

              {/* COURSE CONTENT Header */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Course Content</h3>
              </div>

              {/* Weeks */}
              {modules.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8 px-5">
                  No modules available
                </div>
              ) : (
                modules.map((module) => (
                  <div key={module.id} className="border-b border-gray-100">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all"
                    >
                      <span className="text-sm text-gray-700">Week {module.week_number}</span>
                      {expandedModules.has(module.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedModules.has(module.id) && (
                      <div className="bg-white">
                        {module.lessons && module.lessons.length > 0 ? (
                          <div className="px-5 pb-4 space-y-4">
                            {([
                              { label: 'Videos', type: 'video' },
                              { label: 'Quizzes', type: 'quiz' },
                              { label: 'Assignments', type: 'assignment' },
                              { label: 'Resources', type: 'text' }
                            ] as const).filter((group) => module.lessons.some((lesson) => lesson.content_type === group.type && lesson.is_published !== false)).map((group) => {
                              let items = module.lessons.filter((lesson) => lesson.content_type === group.type && lesson.is_published !== false);
                              
                              // Deduplicate same-titled video lessons (teacher adds same video in multiple languages as separate entries)
                              if (group.type === 'video') {
                                const seen = new Set<string>();
                                items = items.filter((lesson) => {
                                  const key = lesson.title.trim().toLowerCase();
                                  if (seen.has(key)) return false;
                                  seen.add(key);
                                  return true;
                                });
                              }
                              
                              const groupKey = `${module.id}-${group.type}`;
                              const isExpanded = expandedContentGroups.has(groupKey);

                              return (
                                <div key={group.type}>
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(expandedContentGroups);
                                      if (newExpanded.has(groupKey)) {
                                        newExpanded.delete(groupKey);
                                      } else {
                                        newExpanded.add(groupKey);
                                      }
                                      setExpandedContentGroups(newExpanded);
                                    }}
                                    className="w-full flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 transition-colors py-1"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-purple-500">•</span>
                                      {group.label}
                                      <span className="text-gray-400 normal-case font-normal">({items.length})</span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                  </button>
                                  {isExpanded && (
                                  <div className="space-y-2">
                                    {items.map((lesson) => {
                                      const status = getLessonStatus(lesson);
                                      const showStatus = lesson.content_type !== 'resource';
                                      let iconBgColor = 'bg-gray-100';
                                      let iconColor = 'text-gray-600';
                                      if (lesson.content_type === 'video') {
                                        iconBgColor = status === 'completed' ? 'bg-green-100' : 'bg-blue-100';
                                        iconColor = status === 'completed' ? 'text-green-600' : 'text-blue-600';
                                      } else if (lesson.content_type === 'quiz') {
                                        iconBgColor = status === 'completed' ? 'bg-green-100' : 'bg-purple-100';
                                        iconColor = status === 'completed' ? 'text-green-600' : 'text-purple-600';
                                      } else if (lesson.content_type === 'assignment') {
                                        iconBgColor = status === 'completed' ? 'bg-green-100' : 'bg-orange-100';
                                        iconColor = status === 'completed' ? 'text-green-600' : 'text-orange-600';
                                      } else {
                                        iconBgColor = status === 'completed' ? 'bg-green-100' : 'bg-gray-100';
                                        iconColor = status === 'completed' ? 'text-green-600' : 'text-gray-600';
                                      }
                                      
                                      // Check if this video has language siblings
                                      const languageSiblingCount = lesson.content_type === 'video'
                                        ? module.lessons.filter((l) => l.content_type === 'video' && l.title.trim().toLowerCase() === lesson.title.trim().toLowerCase()).length
                                        : 0;
                                      // Check if any sibling of this video is currently active
                                      const isSiblingActive = lesson.content_type === 'video' && activeLesson && activeLesson.id !== lesson.id
                                        && activeLesson.content_type === 'video'
                                        && activeLesson.title.trim().toLowerCase() === lesson.title.trim().toLowerCase();

                                      return (
                                        <button
                                          key={lesson.id}
                                          onClick={() => handleLessonClick(lesson, module)}
                                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                            activeLesson?.id === lesson.id || isSiblingActive
                                              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                          }`}
                                        >
                                          {/* Status indicator icon */}
                                          {showStatus && (
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                              status === 'completed'
                                                ? 'bg-green-500'
                                                : status === 'missed'
                                                  ? 'bg-red-100'
                                                  : 'bg-amber-100'
                                            }`}>
                                              {status === 'completed' && (
                                                <CheckCircle className="w-4 h-4 text-white" />
                                              )}
                                              {status === 'missed' && (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                              )}
                                              {status === 'pending' && (
                                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                              )}
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0 text-left">
                                            <div className="text-sm font-medium truncate">{lesson.title}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                              {lesson.content_type === 'video' ? 'Video' :
                                               lesson.content_type === 'quiz' ? 'Quiz' :
                                               lesson.content_type === 'assignment' ? 'Assignment' : 'Resource'}
                                              {languageSiblingCount > 1 && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-semibold ml-1">
                                                  🌐 {languageSiblingCount} langs
                                                </span>
                                              )}
                                              {lesson.deadline ? ` · Due ${new Date(lesson.deadline).toLocaleDateString()}` : ''}
                                              {showStatus && status === 'completed' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold ml-1">✓ Completed</span>
                                              )}
                                              {showStatus && status === 'missed' && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-semibold ml-1">✕ Missed</span>
                                              )}
                                              {showStatus && status === 'pending' && (lesson.content_type === 'quiz' || lesson.content_type === 'assignment') && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold ml-1">⏳ Pending</span>
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 px-5 pl-10 py-3">No lessons</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Final Exam - Separate module outside weeks */}
              {finalExams.length > 0 && (
                <>
                  <div className="px-5 py-3 bg-gray-50 border-y border-gray-200 mt-1">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Final Exam</h3>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {finalExams.map((exam) => {
                      const isActive = activeFinalExam?.id === exam.id;
                      return (
                        <button
                          key={exam.id}
                          onClick={() => handleFinalExamClick(exam)}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                            isActive
                              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileQuestion className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{exam.title}</div>
                            <div className="text-xs text-gray-400">
                              {exam.exam_type?.toUpperCase()}
                              {exam.due_date ? ` · Due ${new Date(exam.due_date).toLocaleDateString()}` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* GRADES SIDEBAR */}
          {leftSidebarTab === 'grades' && (
            <div>
              <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-500">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
                    <BarChart3 className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-base">My Grades</h2>
                    <p className="text-blue-100 text-xs mt-1">Track your progress</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-semibold mb-1">Overall Score</div>
                  <div className="text-2xl font-bold text-blue-700">{overallScore != null ? `${Math.round(overallScore)}%` : '--'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Quizzes ({gradingWeights.quiz_percentage}%)</div>
                  <div className="text-lg font-bold text-gray-700">{gradesData?.quiz_average != null ? `${Math.round(gradesData.quiz_average)}%` : '--'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Assignments ({gradingWeights.assignment_percentage}%)</div>
                  <div className="text-lg font-bold text-gray-700">{gradesData?.assignment_average != null ? `${Math.round(gradesData.assignment_average)}%` : '--'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Final Exam ({gradingWeights.final_exam_percentage}%)</div>
                  <div className="text-lg font-bold text-gray-700">{gradesData?.final_exam != null ? `${Math.round(gradesData.final_exam)}%` : '--'}</div>
                </div>
                <div className={`rounded-lg p-3 text-center text-sm font-semibold ${certificateEligible ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500'}`}>
                  {certificateEligible ? '✅ Certificate Eligible' : `Certificate: Requires ${passingPercentage}%+`}
                </div>
              </div>
            </div>
          )}

          {/* CERTIFICATE SIDEBAR */}
          {leftSidebarTab === 'certificate' && (
            <div>
              <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 border-b border-amber-400">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
                    <Award className="w-7 h-7 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-base">Certificates</h2>
                    <p className="text-amber-100 text-xs mt-1">Your achievements</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className={`rounded-lg p-4 text-center ${certificateEligible ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <Award className={`w-10 h-10 mx-auto mb-2 ${certificateEligible ? 'text-green-600' : 'text-gray-400'}`} />
                  <div className={`text-sm font-semibold ${certificateEligible ? 'text-green-700' : 'text-gray-500'}`}>
                    {certificateEligible ? 'Certificate Earned!' : 'Not Yet Eligible'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {certificateEligible ? 'Click to view & download' : `Score ${passingPercentage}%+ to earn`}
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <div className="font-semibold text-gray-700 mb-1">Requirements</div>
                  <ul className="space-y-1">
                    <li>• Complete all quizzes</li>
                    <li>• Complete all assignments</li>
                    <li>• Overall score ≥ {passingPercentage}%</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* DISCUSSION SIDEBAR */}
          {leftSidebarTab === 'discussion' && (
            <div>
              <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-indigo-500">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
                    <MessageSquare className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-base">Discussion</h2>
                    <p className="text-indigo-100 text-xs mt-1">Course forum</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setNewPostContent('')}
                  className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  New Post
                </button>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <div className="font-semibold text-gray-700 mb-1">Forum Guidelines</div>
                  <ul className="space-y-1">
                    <li>• Be respectful to others</li>
                    <li>• Stay on topic</li>
                    <li>• No spam or self-promotion</li>
                    <li>• Upvote helpful answers</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50">
          {/* Content */}
          <div className="p-8 max-w-6xl mx-auto">
            {/* About Course View - ENHANCED */}
            {showAbout && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                {/* Course Header */}
                <div className="mb-8 rounded-xl overflow-hidden border border-gray-200">
                  <div className="relative">
                    {headerImage ? (
                      <img
                        src={headerImage}
                        alt={course.title}
                        className="w-full h-56 object-cover"
                      />
                    ) : (
                      <div className="w-full h-56 bg-gradient-to-r from-slate-200 to-slate-300"></div>
                    )}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
                      <h1 className="text-3xl font-bold text-white mb-2">{course?.title}</h1>
                      <p className="text-white/80 max-w-3xl">{course?.short_description || course?.description}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="flex flex-col gap-3">
                      {(course?.teacher?.full_name || course?.teacher_name) && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-500">Instructor:</span>
                          <span className="text-base font-bold text-blue-700">
                            {course?.teacher?.full_name || course?.teacher_name}
                          </span>
                        </div>
                      )}
                      {course?.co_teachers && course.co_teachers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-500">Co-Teachers:</span>
                          {course.co_teachers.map((coTeacher, index) => (
                            <span
                              key={coTeacher.id || coTeacher.email || `co-teacher-${index}`}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200"
                            >
                              {coTeacher.full_name || coTeacher.email || 'Co-Teacher'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Description */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">About This Course</h3>
                    <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {course?.long_description || course?.description}
                    </div>
                  </div>

                  {/* Prerequisites */}
                  {(prerequisiteCourses.length > 0 || prerequisiteItems.length > 0) && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Prerequisites</h3>
                      <ul className="space-y-2">
                        {prerequisiteCourses.map((prereq, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-purple-600 font-bold">•</span>
                            <span className="text-slate-700">{prereq.title || prereq.description}</span>
                          </li>
                        ))}
                        {prerequisiteItems.map((prereq: string, idx: number) => (
                          <li key={`text-${idx}`} className="flex items-start gap-3">
                            <span className="text-purple-600 font-bold">•</span>
                            <span className="text-slate-700">{prereq}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Learning Outcomes */}
                  {learningOutcomes.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">What You'll Learn</h3>
                      <ul className="space-y-2">
                        {learningOutcomes.map((outcome: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-green-600 font-bold">✓</span>
                            <span className="text-slate-700">{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills Gained */}
                  {skillsGained.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Skills You'll Gain</h3>
                      <div className="flex flex-wrap gap-2">
                        {skillsGained.map((skill: string, idx: number) => (
                          <span key={idx} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Course Details Grid */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Course Details</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500 mb-1">Category</p>
                        <p className="font-semibold text-slate-800">{course?.category || 'Islamic Studies'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500 mb-1">Level</p>
                        <p className="font-semibold text-slate-800">{course?.level || 'Beginner'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500 mb-1">Estimated Hours</p>
                        <p className="font-semibold text-slate-800">{course?.estimated_hours ? `${course.estimated_hours} hours` : 'Self-paced'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500 mb-1">Language</p>
                        <p className="font-semibold text-slate-800">{courseLanguage}</p>
                      </div>
                      {subtitleLanguages.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">Subtitles</p>
                          <p className="font-semibold text-slate-800">{subtitleLanguages.join(', ')}</p>
                        </div>
                      )}
                      {course?.course_type && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">Course Type</p>
                          <p className="font-semibold text-slate-800 capitalize">{course.course_type.replace(/-/g, ' ')}</p>
                        </div>
                      )}
                      {course?.duration_weeks && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">Duration</p>
                          <p className="font-semibold text-slate-800">{course.duration_weeks} weeks</p>
                        </div>
                      )}
                      {course?.starts_at && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">Start Date</p>
                          <p className="font-semibold text-slate-800">{formatDate(course.starts_at)}</p>
                        </div>
                      )}
                      {course?.ends_at && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">End Date</p>
                          <p className="font-semibold text-slate-800">{formatDate(course.ends_at)}</p>
                        </div>
                      )}
                      {course?.enrollment_deadline && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">Enrollment Deadline</p>
                          <p className="font-semibold text-slate-800">{formatDate(course.enrollment_deadline)}</p>
                        </div>
                      )}
                      {course?.enrollment_cap && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">Enrollment Capacity</p>
                          <p className="font-semibold text-slate-800">{course.enrollment_cap} students</p>
                        </div>
                      )}
                      {course?.schedule_timezone && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-slate-500 mb-1">Schedule Timezone</p>
                          <p className="font-semibold text-slate-800">{course.schedule_timezone}</p>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500 mb-1">Total Modules</p>
                        <p className="font-semibold text-slate-800">{modules.length}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500 mb-1">Total Lessons</p>
                        <p className="font-semibold text-slate-800">
                          {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Syllabus */}
                  {course?.syllabus && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Syllabus</h3>
                      <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">{course.syllabus}</div>
                    </div>
                  )}

                  {/* Course Format Description */}
                  {course?.course_format_description && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Course Format</h3>
                      <p className="text-slate-600 leading-relaxed">{course.course_format_description}</p>
                    </div>
                  )}

                  {/* Teacher Bio */}
                  {course?.teacher_bio && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-purple-900 mb-3">About the Instructor</h3>
                      {course?.teacher_title && (
                        <p className="text-purple-700 font-semibold mb-2">{course.teacher_title}</p>
                      )}
                      <p className="text-slate-700 leading-relaxed">{course.teacher_bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grading Policy View */}
            {showGradingPolicy && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Grading Policy</h2>
                
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="font-bold text-purple-900 mb-4">Grade Distribution</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-purple-200">
                        <span className="text-slate-700">Weekly Assignments</span>
                        <span className="font-bold text-purple-700">{gradingWeights.assignment_percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-purple-200">
                        <span className="text-slate-700">Quizzes</span>
                        <span className="font-bold text-purple-700">{gradingWeights.quiz_percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-purple-200">
                        <span className="text-slate-700">Final Exam</span>
                        <span className="font-bold text-purple-700">{gradingWeights.final_exam_percentage}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 mb-3">Grading Scale</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <span className="font-bold text-green-700">A: 90-100%</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <span className="font-bold text-blue-700">B: 80-89%</span>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <span className="font-bold text-yellow-700">C: 70-79%</span>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <span className="font-bold text-red-700">F: Below 70%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Important Notes:</h4>
                    <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                      <li>Late submissions will receive a 10% deduction per day</li>
                      <li>Quizzes must be completed within the designated time frame</li>
                      <li>Final exam date will be announced 2 weeks in advance</li>
                      <li>Minimum {passingPercentage}% required to pass the course</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Table View */}
            {showSchedule && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Live Class Schedule</h2>
                
                {scheduleLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : liveSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No scheduled classes yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Title</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Time</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveSessions.map((session) => (
                          <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="font-medium text-gray-800">{session.title}</div>
                              {session.description && (
                                <div className="text-sm text-gray-500 mt-1">{session.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              {new Date(session.scheduled_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-4">
                              {session.status === 'live' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                                  LIVE NOW
                                </span>
                              )}
                              {session.status === 'scheduled' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  Upcoming
                                </span>
                              )}
                              {session.status === 'completed' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  Completed
                                </span>
                              )}
                              {session.status === 'cancelled' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                  Cancelled
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {session.status === 'live' && session.meeting_link && (
                                <a
                                  href={session.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                  <Video className="w-4 h-4" />
                                  <span>Join Now</span>
                                </a>
                              )}
                              {session.status === 'scheduled' && session.meeting_link && (
                                <a
                                  href={session.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  <Calendar className="w-4 h-4" />
                                  <span>Join</span>
                                </a>
                              )}
                              {session.status === 'completed' && session.recording_url && (
                                <a
                                  href={session.recording_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                                >
                                  Watch Recording
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Discussion View - INLINE (No iframe) */}
            {leftSidebarTab === 'discussion' && !showAbout && !showGradingPolicy && !showSchedule && !activeLesson && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Course Discussion Forum</h2>
                    <p className="text-slate-500 text-sm">Ask questions, share insights & collaborate with peers</p>
                  </div>
                  <div className="p-6">
                    {/* New Post Form */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Start a New Discussion</h3>
                      <input
                        type="text"
                        placeholder="Discussion title..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                      />
                      <textarea
                        placeholder="Write your question or topic here..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-24 resize-none"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                      />
                      <button
                        className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        onClick={postDiscussion}
                        disabled={discussionLoading || !newPostTitle.trim() || !newPostContent.trim()}
                      >
                        {discussionLoading ? 'Posting...' : 'Post Discussion'}
                      </button>
                    </div>

                    {/* Discussion Posts List */}
                    {discussionLoading && discussionPosts.length === 0 ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      </div>
                    ) : discussionPosts.length === 0 ? (
                      <div className="text-center py-16">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-500 mb-1">No discussions yet</h3>
                        <p className="text-sm text-gray-400">Be the first to start a conversation about this course.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {discussionPosts.map((post: any, postIdx: number) => {
                          const isOwnPost = post.author_clerk_id === userId;
                          const isTeacherPost = post.author_role === 'teacher';
                          const isEditing = editingPost === post.id;
                          const isExpanded = expandedDiscussion === post.id;

                          return (
                            <div key={post.id || `post-${postIdx}`} className={`border rounded-lg overflow-hidden transition-colors ${post.is_pinned ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
                              <div className="p-4">
                                {/* Post Header */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    {post.is_pinned && (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 mb-1">
                                        <Pin className="w-3 h-3" /> Pinned
                                      </span>
                                    )}
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm h-20 resize-none" />
                                        <div className="flex gap-2">
                                          <button onClick={() => editDiscussion(post.id)} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700">Save</button>
                                          <button onClick={() => { setEditingPost(null); setEditContent(''); setEditTitle(''); }} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-medium hover:bg-gray-300">Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <h4 className="font-semibold text-gray-800">{post.title}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{post.content}</p>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Author info */}
                                <div className="flex items-center gap-2 mt-3">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isTeacherPost ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                                    {(post.author_name || 'U')[0].toUpperCase()}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">{post.author_name || 'Unknown'}</span>
                                  {isTeacherPost && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                      Teacher
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-400">{post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</span>
                                </div>

                                {/* Actions bar */}
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                                  {/* Upvote */}
                                  <button
                                    onClick={() => voteDiscussion(post.id, 'up')}
                                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${post.user_vote === 'up' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" /> {post.upvotes || 0}
                                  </button>
                                  {/* Downvote */}
                                  <button
                                    onClick={() => voteDiscussion(post.id, 'down')}
                                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${post.user_vote === 'down' ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" /> {post.downvotes || 0}
                                  </button>
                                  {/* Reply toggle */}
                                  <button
                                    onClick={() => setExpandedDiscussion(isExpanded ? null : post.id)}
                                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                                  >
                                    <Reply className="w-3.5 h-3.5" /> {post.reply_count || 0} {(post.reply_count || 0) === 1 ? 'Reply' : 'Replies'}
                                  </button>
                                  {/* Edit - own posts only */}
                                  {isOwnPost && !isEditing && (
                                    <button
                                      onClick={() => { setEditingPost(post.id); setEditTitle(post.title); setEditContent(post.content); }}
                                      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-amber-600 transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                  )}
                                  {/* Delete - own posts for students, any post for teacher (check if current user is course teacher) */}
                                  {isOwnPost && (
                                    <button
                                      onClick={() => deleteDiscussion(post.id)}
                                      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Replies section */}
                              {isExpanded && (
                                <div className="bg-gray-50 border-t border-gray-200 p-4">
                                  {/* Existing replies */}
                                  {post.replies && post.replies.length > 0 && (
                                    <div className="space-y-3 mb-4">
                                      {post.replies.map((reply: any, rIdx: number) => (
                                        <div key={reply.id || `reply-${rIdx}`} className="bg-white rounded-lg p-3 border border-gray-200">
                                          <p className="text-sm text-gray-700">{reply.content}</p>
                                          <div className="flex items-center gap-2 mt-2">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${reply.author_role === 'teacher' ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                                              {(reply.author_name || 'U')[0].toUpperCase()}
                                            </div>
                                            <span className="text-xs font-medium text-gray-600">{reply.author_name || 'Unknown'}</span>
                                            {reply.author_role === 'teacher' && (
                                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Teacher</span>
                                            )}
                                            <span className="text-xs text-gray-400">• {reply.created_at ? new Date(reply.created_at).toLocaleDateString() : ''}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Reply input */}
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Write a reply..."
                                      value={expandedDiscussion === post.id ? replyContent : ''}
                                      onChange={(e) => setReplyContent(e.target.value)}
                                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                      onKeyDown={(e) => { if (e.key === 'Enter' && replyContent.trim()) replyToDiscussion(post.id); }}
                                    />
                                    <button
                                      onClick={() => replyToDiscussion(post.id)}
                                      disabled={!replyContent.trim()}
                                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                      <Send className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Certificate View - INLINE (No iframe) */}
            {leftSidebarTab === 'certificate' && !showAbout && !showGradingPolicy && !showSchedule && !activeLesson && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Course Certificates</h2>
                    <p className="text-slate-500 text-sm">Track and download your course achievements</p>
                  </div>
                  <div className="p-6">
                    {certificateEligible ? (
                      <div className="text-center py-8">
                        {/* Certificate Preview */}
                        <div className="max-w-2xl mx-auto border-8 border-double border-amber-400 rounded-lg p-10 bg-gradient-to-br from-amber-50 to-white relative">
                          <div className="absolute top-4 left-4 w-12 h-12 border-2 border-amber-300 rounded-full flex items-center justify-center">
                            <Award className="w-6 h-6 text-amber-500" />
                          </div>
                          <div className="absolute top-4 right-4 w-12 h-12 border-2 border-amber-300 rounded-full flex items-center justify-center">
                            <Award className="w-6 h-6 text-amber-500" />
                          </div>
                          <div className="mb-4">
                            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-[0.3em] mb-1">Certificate of Completion</h3>
                            <div className="w-20 h-0.5 bg-amber-400 mx-auto"></div>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">This is to certify that</p>
                          <h2 className="text-2xl font-bold text-gray-800 mb-2 font-serif">Student</h2>
                          <p className="text-sm text-gray-500 mb-4">has successfully completed</p>
                          <h3 className="text-xl font-bold text-indigo-700 mb-2">{course?.title}</h3>
                          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-600">
                            <div>
                              <div className="font-semibold">Score</div>
                              <div className="text-lg font-bold text-green-600">{overallScore ? `${Math.round(overallScore)}%` : '--'}</div>
                            </div>
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div>
                              <div className="font-semibold">Date</div>
                              <div className="text-lg font-bold text-gray-700">{new Date().toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>
                        <button className="mt-6 bg-amber-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors shadow-md">
                          Download Certificate
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Award className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-500 mb-2">No Certificates Yet</h3>
                        <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                          Complete the course with an overall score of {passingPercentage}% or higher to earn your certificate.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Your Progress</div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-indigo-600 h-3 rounded-full transition-all"
                                style={{ width: `${Math.min(overallScore || 0, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-700">{overallScore ? `${Math.round(overallScore)}%` : '0%'}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">You need {passingPercentage}% to earn a certificate</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Grades View */}
            {leftSidebarTab === 'grades' && !showGradingPolicy && !showAbout && !showSchedule && !activeLesson && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">My Grades</h2>
                  
                  {gradesLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                  ) : (
                    <>
                      {/* Total Score Card */}
                      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm opacity-90 mb-1">Total Course Score</div>
                            <div className="text-4xl font-bold">
                              {overallScore != null ? `${Math.round(overallScore)}/100` : '--/100'}
                            </div>
                            <div className="text-xs opacity-80 mt-2">Based on grading policy</div>
                          </div>
                          <div className="text-center">
                            <Award className="w-16 h-16 opacity-80 mb-2" />
                            <div className="text-xs">
                              Certificate Eligible: {certificateEligible == null ? '--' : certificateEligible ? 'Yes' : 'No'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Component Scores */}
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <div className="text-sm text-blue-600 font-semibold mb-2">Quizzes ({gradingWeights.quiz_percentage}%)</div>
                          <div className="text-3xl font-bold text-blue-700">
                            {gradesData ? `${Math.round(gradesData.quiz_average)}%` : '--'}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">Average of all quizzes</div>
                        </div>
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                          <div className="text-sm text-green-600 font-semibold mb-2">Assignments ({gradingWeights.assignment_percentage}%)</div>
                          <div className="text-3xl font-bold text-green-700">
                            {gradesData ? `${Math.round(gradesData.assignment_average)}%` : '--'}
                          </div>
                          <div className="text-xs text-green-600 mt-1">Average of all assignments</div>
                        </div>
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                          <div className="text-sm text-orange-600 font-semibold mb-2">Final Exam ({gradingWeights.final_exam_percentage}%)</div>
                          <div className="text-3xl font-bold text-orange-700">
                            {gradesData?.final_exam != null ? `${Math.round(gradesData.final_exam)}%` : '--'}
                          </div>
                          <div className="text-xs text-orange-600 mt-1">
                            {gradesData?.final_exam != null ? 'Completed' : 'Not taken yet'}
                          </div>
                        </div>
                      </div>

                      {/* Week-by-Week Breakdown */}
                      {gradesData?.weeks && gradesData.weeks.length > 0 ? (
                        <div className="space-y-6">
                          {gradesData.weeks.map((week: any, wIdx: number) => (
                            <div key={week.week_id || week.id || `week-${wIdx}`} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                <h3 className="font-bold text-slate-800">{week.week_title}</h3>
                              </div>
                              <div className="p-6">
                                {/* Quizzes */}
                                {week.quizzes?.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center">
                                      <FileText className="w-4 h-4 mr-2" />
                                      Quizzes
                                    </h4>
                                    <div className="space-y-2">
                                      {week.quizzes.map((q: any, qIdx: number) => (
                                        <div key={q.lesson_id || q.id || `quiz-${qIdx}`} className="bg-blue-50 rounded-lg p-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">{q.title}</span>
                                            <span className={`text-sm font-bold ${q.score != null ? (q.percentage != null && q.percentage >= 70 ? 'text-green-700' : 'text-blue-700') : 'text-gray-400'}`}>
                                              {q.score != null
                                                ? `${q.score}/${q.total_points} (${Math.round(q.percentage || 0)}%)`
                                                : q.submitted_at
                                                  ? 'Pending'
                                                  : 'Not taken'}
                                            </span>
                                          </div>
                                          {q.submitted_at && (
                                            <div className="text-xs text-blue-500 mt-1">
                                              Submitted: {new Date(q.submitted_at).toLocaleString('en-IN', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                                              })} IST
                                              {q.attempts > 1 && ` · ${q.attempts} attempts`}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {/* Assignments */}
                                {week.assignments?.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-green-600 mb-3 flex items-center">
                                      <Upload className="w-4 h-4 mr-2" />
                                      Assignments
                                    </h4>
                                    <div className="space-y-2">
                                      {week.assignments.map((a: any, aIdx: number) => (
                                        <div key={a.lesson_id || a.id || `assign-${aIdx}`} className="bg-green-50 rounded-lg p-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">{a.title}</span>
                                            <span className={`text-sm font-bold ${(a.grade != null || a.score != null) ? 'text-green-700' : 'text-gray-400'}`}>
                                              {a.grade != null
                                                ? `${a.grade}/100`
                                                : a.score != null
                                                  ? `${a.score}/${a.total_points}`
                                                  : a.submitted_at || a.status === 'submitted'
                                                    ? 'Pending Review'
                                                    : 'Not submitted'}
                                            </span>
                                          </div>
                                          {a.submitted_at && (
                                            <div className="text-xs text-green-500 mt-1">
                                              Submitted: {new Date(a.submitted_at).toLocaleString('en-IN', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                                              })} IST
                                              {a.graded_at && (
                                                <span className="ml-2">· Graded: {new Date(a.graded_at).toLocaleString('en-IN', {
                                                  month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata'
                                                })}</span>
                                              )}
                                            </div>
                                          )}
                                          {/* Teacher Feedback */}
                                          {a.feedback && (
                                            <div className="mt-2 pt-2 border-t border-green-200">
                                              <p className="text-xs font-semibold text-green-700 mb-1">Teacher Feedback:</p>
                                              <p className="text-sm text-green-800 bg-white/70 rounded p-2">{a.feedback}</p>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {(!week.quizzes || week.quizzes.length === 0) && (!week.assignments || week.assignments.length === 0) && (
                                  <div className="text-sm text-gray-400 text-center py-4">No graded items this week</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                          No submissions yet. Complete quizzes and assignments to see your grades.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Video Content */}
            {activeLesson && activeLesson.content_type === 'video' && (
              <div className="space-y-6">
                {/* Lesson Header */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                        <Video className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{activeLesson.title}</h2>
                        <p className="text-sm text-slate-500 font-medium">Video Lesson</p>
                      </div>
                    </div>
                    {activeLesson.completed ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    )}
                  </div>
                  
                  {/* Unified Language Selector - works with video_urls, per-column URLs, or sibling lessons */}
                  {(() => {
                    const langOptions = getVideoLanguageOptions();
                    if (langOptions.length <= 1) return null;
                    return (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-indigo-900">🌐 Select Video Language:</span>
                          <select
                            value={langOptions.some(o => o.lessonId) ? activeLesson.id : selectedVideoLanguage}
                            onChange={(e) => {
                              const selected = langOptions.find((o) =>
                                o.lessonId ? o.lessonId === e.target.value : o.language === e.target.value
                              );
                              if (selected?.lessonId) {
                                // Sibling lesson approach: switch the active lesson
                                const sibling = videoSiblings.find((s: any) => s.id === selected.lessonId);
                                if (sibling && activeModule) {
                                  setActiveLesson(sibling);
                                }
                              } else {
                                // video_urls or per-column approach: switch language key
                                setSelectedVideoLanguage(e.target.value);
                              }
                            }}
                            className="flex-1 px-4 py-2.5 border border-indigo-300 rounded-xl text-sm font-medium bg-white hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                          >
                            {langOptions.map((opt, idx) => (
                              <option key={opt.lessonId || opt.language} value={opt.lessonId || opt.language}>
                                {opt.language} {idx === 0 ? '(Default)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-xs text-indigo-600 mt-2 font-medium">
                          📺 Video available in {langOptions.length} language{langOptions.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })()}

                  {activeLesson.description && (
                    <p className="text-slate-600">{activeLesson.description}</p>
                  )}
                </div>

                {/* Video Player */}
                <div className="bg-black rounded-lg overflow-hidden aspect-video">
                  {(() => {
                    const videoUrl = getActiveVideoUrl();

                    if (!videoUrl) {
                      return (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <div className="text-center">
                            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No video available</p>
                          </div>
                        </div>
                      );
                    }

                    if (isYouTubeUrl(videoUrl)) {
                      return <div ref={videoContainerRef} className="w-full h-full" />;
                    }

                    return (
                      <video
                        src={videoUrl}
                        className="w-full h-full"
                        controls
                        onEnded={() => {
                          if (!activeLesson.completed) {
                            markLessonComplete(activeLesson.id);
                          }
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Assignment with Upload */}
            {activeLesson && activeLesson.content_type === 'assignment' && (() => {
              const assignmentStatus = getLessonStatus(activeLesson);
              const deadlinePassed = activeLesson.deadline && new Date(activeLesson.deadline) < new Date();
              return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                {/* Assignment Header with Deadline */}
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900">{activeLesson.title}</h2>
                    <p className="text-sm text-slate-500 font-medium">Assignment</p>
                  </div>
                  <div className="text-right">
                    {activeLesson.deadline && (
                      <div>
                        <p className="text-xs text-slate-500">Due Date</p>
                        <p className={`text-sm font-semibold ${deadlinePassed ? 'text-red-600' : 'text-green-600'}`}>
                          {new Date(activeLesson.deadline).toLocaleString('en-IN', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                          })} IST
                        </p>
                        {deadlinePassed && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 mt-1">
                            <XCircle className="w-3 h-3" /> Deadline Passed
                          </span>
                        )}
                      </div>
                    )}
                    {/* Status badge */}
                    {assignmentStatus === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold mt-1">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {assignmentStatus === 'missed' && !assignmentSubmission && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold mt-1">
                        <XCircle className="w-3 h-3" /> Missed
                      </span>
                    )}
                  </div>
                </div>

                {/* Previous Submission Banner */}
                {assignmentSubmission && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-green-800 mb-1">Your Submission</h3>
                        <p className="text-xs text-green-600">
                          Submitted on: {assignmentSubmission.submitted_at ? new Date(assignmentSubmission.submitted_at).toLocaleString('en-IN', {
                            year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                          }) : 'N/A'} IST
                        </p>
                        {assignmentSubmission.file_url && (
                          <a href={assignmentSubmission.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800 mt-1 inline-block">
                            View submitted file
                          </a>
                        )}
                        {assignmentSubmission.link_url && (
                          <a href={assignmentSubmission.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800 mt-1 inline-block ml-3">
                            View submitted link
                          </a>
                        )}
                        {assignmentSubmission.text_content && !assignmentSubmission.link_url && (
                          <p className="text-xs text-green-700 mt-1">Text: {assignmentSubmission.text_content}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {assignmentSubmission.score != null || assignmentSubmission.grade != null ? (
                          <div>
                            <p className="text-xs text-green-500">Grade</p>
                            <p className="text-2xl font-bold text-green-700">
                              {assignmentSubmission.grade ?? assignmentSubmission.score}/100
                            </p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-semibold">
                              Graded
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Teacher feedback */}
                    {assignmentSubmission.feedback && (
                      <div className="mt-4 pt-3 border-t border-green-200">
                        <p className="text-xs font-semibold text-green-800 mb-1">Teacher Feedback:</p>
                        <p className="text-sm text-green-700 bg-white/60 rounded-lg p-3">{assignmentSubmission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="prose max-w-none mb-6">
                  <p className="text-slate-600 mb-4">{activeLesson.description || 'Assignment instructions will appear here.'}</p>
                </div>

                {/* Upload Section - Only show if deadline not passed or no deadline */}
                {!deadlinePassed ? (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6 md:p-8">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-purple-600" />
                      Submit Your Work
                    </h3>
                    
                    <div className="space-y-4">
                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Upload File <span className="text-gray-400 font-normal">(max 5 MB)</span>
                        </label>
                        <input
                          type="file"
                          onChange={handleAssignmentFileChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-xl file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-100 file:text-purple-700
                            hover:file:bg-purple-200
                            cursor-pointer"
                        />
                        {assignmentFileError && (
                          <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            {assignmentFileError}
                          </p>
                        )}
                        {assignmentFile && (
                          <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            {assignmentFile.name} ({(assignmentFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <span className="text-sm text-gray-500">OR</span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                      </div>

                      {/* Google Drive Link */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Google Drive / External Link
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={assignmentLink}
                            onChange={(e) => setAssignmentLink(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          {assignmentLink && (
                            <a href={assignmentLink} target="_blank" rel="noopener noreferrer"
                              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm">
                              <LinkIcon className="w-4 h-4" />
                              Preview
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">For files larger than 5 MB, upload to Google Drive and paste the sharing link here.</p>
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleAssignmentSubmit}
                        disabled={assignmentSubmitting || (!assignmentFile && !assignmentLink.trim())}
                        className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {assignmentSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Submit Assignment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Deadline passed - show missed message */
                  !assignmentSubmission && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                      <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-red-700 mb-1">Deadline Passed</h3>
                      <p className="text-sm text-red-500">The submission deadline for this assignment has passed. You can no longer submit.</p>
                    </div>
                  )
                )}
              </div>
              );
            })()}

            {/* Quiz Content */}
            {activeLesson && activeLesson.content_type === 'quiz' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                {quizLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading quiz...</p>
                  </div>
                ) : quizData ? (
                  <>
                    {/* Quiz Header with Total Marks & Last Submission Info */}
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                        <FileQuestion className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900">{quizData.quiz.title}</h2>
                        <p className="text-sm text-slate-500 font-medium">Assessment</p>
                      </div>
                      <div className="text-right">
                        {quizData.quiz.questions && quizData.quiz.questions.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-slate-500">Total Marks</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {quizData.quiz.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0)}
                            </p>
                          </div>
                        )}
                        {quizData.quiz.deadline && (
                          <>
                            <p className="text-xs text-slate-500">Due Date</p>
                            <p className="text-sm font-semibold text-red-600">
                              {new Date(quizData.quiz.deadline).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata'
                              })} IST
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Previous Submission Score Banner */}
                    {quizData.last_submission && (
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-5 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-indigo-800 mb-1">Last Submission</h3>
                            <p className="text-xs text-indigo-600">
                              Submitted on: {new Date(quizData.last_submission.submitted_at).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata'
                              })} IST
                            </p>
                          </div>
                          <div className="text-right">
                            {quizData.last_submission.score != null && (
                              <div>
                                <p className="text-xs text-indigo-500">Score</p>
                                <p className="text-2xl font-bold text-indigo-700">
                                  {quizData.last_submission.score}/{quizData.quiz.questions?.reduce((sum: number, q: any) => sum + (q.marks || 1), 0) || '?'}
                                </p>
                                <p className="text-xs text-indigo-500">
                                  {quizData.quiz.questions ? Math.round((quizData.last_submission.score / quizData.quiz.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0)) * 100) : 0}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quiz Description */}
                    {quizData.quiz.description && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> {quizData.quiz.description}
                        </p>
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3">Instructions</h3>
                      <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
                        <li>You may submit any number of times{quizData.quiz.deadline ? ' before the due date' : ''}. The final submission will be considered for grading.</li>
                        {quizData.quiz.deadline ? (
                          <li>Your score and correct answers will be revealed after the deadline passes.</li>
                        ) : (
                          <li>Your score and correct answers will be revealed immediately after submission.</li>
                        )}
                        <li>All questions must be answered</li>
                        {quizData.quiz.time_limit_minutes && (
                          <li>Time limit: {quizData.quiz.time_limit_minutes} minutes</li>
                        )}
                        {quizData.quiz.max_attempts && (
                          <li>Maximum attempts: {quizData.quiz.max_attempts} (Used: {quizData.attempts_used})</li>
                        )}
                      </ul>
                    </div>

                    {/* Deadline passed or max attempts message */}
                    {(quizData.deadline_passed || !quizData.can_submit) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-800 font-semibold">
                          {quizData.deadline_passed 
                            ? 'The deadline for this quiz has passed. No more submissions are allowed.'
                            : 'You have used all available attempts for this quiz.'}
                        </p>
                      </div>
                    )}

                    {/* Quiz Questions */}
                    {quizData.quiz.questions && quizData.quiz.questions.length > 0 ? (
                      <div className="space-y-6">
                        <h3 className="font-bold text-slate-900 text-lg mb-4">Questions</h3>
                        
                        {quizData.quiz.questions.map((question: any, index: number) => {
                          const qType = question.type || 'mcq';
                          const correctAns = question.correctAnswer ?? question.correct_answer;
                          const isMultiSelect = (qType === 'multiple-choice' || qType === 'mcq') && Array.isArray(correctAns);
                          const isFillBlank = qType === 'fill-blank' || qType === 'fill_in_the_blank' || qType === 'fill-in-blank';

                          return (
                            <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                              <div className="flex items-start gap-3 mb-4">
                                <span className="font-bold text-slate-700">{index + 1})</span>
                                <div className="flex-1">
                                  <p className="text-slate-700 mb-1">{question.question || question.text}</p>
                                  <span className="text-xs text-slate-500 italic">{question.marks || 1} point{(question.marks || 1) > 1 ? 's' : ''}</span>
                                </div>
                              </div>

                              {/* Fill-in-the-blank input */}
                              {isFillBlank ? (
                                <div className="pl-7">
                                  <input
                                    type="text"
                                    placeholder="Type your answer here..."
                                    value={quizAnswers[index] || ''}
                                    onChange={(e) => {
                                      const newAnswers = { ...quizAnswers };
                                      newAnswers[index] = e.target.value;
                                      setQuizAnswers(newAnswers);
                                    }}
                                    disabled={quizData.deadline_passed || !quizData.can_submit}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  />
                                </div>
                              ) : (
                                /* MCQ options */
                                <div className="space-y-3 pl-7">
                                  {question.options && question.options.map((option: string, optIndex: number) => (
                                    <label 
                                      key={optIndex} 
                                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors"
                                    >
                                      <input 
                                        type={isMultiSelect ? 'checkbox' : 'radio'}
                                        name={`question-${index}`}
                                        value={optIndex}
                                        checked={
                                          Array.isArray(quizAnswers[index])
                                            ? quizAnswers[index].includes(optIndex)
                                            : quizAnswers[index] === optIndex
                                        }
                                        onChange={(e) => {
                                          const newAnswers = { ...quizAnswers };
                                          if (isMultiSelect) {
                                            if (!Array.isArray(newAnswers[index])) {
                                              newAnswers[index] = [];
                                            }
                                            if (e.target.checked) {
                                              newAnswers[index] = [...newAnswers[index], optIndex];
                                            } else {
                                              newAnswers[index] = newAnswers[index].filter((a: number) => a !== optIndex);
                                            }
                                          } else {
                                            newAnswers[index] = optIndex;
                                          }
                                          setQuizAnswers(newAnswers);
                                        }}
                                        className="w-4 h-4 text-indigo-600"
                                        disabled={quizData.deadline_passed || !quizData.can_submit}
                                      />
                                      <span className="text-slate-700">{option}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-8">
                        <p>No questions available for this quiz.</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    {quizData.quiz.questions && quizData.quiz.questions.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <button 
                          onClick={handleQuizSubmit}
                          disabled={quizData.deadline_passed || !quizData.can_submit || quizSubmitting}
                          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    <p>Failed to load quiz. Please try again.</p>
                  </div>
                )}
              </div>
            )}

            {/* Quiz Review Results - Shown after submission */}
            {activeLesson && activeLesson.content_type === 'quiz' && quizReview && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 mt-6">
                {/* Score Banner with submission time */}
                <div className={`rounded-2xl p-6 text-white mb-6 ${
                  quizReview.show_answers
                    ? (quizReview.percentage >= 70 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                      : quizReview.percentage >= 50 
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600' 
                        : 'bg-gradient-to-r from-red-600 to-rose-600')
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">Quiz Submitted!</h2>
                      {quizReview.show_answers ? (
                        <p className="opacity-90">Your answers have been scored</p>
                      ) : (
                        <p className="opacity-90">Answers will be revealed after the deadline</p>
                      )}
                      {quizReview.submitted_at && (
                        <p className="text-xs opacity-80 mt-2">
                          Submitted: {new Date(quizReview.submitted_at).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata'
                          })} IST
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {quizReview.show_answers ? (
                        <>
                          <div className="text-4xl font-bold">{quizReview.score}/{quizReview.total}</div>
                          <div className="text-sm opacity-90">{Math.round(quizReview.percentage)}%</div>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-bold">Pending</div>
                          <div className="text-xs opacity-80 mt-1">
                            Deadline: {quizReview.deadline ? new Date(quizReview.deadline).toLocaleString('en-IN', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                            }) : '--'} IST
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Question-by-Question Review - only show details if answers should be revealed */}
                {quizReview.show_answers ? (
                  <>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Question Review</h3>
                    <div className="space-y-4">
                      {quizReview.questions.map((question: any, index: number) => {
                        const studentAnswer = quizReview.answers[index];
                        const correctAnswer = question.correctAnswer ?? question.correct_answer;
                        const marks = question.marks || 1;
                        const qType = question.type || 'mcq';
                        const isFillBlank = qType === 'fill-blank' || qType === 'fill_in_the_blank' || qType === 'fill-in-blank';
                        
                        // Check if correct - handle both index-based and string-based correct answers
                        let isCorrect = false;
                        if (isFillBlank) {
                          const studentText = (String(studentAnswer || '')).trim().toLowerCase();
                          const correctText = (String(correctAnswer || '')).trim().toLowerCase();
                          isCorrect = studentText === correctText;
                        } else if (typeof correctAnswer === 'string' && question.options) {
                          // String-based correct answer - find index in options
                          const correctIndex = question.options.indexOf(correctAnswer);
                          isCorrect = studentAnswer === correctIndex;
                        } else if (Array.isArray(correctAnswer)) {
                          let correctIndices: number[];
                          if (typeof correctAnswer[0] === 'string' && question.options) {
                            correctIndices = correctAnswer.map((a: string) => question.options.indexOf(a)).filter((i: number) => i !== -1);
                          } else {
                            correctIndices = correctAnswer;
                          }
                          const studentSet = new Set(Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer]);
                          const correctSet = new Set(correctIndices);
                          isCorrect = studentSet.size === correctSet.size && [...studentSet].every((a: number) => correctSet.has(a));
                        } else {
                          isCorrect = studentAnswer === correctAnswer;
                        }

                        // Resolve correct option index for MCQ display
                        let correctOptionIndex: number | number[] | null = null;
                        if (!isFillBlank) {
                          if (typeof correctAnswer === 'string' && question.options) {
                            correctOptionIndex = question.options.indexOf(correctAnswer);
                          } else if (Array.isArray(correctAnswer)) {
                            if (typeof correctAnswer[0] === 'string' && question.options) {
                              correctOptionIndex = correctAnswer.map((a: string) => question.options.indexOf(a));
                            } else {
                              correctOptionIndex = correctAnswer;
                            }
                          } else {
                            correctOptionIndex = correctAnswer;
                          }
                        }

                        return (
                          <div key={index} className={`border-2 rounded-lg p-5 ${isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-2">
                                <span className={`text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  {isCorrect ? '✓' : '✗'}
                                </span>
                                <span className="font-semibold text-slate-700">Q{index + 1}: {question.question || question.text}</span>
                              </div>
                              <span className={`text-sm font-bold px-2 py-1 rounded ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                {isCorrect ? marks : 0}/{marks}
                              </span>
                            </div>
                            
                            {/* Fill-in-blank review */}
                            {isFillBlank ? (
                              <div className="space-y-2 pl-6">
                                <div className={`flex items-center gap-3 p-3 border rounded ${isCorrect ? 'border-green-400 bg-green-100' : 'border-red-400 bg-red-100'}`}>
                                  <span className={`font-bold text-sm ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                    {isCorrect ? '✓' : '✗'}
                                  </span>
                                  <span className="text-slate-700">Your answer: <strong>{String(studentAnswer || '(empty)')}</strong></span>
                                </div>
                                {!isCorrect && (
                                  <div className="flex items-center gap-3 p-3 border rounded border-green-400 bg-green-50">
                                    <span className="text-green-600 font-bold text-sm">✓</span>
                                    <span className="text-slate-700">Correct answer: <strong>{String(correctAnswer)}</strong></span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* MCQ Options with highlighting */
                              <div className="space-y-2 pl-6">
                                {question.options?.map((option: string, optIdx: number) => {
                                  const isStudentPick = Array.isArray(studentAnswer) ? studentAnswer.includes(optIdx) : studentAnswer === optIdx;
                                  const isCorrectOption = Array.isArray(correctOptionIndex) 
                                    ? correctOptionIndex.includes(optIdx) 
                                    : correctOptionIndex === optIdx;
                                  
                                  let optionClass = 'border-gray-200 bg-white';
                                  if (isCorrectOption && isStudentPick) optionClass = 'border-green-400 bg-green-100';
                                  else if (isCorrectOption) optionClass = 'border-green-400 bg-green-50';
                                  else if (isStudentPick) optionClass = 'border-red-400 bg-red-100';
                                  
                                  return (
                                    <div key={optIdx} className={`flex items-center gap-3 p-3 border rounded ${optionClass}`}>
                                      {isCorrectOption && <span className="text-green-600 font-bold text-sm">✓</span>}
                                      {isStudentPick && !isCorrectOption && <span className="text-red-600 font-bold text-sm">✗</span>}
                                      {!isCorrectOption && !isStudentPick && <span className="text-gray-400 text-sm">○</span>}
                                      <span className="text-slate-700">{option}</span>
                                      {isStudentPick && <span className="text-xs text-slate-500 ml-auto">(Your answer)</span>}
                                      {isCorrectOption && !isStudentPick && <span className="text-xs text-green-600 ml-auto">(Correct answer)</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Deadline not passed - don't reveal answers */
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-3">📝</div>
                    <h3 className="text-lg font-bold text-blue-800 mb-2">Submission Recorded</h3>
                    <p className="text-sm text-blue-700">
                      Your answers have been saved. The correct answers and your score will be revealed after the quiz deadline passes.
                    </p>
                    {quizReview.deadline && (
                      <p className="text-xs text-blue-600 mt-3">
                        Deadline: {new Date(quizReview.deadline).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata'
                        })} IST
                      </p>
                    )}
                  </div>
                )}

                {/* Retake button if allowed */}
                {quizData && quizData.can_submit && !quizData.deadline_passed && (
                  <div className="mt-6 pt-4 border-t">
                    <button
                      onClick={() => {
                        setQuizReview(null);
                        setQuizAnswers({});
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Retake Quiz
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Final Exam View - separate from week modules */}
            {leftSidebarTab === 'content' && activeFinalExam && !activeLesson && !showAbout && !showGradingPolicy && !showSchedule && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                <div className="flex items-start gap-3 mb-6 pb-6 border-b border-slate-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center">
                    <FileQuestion className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900">{activeFinalExam.title}</h2>
                    <p className="text-sm text-slate-500 font-medium">Final Exam • {activeFinalExam.exam_type?.toUpperCase()}</p>
                  </div>
                </div>

                {activeFinalExam.description && (
                  <p className="text-slate-700 mb-4">{activeFinalExam.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-xs text-orange-600 font-semibold mb-1">Total Marks</p>
                    <p className="text-lg font-bold text-orange-700">{activeFinalExam.points ?? '--'}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Due Date</p>
                    <p className="text-lg font-bold text-blue-700">{activeFinalExam.due_date ? new Date(activeFinalExam.due_date).toLocaleString() : 'Not set'}</p>
                  </div>
                </div>

                {activeFinalExam.instructions && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Instructions</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{activeFinalExam.instructions}</p>
                  </div>
                )}

                {activeFinalExam.exam_type === 'interview' && activeFinalExam.interview && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-2">Interview Schedule</h3>
                    <p className="text-sm text-indigo-700">
                      {activeFinalExam.interview.scheduled_date
                        ? `Scheduled: ${new Date(activeFinalExam.interview.scheduled_date).toLocaleString()}`
                        : 'Interview time will be announced by your teacher.'}
                    </p>
                    {activeFinalExam.interview.duration_minutes && (
                      <p className="text-xs text-indigo-600 mt-1">Duration: {activeFinalExam.interview.duration_minutes} minutes</p>
                    )}
                    {activeFinalExam.interview.meeting_link && (
                      <a
                        href={activeFinalExam.interview.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-3 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                      >
                        Join Interview Meeting
                      </a>
                    )}
                  </div>
                )}

                {activeFinalExam.submission ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-700 mb-1">Submission Status: {activeFinalExam.submission.status || 'Submitted'}</p>
                    {activeFinalExam.submission.submitted_at && (
                      <p className="text-xs text-green-600">Submitted: {new Date(activeFinalExam.submission.submitted_at).toLocaleString()}</p>
                    )}
                    {activeFinalExam.submission.grade !== undefined && activeFinalExam.submission.grade !== null && (
                      <p className="text-xs text-green-700 mt-1">Grade: {activeFinalExam.submission.grade}</p>
                    )}
                    {activeFinalExam.submission.feedback && (
                      <p className="text-xs text-green-700 mt-1">Feedback: {activeFinalExam.submission.feedback}</p>
                    )}
                  </div>
                ) : activeFinalExam.exam_type !== 'interview' ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-2">Submit Final Exam</p>
                      <div className="flex flex-wrap gap-2">
                        {(['text', 'link', 'file'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setFinalExamSubmissionType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                              finalExamSubmissionType === type
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {type === 'text' ? 'Text Response' : type === 'link' ? 'Submission Link' : 'File URL'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {finalExamSubmissionType === 'text' && (
                      <textarea
                        value={finalExamTextContent}
                        onChange={(e) => setFinalExamTextContent(e.target.value)}
                        rows={6}
                        placeholder="Write your final exam response here..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                      />
                    )}

                    {finalExamSubmissionType === 'link' && (
                      <input
                        type="url"
                        value={finalExamLinkUrl}
                        onChange={(e) => setFinalExamLinkUrl(e.target.value)}
                        placeholder="https://docs.google.com/..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                      />
                    )}

                    {finalExamSubmissionType === 'file' && (
                      <input
                        type="url"
                        value={finalExamFileUrl}
                        onChange={(e) => setFinalExamFileUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                      />
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={handleFinalExamSubmit}
                        disabled={finalExamSubmitting}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {finalExamSubmitting ? 'Submitting...' : 'Submit Final Exam'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-700 font-medium">Interview final exam is scheduled by your teacher. Please attend at your assigned time.</p>
                  </div>
                )}
              </div>
            )}

            {/* Default: Empty State */}
            {leftSidebarTab === 'content' && !showAbout && !showGradingPolicy && !activeLesson && !showSchedule && !activeFinalExam && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a topic to begin</h3>
                <p className="text-slate-500">Choose from &quot;About Course&quot;, &quot;Grading Policy&quot;, or select a week from the sidebar</p>
              </div>
            )}
          </div>
        </main>
      </div>
      </div>
    );
  }
