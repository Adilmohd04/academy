'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { 
  Plus, GripVertical, Video, FileText, Link as LinkIcon, 
  Calendar, Trash2, Edit2, BookOpen, Loader2, ChevronDown, ChevronRight,
  ArrowLeft, Save, Users, MessageSquare, Bell, Settings as SettingsIcon,
  ClipboardList, Upload, Award, Clock, CheckCircle, XCircle, X, Globe, Pin, User, ThumbsUp, ThumbsDown, ChevronUp
} from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { CertificateTemplateDesigner } from '@/features/certificates';
import { utcToLocal, localToUTC } from '@/lib/dateUtils';

type TabType = 'about' | 'content' | 'finalExams' | 'students' | 'submissions' | 'discussion' | 'announcements' | 'schedule' | 'certificateDesign' | 'settings';

interface Week {
  id: string;
  week_number: number;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
  isExpanded: boolean;
  is_published?: boolean;
  release_date?: string;
}

interface Lesson {
  id: string;
  title: string;
  content_type: 'video' | 'quiz' | 'assignment' | 'resource';
  content_url?: string;
  description?: string;
  duration?: number;
  video_duration_minutes?: number;
  order_index: number;
  quiz_questions?: QuizQuestion[];
  language?: string;
  video_urls?: { language: string; url: string }[]; // Multi-language video support
  assignment_type?: 'audio' | 'video' | 'document' | 'pdf'; // Assignment upload type
  assignment_details?: any; // Assignment metadata
  is_published?: boolean; // Published status
  release_date?: string; // When quiz/assignment becomes available
  deadline?: string; // Submission deadline
  time_limit_minutes?: number; // Time limit for quiz
  max_attempts?: number; // Maximum attempts allowed
  show_answers_after_deadline?: boolean; // Show answers after deadline
  show_correct_answers?: boolean; // Show answers immediately after submission
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'fill';
  options?: string[];
  correct_answer: string;
  marks: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  long_description?: string;
  category: string;
  tags?: string[];
  level: string;
  price: number;
  capacity?: number;
  syllabus?: string;
  prerequisites?: string[];
  prerequisite_courses?: string[];
  course_language?: string;
  status: string;
  is_published?: boolean;
  image_url?: string;
  course_image_url?: string;
  thumbnail_image?: string;
  teacher_name?: string;
  instructors?: Array<{
    id: string;
    name: string;
    email?: string;
    title?: string;
    bio?: string;
    avatar?: string;
  }>;
  co_teachers?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  learning_outcomes?: string;
  skills_gained?: string;
  teacher_title?: string;
  teacher_bio?: string;
  teacher_avatar?: string;
  estimated_hours?: number;
  language?: string;
  course_type?: 'pre-recorded' | 'live' | 'hybrid';
  starts_at?: string;
  ends_at?: string;
  mentoring_text?: string;
  mentoring_structured?: any;
  schedule_frequency?: string;
  schedule_timezone?: string;
  enrollment_deadline?: string;
  course_format_description?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrolled_at: string;
  progress: number;
}

interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  assignment_title: string;
  submitted_at: string;
  drive_link: string;
  file_url?: string;
  link_url?: string;
  text_content?: string;
  grade?: number;
  feedback?: string;
  status: 'pending' | 'graded';
  type?: 'quiz' | 'assignment';
  score?: number;
  total_points?: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface ScheduledClass {
  id: string;
  topic?: string;
  date?: string;
  time?: string;
  title?: string;
  scheduled_date?: string;
  start_time?: string;
  meeting_link?: string;
  meet_link?: string; // Backend sometimes returns this field
  status: 'scheduled' | 'upcoming' | 'live' | 'completed' | 'cancelled' | 'rescheduled';
  attendance_count?: number;
  original_date?: string; // For rescheduled classes
}

const LANGUAGES = ['English', 'Tamil', 'Arabic', 'Urdu', 'Hindi', 'Other'];

type BuilderApiFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const BuilderApiFetchContext = createContext<BuilderApiFetch | null>(null);

function useBuilderApiFetch(): BuilderApiFetch {
  const apiFetch = useContext(BuilderApiFetchContext);

  if (!apiFetch) {
    throw new Error('The course builder authentication context is unavailable.');
  }

  return apiFetch;
}

export default function CourseBuilderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const courseId = params.courseId as string;
  const isAdmin = searchParams.get('from') === 'admin';
  const initialTab = (searchParams.get('tab') as TabType | null) || 'about';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [course, setCourse] = useState<Course | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]); // For prerequisite dropdown
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Keep all builder API calls on the verified Clerk session. The backend no
  // longer accepts a client-controlled user id header as proof of identity.
  const authenticatedFetch = useCallback<BuilderApiFetch>(async (input, init = {}) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const headers = new Headers(init.headers);
    headers.delete('x-clerk-user-id');
    headers.set('Authorization', `Bearer ${token}`);

    return globalThis.fetch(input, { ...init, headers });
  }, [getToken]);

  // This binding ensures that every existing request in this top-level builder
  // component is authenticated, including requests triggered from button handlers.
  const fetch = authenticatedFetch;

  // Grading policy state - text inputs
  const [gradingPolicy, setGradingPolicy] = useState({
    quiz_percentage: '30',
    activity_percentage: '40',
    final_exam_percentage: '30',
    passing_percentage: '70'
  });

  useEffect(() => {
    if (userId && courseId && !isFetching) {
      fetchAllData();
    }
  }, [userId, courseId]);

  useEffect(() => {
    const nextTab = (searchParams.get('tab') as TabType | null) || 'about';
    setActiveTab(nextTab);
  }, [searchParams]);

  const fetchAllData = async () => {
    if (isFetching) return; // Prevent multiple simultaneous fetches
    
    setIsFetching(true);
    try {
      const [courseRes, weeksRes, coursesListRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
          headers: {}
        }).catch(() => null),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/weeks`, {
          headers: {}
        }).catch(() => null),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses?status=published`, {
          headers: {}
        }).catch(() => null)
      ]);

      if (courseRes?.ok) {
        const courseData = await courseRes.json();
        // Handle both direct course object and wrapped response
        const courseObj = courseData.data || courseData;
        // Map course_image_url to image_url for frontend use
        const mappedCourse = {
          ...courseObj,
          image_url: courseObj.course_image_url || courseObj.image_url
        };
        setCourse(mappedCourse);
        // Load grading policy from course data
        if (courseObj.grading_weights) {
          const w = courseObj.grading_weights;
          const hasAnyWeight = Object.values(w || {}).some((value) => value !== null && value !== undefined && value !== '');
          const toPolicyString = (value: unknown, fallback: number) => {
            if (value === null || value === undefined || value === '') return String(fallback);
            const parsed = Number(value);
            return Number.isNaN(parsed) ? String(fallback) : String(parsed);
          };

          setGradingPolicy({
            quiz_percentage: toPolicyString(w.quiz_percentage ?? w.quiz_weight ?? w.quiz, hasAnyWeight ? 0 : 30),
            activity_percentage: toPolicyString(w.assignment_percentage ?? w.activity_percentage ?? w.activity_weight, hasAnyWeight ? 0 : 40),
            final_exam_percentage: toPolicyString(w.final_exam_percentage ?? w.final_percentage ?? w.final_exam_weight, hasAnyWeight ? 0 : 30),
            passing_percentage: toPolicyString(courseObj.passing_percentage, 70)
          });
        }
        console.log('Course loaded:', mappedCourse);
      }

      if (weeksRes?.ok) {
        const weeksData = await weeksRes.json();
        console.log('Weeks API Response:', weeksData);
        const weeksArray = Array.isArray(weeksData) ? weeksData : (weeksData.data || []);
        console.log('Weeks Array:', weeksArray);
        const processedWeeks = weeksArray.map((w: any) => {
          console.log('Week:', w.title, 'Lessons:', w.lessons);
          console.log('Week full object:', JSON.stringify(w, null, 2));
          return { ...w, isExpanded: false };
        });
        setWeeks(processedWeeks);
      }

      // Fetch enrolled students
      const studentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/students`, {
        headers: {}
      }).catch(() => null);
      
      if (studentsRes?.ok) {
        const studentsData = await studentsRes.json();
        // Backend returns { students: [...] }, check for that first
        setStudents(Array.isArray(studentsData) ? studentsData : (studentsData.students || studentsData.data || []));
      } else {
        setStudents([]);
      }
      
      // Initialize empty arrays for other data
      setSubmissions([]);
      setAnnouncements([]);
      setScheduledClasses([]);

      if (coursesListRes?.ok) {
        const coursesData = await coursesListRes.json();
        const coursesList = Array.isArray(coursesData) ? coursesData : (coursesData.data || []);
        // Exclude current course from prerequisites list
        setAvailableCourses(coursesList.filter((c: Course) => c.id !== courseId));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Only send fields that exist in the database
      const allowedFields = [
        'title', 'description', 'short_description', 'long_description',
        'teacher_id', 'price', 'is_free', 'thumbnail_url', 'course_image_url',
        'thumbnail_image', 'duration_weeks', 'status', 'approval_status',
        'is_live', 'category', 'level', 'prerequisites', 'prerequisite_courses',
        'enrollment_cap', 'passing_threshold', 'syllabus', 'course_languages',
        'tags', 'learning_outcomes', 'skills_gained', 'teacher_title',
        'teacher_bio', 'estimated_hours', 'language', 'starts_at',
        'course_type', 'instructors',
        // Coursera-style fields
        'mentoring_text', 'mentoring_structured', 'schedule_frequency',
        'schedule_timezone', 'enrollment_deadline', 'course_format_description',
        // Grading policy fields
        'grading_weights', 'passing_percentage'
      ];
      
      const parsePolicyValue = (value: string, fallback: number) => {
        const trimmed = String(value ?? '').trim();
        if (trimmed === '') return fallback;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      // Map image_url to course_image_url and inject grading policy
      const preparedCourse = {
        ...course,
        course_image_url: course.image_url || course.course_image_url,
        grading_weights: {
          quiz_percentage: parsePolicyValue(gradingPolicy.quiz_percentage, 30),
          assignment_percentage: parsePolicyValue(gradingPolicy.activity_percentage, 40),
          activity_percentage: parsePolicyValue(gradingPolicy.activity_percentage, 40),
          final_exam_percentage: parsePolicyValue(gradingPolicy.final_exam_percentage, 30)
        },
        passing_percentage: parsePolicyValue(gradingPolicy.passing_percentage, 70)
      };
      
      const courseData = Object.keys(preparedCourse)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = preparedCourse[key];
          return obj;
        }, {});
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to save');
      }
      
      const updatedCourse = await response.json();
      // Update local state with the response data
      setCourse(prev => ({
        ...prev,
        ...updatedCourse.data,
        teacher_name: prev.teacher_name,
        co_teachers: prev.co_teachers
      }));
      
      setHasUnsavedChanges(false);
      alert('Changes saved successfully! You can continue editing or publish when ready.');
    } catch (error) {
      console.error('Error saving:', error);
      alert(`Failed to save changes: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = () => {
    if (isAdmin) {
      router.push('/admin/courses');
    } else {
      router.push('/teacher/courses');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'about' as TabType, label: 'About Course', icon: BookOpen },
    { id: 'content' as TabType, label: 'Content', icon: FileText },
    { id: 'finalExams' as TabType, label: 'Final Exams', icon: Award },
    { id: 'students' as TabType, label: 'Students', icon: Users },
    { id: 'submissions' as TabType, label: 'Submissions', icon: ClipboardList },
    { id: 'discussion' as TabType, label: 'Discussion', icon: MessageSquare },
    { id: 'announcements' as TabType, label: 'Announcements', icon: Bell },
    { id: 'schedule' as TabType, label: 'Schedule Classes', icon: Calendar },
    { id: 'certificateDesign' as TabType, label: 'Certificate Design', icon: Award },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <BuilderApiFetchContext.Provider value={authenticatedFetch}>
      <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">LMA</span>
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Little Muslim Academy</h2>
          </div>
          <p className="text-gray-600 text-xs truncate">{course?.title || 'Course Builder'}</p>
        </div>

        {/* Publish All Changes Button */}
        <div className="px-3 pt-3">
          <div className="relative group">
            <button
              onClick={async () => {
                try {
                  setSaving(true);
                  
                  // Step 1: Save course-level data first
                  await saveChanges();
                  
                  // Step 2: Save all lesson data for each week (respecting individual publish states)
                  // This pushes the saved builder state to the DB without changing any publish status
                  const savePromises: Promise<any>[] = [];
                  for (const week of weeks) {
                    if (week.lessons && week.lessons.length > 0) {
                      for (const lesson of week.lessons) {
                        if (lesson.id) {
                          savePromises.push(
                            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/lessons/${lesson.id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                title: lesson.title,
                                description: lesson.description,
                                content_type: lesson.content_type,
                                content_url: lesson.content_url,
                                video_urls: lesson.video_urls || null,
                                quiz_questions: lesson.quiz_questions || null,
                                assignment_details: lesson.assignment_details || null,
                                video_duration_minutes: lesson.video_duration_minutes,
                                // Only quiz/assignment have individual publish control; videos/resources follow the week
                                ...(lesson.content_type === 'quiz' || lesson.content_type === 'assignment' 
                                  ? { is_published: lesson.is_published } 
                                  : {}),
                                release_date: lesson.release_date,
                                deadline: lesson.deadline
                              })
                            })
                          );
                        }
                      }
                    }
                  }
                  
                  await Promise.all(savePromises);
                  setHasUnsavedChanges(false);
                  alert('All changes published successfully! Each week and lesson retains its own publish/draft status.');
                } catch (error) {
                  console.error('Error publishing changes:', error);
                  alert('Failed to publish changes');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              title="Save and publish all builder changes. Each week/lesson keeps its own draft/published status."
            >
              <Upload className="w-4 h-4" />
              {saving ? 'Publishing...' : 'Publish All Changes'}
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <p className="font-semibold mb-1">Publish All Changes</p>
              <p>Saves all course, week, and lesson data to the database. Each week, quiz, and assignment keeps its own draft/published status — only individually published items are visible to students.</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100 font-normal'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Save Status */}
        {hasUnsavedChanges && (
          <div className="px-3 pb-3">
            <div className="bg-orange-50 border border-orange-200 rounded-md p-2 text-center">
              <p className="text-xs text-orange-700 font-medium">Unsaved Changes</p>
            </div>
          </div>
        )}

        {/* Back Button at Bottom */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleBackClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {course?.image_url && (
                <img 
                  src={course.image_url} 
                  alt={course.title || 'Course'}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {course?.title || 'Loading...'}
                </h1>
              </div>
            </div>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === 'about' && <AboutCourseTab course={course} setCourse={setCourse} setHasUnsavedChanges={setHasUnsavedChanges} availableCourses={availableCourses} />}
          {activeTab === 'content' && <ContentTab weeks={weeks} setWeeks={setWeeks} courseId={courseId} userId={userId} setHasUnsavedChanges={setHasUnsavedChanges} />}
          {activeTab === 'finalExams' && <FinalExamsTab courseId={courseId} userId={userId} />}
          {activeTab === 'students' && <StudentsTab students={students} submissions={submissions} courseId={courseId} userId={userId} weeks={weeks} />}
          {activeTab === 'submissions' && <SubmissionsTab submissions={submissions} setSubmissions={setSubmissions} userId={userId} courseId={courseId} students={students} />}
          {activeTab === 'discussion' && <DiscussionTab courseId={courseId} userId={userId} />}
          {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} setAnnouncements={setAnnouncements} courseId={courseId} userId={userId} />}
          {activeTab === 'schedule' && <ScheduleTab scheduledClasses={scheduledClasses} setScheduledClasses={setScheduledClasses} courseId={courseId} userId={userId} />}
          {activeTab === 'certificateDesign' && (
            <CertificateTemplateDesigner
              mode="teacher"
              courseId={courseId}
              userId={userId}
            />
          )}
          {activeTab === 'settings' && <SettingsTab course={course} setCourse={setCourse} gradingPolicy={gradingPolicy} setGradingPolicy={setGradingPolicy} setHasUnsavedChanges={setHasUnsavedChanges} userId={userId} courseId={courseId} />}
        </div>
      </div>
      </div>
    </BuilderApiFetchContext.Provider>
  );
}

// Final Exams Tab Component
function FinalExamsTab({ courseId, userId }: { courseId: string; userId?: string | null }) {
  const fetch = useBuilderApiFetch();

  type FinalExamQuizQuestion = {
    type?: 'mcq' | 'fill';
    question: string;
    options: string[];
    correctOptionIndex?: number;
    correctAnswer: string;
    marks: number;
  };

  const createDefaultQuizQuestion = (): FinalExamQuizQuestion => ({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctOptionIndex: -1,
    correctAnswer: '',
    marks: 1
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoscheduling, setAutoscheduling] = useState(false);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [updatingInterviewId, setUpdatingInterviewId] = useState<string | null>(null);
  const [finalExams, setFinalExams] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewerOptions, setInterviewerOptions] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [interviewEdits, setInterviewEdits] = useState<Record<string, any>>({});
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    exam_type: 'quiz',
    points: 100,
    due_date: '',
    instructions: '',
    is_published: false,
    publish_at: ''
  });

  const [quizQuestions, setQuizQuestions] = useState<FinalExamQuizQuestion[]>([createDefaultQuizQuestion()]);
  const [questionPasteInputs, setQuestionPasteInputs] = useState<Record<number, string>>({});
  const [questionImportFeedback, setQuestionImportFeedback] = useState<Record<number, { type: 'success' | 'error'; message: string }>>({});

  const [interviewConfig, setInterviewConfig] = useState({
    timezone: 'Asia/Kolkata',
    slot_duration_minutes: 15,
    max_students_per_day: 30,
    allow_multi_day: true,
    auto_assign_co_teachers: true
  });

  const [interviewScheduleWindow, setInterviewScheduleWindow] = useState({
    start_date: '',
    end_date: '',
    daily_start_time: '09:00',
    daily_end_time: '17:00',
    break_minutes: 0,
    meeting_link: ''
  });

  const fetchFinalExams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/final-exams`, {
        headers: {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch final exams');
      }

      const data = await response.json();
      const exams = data.finalExams || [];
      setFinalExams(exams);

      if (exams.length > 0 && !selectedExamId) {
        loadExamIntoForm(exams[0]);
      }
    } catch (error) {
      console.error('Error fetching final exams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && userId) {
      fetchFinalExams();
    }
  }, [courseId, userId, fetch]);

  const fetchInterviewSchedule = async (examId: string) => {
    if (!examId || !userId) return;

    try {
      setInterviewsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/final-exams/${examId}/interviews`, {
        headers: {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch interview schedule');
      }

      const data = await response.json();
      const interviewItems = data.interviews || [];
      setInterviews(interviewItems);
      setInterviewerOptions(data.interviewers || []);
      const mappedEdits = interviewItems.reduce((acc: any, item: any) => {
        acc[item.id] = {
          scheduled_date: item.scheduled_date ? new Date(item.scheduled_date).toISOString().slice(0, 16) : '',
          duration_minutes: item.duration_minutes || 15,
          meeting_link: item.meeting_link || '',
          status: item.status || 'scheduled',
          assigned_interviewer_id: item?.assignment_meta?.assigned_interviewer_id || ''
        };
        return acc;
      }, {});
      setInterviewEdits(mappedEdits);
    } catch (error) {
      console.error('Error fetching interview schedule:', error);
      setInterviews([]);
      setInterviewerOptions([]);
      setInterviewEdits({});
    } finally {
      setInterviewsLoading(false);
    }
  };

  const loadExamIntoForm = (exam: any) => {
    let parsedResources: any = exam.resources || {};
    if (typeof exam.resources === 'string') {
      try {
        parsedResources = JSON.parse(exam.resources);
      } catch {
        parsedResources = {};
      }
    }

    setSelectedExamId(exam.id);
    setForm({
      title: exam.title || '',
      description: exam.description || '',
      exam_type: exam.exam_type || 'quiz',
      points: exam.points || 100,
      due_date: exam.due_date ? new Date(exam.due_date).toISOString().slice(0, 16) : '',
      instructions: exam.instructions || '',
      is_published: !!exam.is_published,
      publish_at: parsedResources?.publish_at || ''
    });

    if (exam.exam_type === 'quiz' && parsedResources?.questions && Array.isArray(parsedResources.questions)) {
      const normalizedQuestions = parsedResources.questions.map((item: any) => {
        const normalizedType = item?.type === 'fill' ? 'fill' : 'mcq';
        const normalizedOptions = Array.isArray(item?.options)
          ? [...item.options, '', '', '', ''].slice(0, 4)
          : ['', '', '', ''];

        let correctOptionIndex = typeof item?.correctOptionIndex === 'number'
          ? item.correctOptionIndex
          : -1;

        if (normalizedType === 'mcq' && correctOptionIndex < 0 && item?.correctAnswer) {
          correctOptionIndex = normalizedOptions.findIndex((opt: string) => opt === item.correctAnswer);
        }

        return {
          type: normalizedType,
          question: item?.question || '',
          options: normalizedOptions,
          correctOptionIndex,
          correctAnswer: item?.correctAnswer || '',
          marks: Number(item?.marks) || 1
        };
      });

      setQuizQuestions(normalizedQuestions.length > 0 ? normalizedQuestions : [createDefaultQuizQuestion()]);
    }

    if (exam.exam_type === 'interview' && parsedResources?.interview_config) {
      setInterviewConfig({
        timezone: parsedResources.interview_config.timezone || 'Asia/Kolkata',
        slot_duration_minutes: parsedResources.interview_config.slot_duration_minutes || 15,
        max_students_per_day: parsedResources.interview_config.max_students_per_day || 30,
        allow_multi_day: parsedResources.interview_config.allow_multi_day !== false,
        auto_assign_co_teachers: parsedResources.interview_config.auto_assign_co_teachers !== false
      });

      setInterviewScheduleWindow((prev) => ({
        ...prev,
        daily_start_time: parsedResources.interview_config.daily_start_time || prev.daily_start_time,
        daily_end_time: parsedResources.interview_config.daily_end_time || prev.daily_end_time,
        break_minutes: Number(parsedResources.interview_config.break_minutes || 0)
      }));

      fetchInterviewSchedule(exam.id);
    } else {
      setInterviews([]);
    }
  };

  const buildResourcesPayload = () => {
    const base: any = {
      publish_at: form.publish_at || null
    };

    if (form.exam_type === 'quiz') {
      base.questions = quizQuestions;
    }

    if (form.exam_type === 'interview') {
      base.interview_config = interviewConfig;
    }

    return base;
  };

  const saveExam = async (publishNow = false) => {
    if (!form.title.trim()) {
      alert('Final exam title is required.');
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        title: form.title,
        description: form.description || null,
        exam_type: form.exam_type,
        points: Number(form.points) || 100,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        instructions: form.instructions || null,
        resources: buildResourcesPayload(),
        is_published: publishNow ? true : form.is_published
      };

      const isEdit = !!selectedExamId;
      const endpoint = isEdit
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/final-exams/${selectedExamId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/final-exams`;

      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save final exam');
      }

      await fetchFinalExams();
      alert(publishNow ? 'Final exam published successfully.' : 'Final exam saved as draft.');
    } catch (error: any) {
      console.error('Error saving final exam:', error);
      alert(error.message || 'Failed to save final exam');
    } finally {
      setSaving(false);
    }
  };

  const addQuizQuestion = () => {
    setQuizQuestions((prev) => [...prev, createDefaultQuizQuestion()]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuizQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index));
    setQuestionPasteInputs((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key);
        if (idx < index) {
          next[idx] = value;
        } else if (idx > index) {
          next[idx - 1] = value;
        }
      });
      return next;
    });
    setQuestionImportFeedback((prev) => {
      const next: Record<number, { type: 'success' | 'error'; message: string }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key);
        if (idx < index) {
          next[idx] = value;
        } else if (idx > index) {
          next[idx - 1] = value;
        }
      });
      return next;
    });
  };

  const normalizeCompareText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const resolveCorrectOptionIndex = (answerToken: string, options: string[]) => {
    if (!answerToken?.trim()) return -1;

    const normalizedAnswer = answerToken.trim().toLowerCase();
    const directKeyMatch = normalizedAnswer.match(/^(?:option\s*)?([a-d]|[1-4])(?:\b|[\)\].:\-].*)?$/i);
    if (directKeyMatch) {
      const key = directKeyMatch[1];
      if (/^[a-d]$/i.test(key)) {
        return key.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      }
      return Number(key) - 1;
    }

    const normalizedOptions = options.map((opt) => normalizeCompareText(opt));
    const cleanAnswer = normalizeCompareText(normalizedAnswer);

    const exactIndex = normalizedOptions.findIndex((opt) => opt && opt === cleanAnswer);
    if (exactIndex >= 0) return exactIndex;

    const includeIndex = normalizedOptions.findIndex(
      (opt) => opt && (opt.includes(cleanAnswer) || cleanAnswer.includes(opt))
    );
    return includeIndex;
  };

  const parsePastedQuestionBlock = (raw: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const optionPattern = /^(?:option\s*)?([A-Da-d]|[1-4])[\)\].:\-\s]+(.+)$/i;
    const answerPattern = /^(?:answer|correct\s*(?:answer|option)|ans)\s*[:\-]\s*(.+)$/i;

    let question = '';
    let answerToken = '';
    const options: string[] = [];

    for (const line of lines) {
      const answerMatch = line.match(answerPattern);
      if (answerMatch) {
        answerToken = answerMatch[1].trim();
        continue;
      }

      const optionMatch = line.match(optionPattern);
      if (optionMatch) {
        options.push(optionMatch[2].trim());
        continue;
      }

      if (!question) {
        question = line.replace(/^question\s*[:\-]\s*/i, '').trim();
      } else if (options.length === 0) {
        question = `${question} ${line}`.trim();
      }
    }

    const normalizedOptions = [...options, '', '', '', ''].slice(0, 4);

    const correctOptionIndex = resolveCorrectOptionIndex(answerToken, normalizedOptions);

    return {
      question,
      options: normalizedOptions,
      correctOptionIndex,
      correctAnswer:
        correctOptionIndex >= 0 && normalizedOptions[correctOptionIndex]
          ? normalizedOptions[correctOptionIndex]
          : ''
    };
  };

  // Parse a long pasted document containing many MCQ questions.
  // Splits on blank lines OR on detection of a new question (line ending with "?"
  // followed by lines starting with A)/B)/1)/2)). Each block is then run through
  // parsePastedQuestionBlock.
  const parseBulkQuestionsText = (raw: string): FinalExamQuizQuestion[] => {
    if (!raw?.trim()) return [];

    const lines = raw.split(/\r?\n/);
    const optionPattern = /^\s*(?:option\s*)?([A-Da-d]|[1-4])[\)\].:\-\s]+.+$/i;
    const answerPattern = /^\s*(?:answer|correct\s*(?:answer|option)|ans)\s*[:\-]\s*.+$/i;

    // Greedy block splitter: a block is a contiguous group of non-empty lines.
    // After we hit an "Answer:" line or a blank line, the block ends.
    const blocks: string[][] = [];
    let current: string[] = [];
    let sawAnswerInCurrent = false;

    const flush = () => {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
        sawAnswerInCurrent = false;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+$/, '');
      const trimmed = line.trim();

      if (!trimmed) {
        flush();
        continue;
      }

      // If we already captured an answer for this block, the next non-empty line
      // starts a new block.
      if (sawAnswerInCurrent) {
        flush();
      }

      current.push(trimmed);

      if (answerPattern.test(trimmed)) {
        sawAnswerInCurrent = true;
      }
    }
    flush();

    // Filter blocks that look like real MCQs: must contain at least one option line
    // and at least one non-option line (the question).
    const parsedQuestions: FinalExamQuizQuestion[] = [];
    for (const block of blocks) {
      const hasOption = block.some((l) => optionPattern.test(l));
      if (!hasOption) continue;
      const hasNonOption = block.some((l) => !optionPattern.test(l) && !answerPattern.test(l));
      if (!hasNonOption) continue;

      const parsed = parsePastedQuestionBlock(block.join('\n'));
      if (!parsed.question) continue;
      parsedQuestions.push({
        type: 'mcq',
        question: parsed.question,
        options: parsed.options,
        correctOptionIndex: parsed.correctOptionIndex,
        correctAnswer: parsed.correctAnswer,
        marks: 1,
      });
    }

    return parsedQuestions;
  };

  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportFeedback, setBulkImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const applyBulkImport = (mode: 'append' | 'replace') => {
    const parsed = parseBulkQuestionsText(bulkImportText);
    if (parsed.length === 0) {
      setBulkImportFeedback({
        type: 'error',
        message:
          'No MCQ blocks detected. Each question needs options like "A) ..." or "1) ..." and ideally an "Answer: X" line.',
      });
      return;
    }

    setQuizQuestions((prev) => {
      if (mode === 'replace') return parsed;
      const filtered = prev.filter((q) => q.question?.trim() || (q.options || []).some((o) => o.trim()));
      return [...filtered, ...parsed];
    });
    setBulkImportText('');
    setBulkImportFeedback({
      type: 'success',
      message: `Imported ${parsed.length} question${parsed.length === 1 ? '' : 's'}.`,
    });
  };

  const applyPastedQuestion = (index: number) => {
    const rawText = questionPasteInputs[index]?.trim() || '';
    if (!rawText) {
      setQuestionImportFeedback((prev) => ({
        ...prev,
        [index]: { type: 'error', message: 'Paste question content first.' }
      }));
      return;
    }

    const parsed = parsePastedQuestionBlock(rawText);
    const hasQuestion = !!parsed.question;
    const hasOptions = parsed.options.some((opt) => opt.trim().length > 0);

    if (!hasQuestion && !hasOptions) {
      setQuestionImportFeedback((prev) => ({
        ...prev,
        [index]: {
          type: 'error',
          message: 'Could not parse text. Use one question line and option lines (A/B/C/D or 1/2/3/4).'
        }
      }));
      return;
    }

    setQuizQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const nextOptions = hasOptions ? parsed.options : item.options;
        const nextCorrectOptionIndex = parsed.correctOptionIndex >= 0
          ? parsed.correctOptionIndex
          : (typeof item.correctOptionIndex === 'number' ? item.correctOptionIndex : -1);
        const nextCorrectAnswer = nextCorrectOptionIndex >= 0
          ? (nextOptions[nextCorrectOptionIndex] || '')
          : '';

        return {
          ...item,
          type: 'mcq',
          question: hasQuestion ? parsed.question : item.question,
          options: nextOptions,
          correctOptionIndex: nextCorrectOptionIndex,
          correctAnswer: nextCorrectAnswer
        };
      })
    );

    setQuestionPasteInputs((prev) => ({ ...prev, [index]: '' }));
    setQuestionImportFeedback((prev) => ({
      ...prev,
      [index]: {
        type: parsed.correctOptionIndex >= 0
          ? 'success'
          : 'error',
        message: parsed.correctOptionIndex >= 0
          ? 'Auto-fill complete. Question, options, and correct option were set.'
          : 'Question/options imported. Set the correct option manually below.'
      }
    }));
  };

  const autoScheduleInterviews = async () => {
    if (!selectedExamId) {
      alert('Save or select an interview final exam first.');
      return;
    }

    const now = new Date();
    const defaultStartDate = now.toISOString().slice(0, 10);
    const payload = {
      start_date: interviewScheduleWindow.start_date || defaultStartDate,
      end_date: interviewScheduleWindow.end_date || interviewScheduleWindow.start_date || defaultStartDate,
      daily_start_time: interviewScheduleWindow.daily_start_time,
      daily_end_time: interviewScheduleWindow.daily_end_time,
      slot_duration_minutes: interviewConfig.slot_duration_minutes,
      break_minutes: Number(interviewScheduleWindow.break_minutes) || 0,
      max_students_per_day: interviewConfig.max_students_per_day,
      allow_multi_day: interviewConfig.allow_multi_day,
      auto_assign_co_teachers: interviewConfig.auto_assign_co_teachers,
      meeting_link: interviewScheduleWindow.meeting_link || null
    };

    try {
      setAutoscheduling(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/final-exams/${selectedExamId}/interviews/auto-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to auto-schedule interviews');
      }

      await fetchInterviewSchedule(selectedExamId);
      alert(`Interview schedule created for ${data.created_count || 0} students.`);
    } catch (error: any) {
      console.error('Error auto-scheduling interviews:', error);
      alert(error.message || 'Failed to auto-schedule interviews');
    } finally {
      setAutoscheduling(false);
    }
  };

  const updateInterviewScheduleItem = async (interviewId: string, overrideEdit?: any) => {
    if (!selectedExamId || !interviewId || !userId) return;

    const edit = overrideEdit || interviewEdits[interviewId] || {};

    try {
      setUpdatingInterviewId(interviewId);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/final-exams/${selectedExamId}/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduled_date: edit.scheduled_date ? new Date(edit.scheduled_date).toISOString() : null,
          duration_minutes: Number(edit.duration_minutes) || 15,
          meeting_link: edit.meeting_link || null,
          status: edit.status || 'scheduled',
          assigned_interviewer_id: edit.assigned_interviewer_id || null
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update interview');
      }

      await fetchInterviewSchedule(selectedExamId);
      alert('Interview schedule updated successfully.');
    } catch (error: any) {
      console.error('Error updating interview:', error);
      alert(error.message || 'Failed to update interview');
    } finally {
      setUpdatingInterviewId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Prominent status banner — shows current draft/published state for the
          exam being edited (if any) so teachers know the workflow state at a glance. */}
      {selectedExamId && (
        <div
          className={`rounded-lg border px-5 py-4 flex items-center justify-between ${
            form.is_published
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                form.is_published
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {form.is_published ? 'Published' : 'Draft'}
            </span>
            <span className={`text-sm ${form.is_published ? 'text-emerald-800' : 'text-amber-800'}`}>
              {form.is_published
                ? 'Students can see and submit this exam.'
                : 'Saved as draft. Students will not see this exam until you publish it.'}
            </span>
          </div>
          {form.is_published && (
            <button
              onClick={() =>
                setForm((prev: any) => ({ ...prev, is_published: false }))
              }
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              Mark as draft
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Final Exam Module</h3>
            <p className="text-sm text-gray-500 mt-1">Create end-of-course final exams outside weekly modules.</p>
          </div>
        </div>

        {finalExams.length > 0 ? (
          <div className="space-y-2 mb-5">
            {finalExams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => loadExamIntoForm(exam)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                  selectedExamId === exam.id
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {exam.title} · {String(exam.exam_type || '').toUpperCase()} · {exam.is_published ? 'Published' : 'Draft'}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-5">No final exams yet. Create your first final exam.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="Final Exam - Quran Recitation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exam Mode</label>
            <select
              value={form.exam_type}
              onChange={(e) => setForm((prev) => ({ ...prev, exam_type: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="quiz">Quiz Based</option>
              <option value="interview">Interview Based</option>
              <option value="document">Document Submission</option>
              <option value="project">Project Based</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
            <input
              type="number"
              value={form.points}
              onChange={(e) => setForm((prev) => ({ ...prev, points: Number(e.target.value) || 100 }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              rows={4}
              placeholder="General instructions for students"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Publish Time (optional)</label>
            <input
              type="datetime-local"
              value={form.publish_at}
              onChange={(e) => setForm((prev) => ({ ...prev, publish_at: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Stored for scheduling workflow; auto-publish worker can use this later.</p>
          </div>
        </div>
      </div>

      {form.exam_type === 'quiz' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Quiz Questions</h4>
          </div>

          {/* Bulk import: paste many MCQs at once */}
          <div className="mb-5 rounded-lg border border-purple-200 bg-purple-50/40 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h5 className="text-sm font-semibold text-purple-900">Bulk import questions</h5>
                <p className="text-xs text-purple-700 mt-0.5">
                  Paste an entire document. Separate questions with a blank line or an{' '}
                  <code className="bg-white px-1 rounded">Answer:</code> line. Each block needs option lines starting with{' '}
                  <code className="bg-white px-1 rounded">A) B) C) D)</code> or <code className="bg-white px-1 rounded">1) 2) 3) 4)</code>.
                </p>
              </div>
            </div>
            <textarea
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              placeholder={
                'What is the meaning of Idgham?\nA) Hiding a sound\nB) Merging one letter into another\nC) Changing a letter\nD) Stopping the recitation\nAnswer: B\n\nHow many letters are there in Idgham?\nA) 4\nB) 5\nC) 6\nD) 7\nAnswer: C'
              }
              rows={8}
              className="w-full px-3 py-2 border border-purple-200 rounded text-sm bg-white font-mono"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-[11px] min-h-[18px]">
                {bulkImportFeedback && (
                  <span className={bulkImportFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}>
                    {bulkImportFeedback.message}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => applyBulkImport('append')}
                  disabled={!bulkImportText.trim()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  Append to list
                </button>
                <button
                  onClick={() => applyBulkImport('replace')}
                  disabled={!bulkImportText.trim()}
                  className="px-3 py-1.5 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  Replace all
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {quizQuestions.map((q, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gradient-to-b from-gray-50/70 to-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500">Question {idx + 1}</p>
                  <button onClick={() => removeQuestion(idx)} className="text-xs text-red-600 hover:text-red-700">Remove</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Question text *</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                      placeholder="Type one complete question here (or use auto-fill below)."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Question type</label>
                    <select
                      value={q.type || 'mcq'}
                      onChange={(e) => {
                        const newType = e.target.value === 'fill' ? 'fill' : 'mcq';
                        if (newType === 'fill') {
                          updateQuestion(idx, 'type', 'fill');
                          updateQuestion(idx, 'correctOptionIndex', -1);
                          updateQuestion(idx, 'correctAnswer', '');
                        } else {
                          const selectedIndex = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : -1;
                          const selectedAnswer = selectedIndex >= 0 ? (q.options?.[selectedIndex] || '') : '';
                          setQuizQuestions((prev) =>
                            prev.map((item, i) =>
                              i !== idx
                                ? item
                                : {
                                    ...item,
                                    type: 'mcq' as const,
                                    correctOptionIndex: selectedIndex,
                                    correctAnswer: selectedAnswer
                                  }
                            )
                          );
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="fill">Fill in the blank</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                  <label className="block text-xs font-semibold text-blue-800 mb-1">Quick import (paste question + options)</label>
                  <textarea
                    value={questionPasteInputs[idx] || ''}
                    onChange={(e) => setQuestionPasteInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder={"Example:\nQuestion: What is Tajweed?\nA) Science of Quran recitation\nB) Type of prayer\nC) Arabic alphabet\nD) Translation\nAnswer: A\n\nOr:\n1) ...\n2) ...\n3) ...\n4) ...\nAnswer: 3"}
                    className="w-full px-3 py-2 border border-blue-200 rounded text-sm bg-white"
                    rows={6}
                  />
                  <p className="text-[11px] text-blue-700 mt-1">Step 1: Paste content. Step 2: Click auto-fill. Step 3: Review and edit fields below if needed.</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-gray-600 min-h-[18px]">
                      {questionImportFeedback[idx] && (
                        <span className={questionImportFeedback[idx].type === 'success' ? 'text-emerald-700' : 'text-rose-700'}>
                          {questionImportFeedback[idx].message}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => applyPastedQuestion(idx)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                    >
                      Auto-fill from pasted content
                    </button>
                  </div>
                </div>

                {(q.type || 'mcq') === 'mcq' ? (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Options *</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="border border-gray-200 rounded-lg bg-white p-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-semibold text-gray-500">Option {oIdx + 1}</span>
                            <label className="inline-flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                name={`correct-option-${idx}`}
                                checked={(typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : -1) === oIdx}
                                onChange={() => {
                                  const selectedAnswer = q.options?.[oIdx] || '';
                                  setQuizQuestions((prev) =>
                                    prev.map((item, i) =>
                                      i !== idx
                                        ? item
                                        : {
                                            ...item,
                                            correctOptionIndex: oIdx,
                                            correctAnswer: selectedAnswer
                                          }
                                    )
                                  );
                                }}
                              />
                              Correct
                            </label>
                          </div>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...q.options];
                              newOptions[oIdx] = e.target.value;
                              const selectedIndex = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : -1;
                              const selectedAnswer = selectedIndex >= 0 ? (newOptions[selectedIndex] || '') : '';

                              setQuizQuestions((prev) =>
                                prev.map((item, i) =>
                                  i !== idx
                                    ? item
                                    : {
                                        ...item,
                                        options: newOptions,
                                        correctAnswer: selectedAnswer
                                      }
                                )
                              );
                            }}
                            placeholder={`Option ${oIdx + 1}`}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Correct option *</label>
                        <div className="px-3 py-2 border border-gray-200 rounded text-sm bg-white min-h-[40px] flex items-center">
                          {(typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : -1) >= 0
                            ? `Option ${(q.correctOptionIndex || 0) + 1}: ${q.options?.[q.correctOptionIndex || 0] || ''}`
                            : 'No correct option selected yet'}
                        </div>
                      </div>
                      <div className="px-3 py-2 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600 flex items-center">
                        Choose the correct option once. Students will only see options, not the correct answer.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Correct answer *</label>
                      <input
                        type="text"
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(idx, 'correctAnswer', e.target.value)}
                        placeholder="Expected answer for fill-in-the-blank"
                        className="px-3 py-2 border border-gray-300 rounded text-sm w-full"
                      />
                    </div>
                    <div className="px-3 py-2 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600 flex items-center">
                      Teacher writes the expected answer for fill questions.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <input
                    type="number"
                    value={q.marks}
                    onChange={(e) => updateQuestion(idx, 'marks', Number(e.target.value) || 1)}
                    placeholder="Marks"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={addQuizQuestion}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs"
                  >
                    + Add Question Below
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {form.exam_type === 'interview' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Interview Scheduling Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <input
                type="text"
                value={interviewConfig.timezone}
                onChange={(e) => setInterviewConfig((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slot Duration (minutes)</label>
              <input
                type="number"
                value={interviewConfig.slot_duration_minutes}
                onChange={(e) => setInterviewConfig((prev) => ({ ...prev, slot_duration_minutes: Number(e.target.value) || 15 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Students Per Day</label>
              <input
                type="number"
                value={interviewConfig.max_students_per_day}
                onChange={(e) => setInterviewConfig((prev) => ({ ...prev, max_students_per_day: Number(e.target.value) || 30 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2 mt-7">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={interviewConfig.allow_multi_day}
                  onChange={(e) => setInterviewConfig((prev) => ({ ...prev, allow_multi_day: e.target.checked }))}
                />
                Allow multiple days auto-scheduling
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={interviewConfig.auto_assign_co_teachers}
                  onChange={(e) => setInterviewConfig((prev) => ({ ...prev, auto_assign_co_teachers: e.target.checked }))}
                />
                Auto-assign co-teachers
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scheduling Start Date</label>
              <input
                type="date"
                value={interviewScheduleWindow.start_date}
                onChange={(e) => setInterviewScheduleWindow((prev) => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scheduling End Date</label>
              <input
                type="date"
                value={interviewScheduleWindow.end_date}
                onChange={(e) => setInterviewScheduleWindow((prev) => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daily Start Time</label>
              <input
                type="time"
                value={interviewScheduleWindow.daily_start_time}
                onChange={(e) => setInterviewScheduleWindow((prev) => ({ ...prev, daily_start_time: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daily End Time</label>
              <input
                type="time"
                value={interviewScheduleWindow.daily_end_time}
                onChange={(e) => setInterviewScheduleWindow((prev) => ({ ...prev, daily_end_time: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Break Between Slots (minutes)</label>
              <input
                type="number"
                min={0}
                value={interviewScheduleWindow.break_minutes}
                onChange={(e) => setInterviewScheduleWindow((prev) => ({ ...prev, break_minutes: Number(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link (optional)</label>
              <input
                type="url"
                value={interviewScheduleWindow.meeting_link}
                onChange={(e) => setInterviewScheduleWindow((prev) => ({ ...prev, meeting_link: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={autoScheduleInterviews}
              disabled={autoscheduling || !selectedExamId}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {autoscheduling ? 'Scheduling Interviews...' : 'Auto-Schedule Interviews'}
            </button>
            <span className="text-xs text-gray-500">Create interview slots for enrolled students using your settings above.</span>
          </div>

          <div className="mt-6">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">Scheduled Interviews</h5>
            {interviewsLoading ? (
              <div className="text-sm text-gray-500">Loading interview schedule...</div>
            ) : interviews.length === 0 ? (
              <div className="text-sm text-gray-500">No interviews scheduled yet.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {interviews.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-gray-800">{item.student_name || 'Student'}</div>
                        {(() => {
                          const currentStatus = String(interviewEdits[item.id]?.status || item.status || 'scheduled').toLowerCase();
                          const statusStyles: Record<string, string> = {
                            scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
                            completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            cancelled: 'bg-red-100 text-red-700 border-red-200',
                            no_show: 'bg-amber-100 text-amber-700 border-amber-200'
                          };
                          const label = currentStatus === 'no_show'
                            ? 'No Show'
                            : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
                          return (
                            <span className={`px-2 py-1 rounded-full text-[11px] font-medium border ${statusStyles[currentStatus] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">{item.student_email || ''}</div>
                      {(() => {
                        const selectedInterviewerId = interviewEdits[item.id]?.assigned_interviewer_id || item?.assignment_meta?.assigned_interviewer_id;
                        const selectedInterviewer = interviewerOptions.find((teacher) => teacher.id === selectedInterviewerId);
                        if (!selectedInterviewer) return null;
                        return (
                          <span className="inline-block mt-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                            Assigned: {selectedInterviewer.full_name}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Scheduled Date & Time</label>
                        <input
                          type="datetime-local"
                          value={interviewEdits[item.id]?.scheduled_date || ''}
                          onChange={(e) =>
                            setInterviewEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] || {}), scheduled_date: e.target.value }
                            }))
                          }
                          className="w-full px-2.5 py-2 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Duration (minutes)</label>
                        <input
                          type="number"
                          min={1}
                          value={interviewEdits[item.id]?.duration_minutes ?? 15}
                          onChange={(e) =>
                            setInterviewEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] || {}), duration_minutes: Number(e.target.value) || 15 }
                            }))
                          }
                          className="w-full px-2.5 py-2 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Meeting Link</label>
                        <input
                          type="url"
                          value={interviewEdits[item.id]?.meeting_link || ''}
                          onChange={(e) =>
                            setInterviewEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] || {}), meeting_link: e.target.value }
                            }))
                          }
                          className="w-full px-2.5 py-2 border border-gray-300 rounded text-xs"
                          placeholder="https://meet.google.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Status</label>
                        <select
                          value={interviewEdits[item.id]?.status || 'scheduled'}
                          onChange={(e) =>
                            setInterviewEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] || {}), status: e.target.value }
                            }))
                          }
                          className="w-full px-2.5 py-2 border border-gray-300 rounded text-xs"
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no_show">No Show</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Assigned Interviewer</label>
                      <select
                        value={interviewEdits[item.id]?.assigned_interviewer_id || ''}
                        onChange={(e) =>
                          setInterviewEdits((prev) => ({
                            ...prev,
                            [item.id]: { ...(prev[item.id] || {}), assigned_interviewer_id: e.target.value }
                          }))
                        }
                        className="w-full px-2.5 py-2 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Unassigned</option>
                        {interviewerOptions.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.full_name}{teacher.email ? ` (${teacher.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => updateInterviewScheduleItem(item.id)}
                        disabled={updatingInterviewId === item.id}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50"
                      >
                        {updatingInterviewId === item.id ? 'Updating...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          const nextEdit = { ...(interviewEdits[item.id] || {}), status: 'completed' };
                          setInterviewEdits((prev) => ({
                            ...prev,
                            [item.id]: nextEdit
                          }));
                          updateInterviewScheduleItem(item.id, nextEdit);
                        }}
                        disabled={updatingInterviewId === item.id}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => {
                          const nextEdit = { ...(interviewEdits[item.id] || {}), status: 'cancelled' };
                          setInterviewEdits((prev) => ({
                            ...prev,
                            [item.id]: nextEdit
                          }));
                          updateInterviewScheduleItem(item.id, nextEdit);
                        }}
                        disabled={updatingInterviewId === item.id}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium disabled:opacity-50"
                      >
                        Cancel Interview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-gradient-to-t from-white to-white/70 backdrop-blur p-4 rounded-lg border border-gray-200">
        <div className="flex-1 min-w-[200px] text-xs text-gray-600">
          {form.is_published ? (
            <span className="font-medium text-emerald-700">
              ✓ Published — students can see this exam
            </span>
          ) : (
            <span className="font-medium text-amber-700">
              ✎ Draft — only you can see this exam
            </span>
          )}
        </div>
        <button
          onClick={() => saveExam(false)}
          disabled={saving}
          className="px-4 py-2.5 bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => saveExam(true)}
          disabled={saving}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
        >
          {saving ? 'Publishing...' : 'Publish Exam'}
        </button>
      </div>
    </div>
  );
}

// About Course Tab Component
function AboutCourseTab({ course, setCourse, setHasUnsavedChanges, availableCourses }: any) {
  const updateCourse = (field: string, value: any) => {
    setCourse((prev: any) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const togglePrerequisiteCourse = (courseId: string) => {
    const current = course?.prerequisite_courses || [];
    const updated = current.includes(courseId)
      ? current.filter((id: string) => id !== courseId)
      : [...current, courseId];
    updateCourse('prerequisite_courses', updated);
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">Course Information</h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Image</label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      updateCourse('image_url', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
              {course?.image_url && (
                <div className="relative">
                  <img 
                    src={course.image_url} 
                    alt="Course" 
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => updateCourse('image_url', '')}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">Upload an image for the course (max 5MB, JPG/PNG)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
            <input
              type="text"
              value={course?.title || ''}
              onChange={(e) => updateCourse('title', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="e.g., Quran Tajweed Mastery"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short Description (1-2 lines) *</label>
            <textarea
              value={course?.short_description || ''}
              onChange={(e) => updateCourse('short_description', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="A compelling hook to attract students (1-2 sentences max)"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">Brief hook that appears in course cards and hero sections</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Basic Description *</label>
            <textarea
              value={course?.description || ''}
              onChange={(e) => updateCourse('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="Basic course description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Long Description (Markdown) *</label>
            <textarea
              value={course?.long_description || ''}
              onChange={(e) => updateCourse('long_description', e.target.value)}
              rows={10}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-mono"
              placeholder="# About This Course&#10;&#10;Enter a detailed course description using **Markdown** formatting.&#10;&#10;## What You'll Learn&#10;- Point 1&#10;- Point 2&#10;&#10;You can use:&#10;- **Bold text**&#10;- *Italic text*&#10;- Lists&#10;- Links&#10;- Code blocks"
            />
            <p className="text-xs text-gray-500 mt-1">Full course description with rich Markdown formatting (# headers, **bold**, - lists, etc.)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags (SEO & Discoverability) *</label>
            <input
              type="text"
              value={Array.isArray(course?.tags) ? course.tags.join(', ') : (course?.tags || '')}
              onChange={(e) => {
                const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                updateCourse('tags', tagsArray);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              placeholder="e.g., Quran, Tajweed, Arabic, Islamic Studies, Beginner"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated tags for searchability (e.g., "Quran, Tajweed, Arabic")</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail Image (Course Card)</label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      updateCourse('thumbnail_image', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
              {course?.thumbnail_image && (
                <div className="relative">
                  <img 
                    src={course.thumbnail_image} 
                    alt="Thumbnail" 
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => updateCourse('thumbnail_image', '')}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">Professional thumbnail for course cards (16:9 aspect ratio recommended)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus (Student-Visible)</label>
            <textarea
              value={course?.syllabus || ''}
              onChange={(e) => updateCourse('syllabus', e.target.value)}
              rows={8}
              placeholder="Enter detailed syllabus, schedule, or course outline that students will see before enrolling..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Level (Optional)</label>
              <select
                value={course?.level || ''}
                onChange={(e) => updateCourse('level', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              >
                <option value="">Not Specified</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course Languages (Select all that apply)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {['English', 'Tamil', 'Arabic', 'Urdu', 'Hindi', 'Malayalam', 'Bengali'].map((lang) => {
                  const currentLangs = course?.course_languages || course?.course_language ? 
                    (Array.isArray(course.course_languages) ? course.course_languages : 
                     course.course_language ? [course.course_language] : ['English']) 
                    : ['English'];
                  return (
                    <label key={lang} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={currentLangs.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateCourse('course_languages', [...currentLangs, lang]);
                          } else {
                            updateCourse('course_languages', currentLangs.filter(l => l !== lang));
                          }
                        }}
                        className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                      />
                      <span className="text-sm text-gray-700">{lang}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Capacity</label>
            <input
              type="number"
              value={course?.enrollment_cap || ''}
              onChange={(e) => updateCourse('enrollment_cap', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Max students (optional)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisite Courses</label>
            <p className="text-xs text-gray-500 mb-2">Students must complete these courses before enrolling</p>
            {availableCourses && availableCourses.length > 0 ? (
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                {availableCourses.map((prereqCourse: Course) => (
                  <label key={prereqCourse.id} className="flex items-center py-2 hover:bg-gray-50 px-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(course?.prerequisite_courses || []).includes(prereqCourse.id)}
                      onChange={() => togglePrerequisiteCourse(prereqCourse.id)}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="ml-3 text-sm text-gray-700">{prereqCourse.title}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No other published courses available as prerequisites</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites (Text - Optional)</label>
            <input
              type="text"
              value={typeof course?.prerequisites === 'string' ? course.prerequisites : (Array.isArray(course?.prerequisites) ? course.prerequisites.join(', ') : '')}
              onChange={(e) => updateCourse('prerequisites', e.target.value)}
              placeholder="e.g., Basic Arabic knowledge, Ability to read Quran"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>

          {/* NEW PROFESSIONAL FIELDS */}
          <div className="border-t-2 border-emerald-200 pt-5 mt-5">
            <h4 className="text-lg font-semibold text-emerald-800 mb-4">📚 Professional Course Details</h4>
            
            <div className="space-y-5">
              {/* Learning Outcomes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Learning Outcomes *</label>
                <textarea
                  value={course?.learning_outcomes || ''}
                  onChange={(e) => updateCourse('learning_outcomes', e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="Enter each learning outcome on a new line:&#10;Master Tajweed rules for proper Quran recitation&#10;Understand the meanings of common Quranic verses&#10;Apply proper pronunciation of Arabic letters"
                />
                <p className="text-xs text-gray-500 mt-1">List what students will be able to do after completing this course (one per line)</p>
              </div>

              {/* Skills Gained */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills Gained *</label>
                <input
                  type="text"
                  value={course?.skills_gained || ''}
                  onChange={(e) => updateCourse('skills_gained', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="e.g., Tajweed, Quranic Arabic, Recitation, Memorization"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list of skills students will gain</p>
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (in weeks) *</label>
                <input
                  type="number"
                  value={course?.estimated_hours || ''}
                  onChange={(e) => updateCourse('estimated_hours', e.target.value ? parseInt(e.target.value) : null)}
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="e.g., 8"
                />
                <p className="text-xs text-gray-500 mt-1">Number of weeks students should expect to complete this course</p>
                <p className="text-xs text-gray-500 mt-1">Total hours students should expect to spend on this course</p>
              </div>

              {/* Course Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Type *</label>
                <select
                  value={course?.course_type || 'pre-recorded'}
                  onChange={(e) => updateCourse('course_type', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                >
                  <option value="pre-recorded">Pre-Recorded Videos</option>
                  <option value="live">Live Sessions Only</option>
                  <option value="hybrid">Hybrid (Pre-recorded + Live)</option>
                </select>
              </div>

              {/* Start Date (for live/hybrid) */}
              {(course?.course_type === 'live' || course?.course_type === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Start Date</label>
                  <input
                    type="datetime-local"
                    value={utcToLocal(course?.starts_at)}
                    onChange={(e) => updateCourse('starts_at', e.target.value ? localToUTC(e.target.value) : null)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">When will this course begin? (for live/hybrid courses)</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructor Information */}
          <div className="border-t-2 border-emerald-200 pt-5 mt-5">
            <h4 className="text-lg font-semibold text-emerald-800 mb-4">👨‍🏫 Instructor Information</h4>
            
            <div className="space-y-5">
              {/* Teacher Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Title/Credentials *</label>
                <input
                  type="text"
                  value={course?.teacher_title || ''}
                  onChange={(e) => updateCourse('teacher_title', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="e.g., Ph.D., Professor of Islamic Studies"
                />
                <p className="text-xs text-gray-500 mt-1">Your academic qualifications and title</p>
              </div>

              {/* Teacher Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructor Bio (Optional)</label>
                <textarea
                  value={course?.teacher_bio || ''}
                  onChange={(e) => updateCourse('teacher_bio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="Brief introduction about yourself, your expertise, and teaching experience..."
                />
                <p className="text-xs text-gray-500 mt-1">This will be displayed on the course overview page</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5 mt-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Course Instructors</h4>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">Lead Teacher</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold">
                  T
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{course?.teacher_name || 'You'}</p>
                  <p className="text-xs text-gray-500">Primary Instructor</p>
                </div>
              </div>
            </div>

            {/* Display existing co-teachers from database */}
            {course?.co_teachers && Array.isArray(course.co_teachers) && course.co_teachers.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Co-Teachers</label>
                <div className="space-y-2">
                  {course.co_teachers.map((coTeacher: any, index: number) => (
                    <div key={coTeacher.id || coTeacher.email || `co-teacher-${index}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {coTeacher.name ? coTeacher.name.charAt(0).toUpperCase() : 'CT'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{coTeacher.name || 'Co-Teacher'}</p>
                        <p className="text-xs text-gray-500">{coTeacher.email}</p>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{coTeacher.role || 'co-teacher'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COURSERA-STYLE FIELDS */}
          <div className="border-t-2 border-blue-200 pt-5 mt-5">
            <h4 className="text-lg font-semibold text-blue-800 mb-4">📅 Course Format & Schedule</h4>
            
            <div className="space-y-5">
              {/* Course Format Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How This Course Works (Optional)</label>
                <textarea
                  value={course?.course_format_description || ''}
                  onChange={(e) => updateCourse('course_format_description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="Describe the course structure and learning format. Leave empty to use default based on course type."
                />
                <p className="text-xs text-gray-500 mt-1">Custom description of how your course works (overrides default)</p>
              </div>

              {/* Mentoring Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mentoring & Support (Optional)</label>
                <textarea
                  value={course?.mentoring_text || ''}
                  onChange={(e) => updateCourse('mentoring_text', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  placeholder="e.g., Weekly doubt solving, extra classes if needed, direct instructor support via Discord"
                />
                <p className="text-xs text-gray-500 mt-1">Describe mentoring and support students will receive</p>
              </div>

              {/* Schedule Fields (for live/hybrid courses) */}
              {(course?.course_type === 'live' || course?.course_type === 'hybrid') && (
                <>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Class Frequency</label>
                      <select
                        value={course?.schedule_frequency || ''}
                        onChange={(e) => updateCourse('schedule_frequency', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      >
                        <option value="">Not specified</option>
                        <option value="daily">Daily</option>
                        <option value="twice-weekly">Twice Weekly</option>
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select
                        value={course?.schedule_timezone || 'UTC'}
                        onChange={(e) => updateCourse('schedule_timezone', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">EST (New York)</option>
                        <option value="America/Chicago">CST (Chicago)</option>
                        <option value="America/Los_Angeles">PST (Los Angeles)</option>
                        <option value="Europe/London">GMT (London)</option>
                        <option value="Asia/Dubai">GST (Dubai)</option>
                        <option value="Asia/Kolkata">IST (India)</option>
                        <option value="Asia/Singapore">SGT (Singapore)</option>
                        <option value="Australia/Sydney">AEDT (Sydney)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Deadline</label>
                    <input
                      type="datetime-local"
                      value={utcToLocal(course?.enrollment_deadline)}
                      onChange={(e) => {
                        const enrollmentDate = e.target.value ? localToUTC(e.target.value) : null;
                        // Validate: enrollment deadline should be before course start
                        if (enrollmentDate && course?.starts_at) {
                          const startDate = new Date(course.starts_at);
                          const deadlineDate = new Date(enrollmentDate);
                          if (deadlineDate >= startDate) {
                            alert('Enrollment deadline must be before the course start date');
                            return;
                          }
                        }
                        updateCourse('enrollment_deadline', enrollmentDate);
                      }}
                      max={course?.starts_at ? utcToLocal(course.starts_at) : undefined}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Last date for students to enroll (must be before course start)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content Tab Component
function ContentTab({ weeks, setWeeks, courseId, userId, setHasUnsavedChanges }: any) {
  const fetch = useBuilderApiFetch();

  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingWeekModal, setEditingWeekModal] = useState<Week | null>(null);

  const addWeek = async () => {
    const newWeek = {
      week_number: weeks.length + 1,
      title: `Week ${weeks.length + 1}`,
      description: '',
      course_id: courseId,
      is_published: false
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/weeks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWeek)
      });

      if (res.ok) {
        const data = await res.json();
        // Handle both {week: ...} and {...} response formats
        const weekData = data.week || data;
        setWeeks([...weeks, { ...weekData, isExpanded: true, lessons: [], is_published: false }]);
        setHasUnsavedChanges(true);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to add week' }));
        console.error('Error response:', errorData);
        alert(`Failed to add week: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding week:', error);
      alert('Failed to add week. Please try again.');
    }
  };

  const updateWeekTitle = (weekId: string, title: string) => {
    setWeeks(weeks.map((w: Week) => w.id === weekId ? { ...w, title } : w));
    setHasUnsavedChanges(true);
  };

  const toggleWeek = (weekIndex: number) => {
    setWeeks(weeks.map((w: Week, i: number) => 
      i === weekIndex ? { ...w, isExpanded: !w.isExpanded } : w
    ));
  };

  const addLesson = (weekId: string, weekIndex: number, type: 'video' | 'quiz' | 'assignment' | 'resource') => {
    const newLesson = {
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content_type: type,
      content_url: '',
      language: type === 'video' ? 'English' : undefined,
      order_index: weeks[weekIndex].lessons?.length || 0,
      week_id: weekId
    };
    setEditingLesson({ ...newLesson, weekId, weekIndex, isNew: true });
  };

  const saveLesson = async () => {
    if (!editingLesson) return;

    try {
      // Ensure content_type and title are preserved - filter out UI-only fields
      const { weekId, weekIndex, isNew: isNewLesson, ...lessonFields } = editingLesson;
      const isNew = isNewLesson || !editingLesson.id;
      
      const endpoint = isNew 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/weeks/${editingLesson.weekId}/lessons`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/lessons/${editingLesson.id}`;
      
      const method = isNew ? 'POST' : 'PUT';
      
      const lessonData = {
        ...lessonFields,
        title: lessonFields.title || `New ${lessonFields.content_type}`,
        content_type: lessonFields.content_type || 'resource',
        content_url: lessonFields.content_url || '',
        quiz_questions: lessonFields.quiz_questions || null,
        video_urls: lessonFields.video_urls || null,
        assignment_details: lessonFields.assignment_details || null
      };
      
      console.log('💾 Saving lesson with quiz/video data:', lessonData);
      
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lessonData)
      });

      if (res.ok) {
        const data = await res.json();
        const updatedWeeks = [...weeks];
        if (!updatedWeeks[editingLesson.weekIndex].lessons) {
          updatedWeeks[editingLesson.weekIndex].lessons = [];
        }
        
        if (isNew) {
          updatedWeeks[editingLesson.weekIndex].lessons.push(data.lesson);
        } else {
          // Update existing lesson
          const lessonIdx = updatedWeeks[editingLesson.weekIndex].lessons.findIndex(
            (l: Lesson) => l.id === editingLesson.id
          );
          if (lessonIdx !== -1) {
            updatedWeeks[editingLesson.weekIndex].lessons[lessonIdx] = data.lesson;
          }
        }
        
        setWeeks(updatedWeeks);
        setEditingLesson(null);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
    }
  };

  const deleteWeek = async (weekId: string, weekIndex: number) => {
    if (!weekId) {
      alert('Week ID is missing');
      return;
    }
    if (!confirm('Delete this week and all its content?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/weeks/${weekId}`, {
        method: 'DELETE',
        headers: {}
      });

      if (res.ok) {
        setWeeks(weeks.filter((_: any, i: number) => i !== weekIndex));
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error deleting week:', error);
    }
  };

  const deleteLesson = async (weekIndex: number, lessonId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: {}
      });

      if (res.ok) {
        const updatedWeeks = [...weeks];
        updatedWeeks[weekIndex].lessons = updatedWeeks[weekIndex].lessons.filter((l: Lesson) => l.id !== lessonId);
        setWeeks(updatedWeeks);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'quiz': return <FileText className="w-4 h-4" />;
      case 'assignment': return <Upload className="w-4 h-4" />;
      case 'resource': return <LinkIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex justify-end items-center">
        <button
          onClick={addWeek}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Week
        </button>
      </div>

      {weeks.map((week: Week, weekIndex: number) => (
        <div key={week.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Week Header */}
          <div 
            className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200"
            onClick={() => toggleWeek(weekIndex)}
          >
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-4 h-4 text-gray-400" />
              {editingWeek === week.id ? (
                <input
                  type="text"
                  value={week.title}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateWeekTitle(week.id, e.target.value);
                  }}
                  onBlur={() => setEditingWeek(null)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md font-medium text-gray-900 text-sm"
                  autoFocus
                />
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <h3 
                    className="font-semibold text-gray-900 cursor-text text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWeek(week.id);
                    }}
                  >
                    {week.title}
                  </h3>
                  {week.isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/weeks/${week.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ is_published: !week.is_published })
                    });
                    if (res.ok) {
                      const updatedWeeks = [...weeks];
                      updatedWeeks[weekIndex].is_published = !week.is_published;
                      setWeeks(updatedWeeks);
                    }
                  } catch (error) {
                    console.error('Error toggling week publish:', error);
                  }
                }}
                className={`px-3 py-1 rounded font-medium text-xs transition-colors ${
                  week.is_published 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Click to toggle week publish status"
              >
                {week.is_published ? '✓ Published' : '○ Draft'}
              </button>
              {week.release_date && (
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(week.release_date).toLocaleDateString()}
                </span>
              )}
              <span className="text-xs text-gray-600 font-medium px-3 py-1 bg-white rounded-full border border-gray-200">
                {week.lessons?.length || 0} items
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingWeekModal(week);
                }}
                className="p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit Week Settings"
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteWeek(week.id, weekIndex);
                }}
                className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>

          {/* Lessons List */}
          {week.isExpanded && (
            <div className="p-4 space-y-2 bg-white">
              {week.lessons && week.lessons.length > 0 ? week.lessons.map((lesson: Lesson) => {
                // Debug: Log lesson content_type
                console.log('Lesson:', lesson.title, 'Type:', lesson.content_type, typeof lesson.content_type);
                return (
                <div 
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 transition-all"
                >
                  <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white ${
                    lesson.content_type === 'video' ? 'bg-purple-600' :
                    lesson.content_type === 'quiz' ? 'bg-green-600' :
                    lesson.content_type === 'assignment' ? 'bg-blue-600' :
                    'bg-orange-600'
                  }`}>
                    {getContentIcon(lesson.content_type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{lesson.title || 'Untitled'}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        lesson.content_type === 'video' ? 'bg-purple-100 text-purple-700' :
                        lesson.content_type === 'quiz' ? 'bg-green-100 text-green-700' :
                        lesson.content_type === 'assignment' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {lesson.content_type === 'video' ? '🎥 Video' :
                         lesson.content_type === 'quiz' ? '📝 Quiz' :
                         lesson.content_type === 'assignment' ? '📤 Assignment' :
                         `🔗 ${lesson.content_type || 'Resource'}`}
                      </span>
                      {(lesson.content_type === 'quiz' || lesson.content_type === 'assignment') ? (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/lessons/${lesson.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ is_published: !lesson.is_published })
                              });
                              if (res.ok) {
                                const updatedWeeks = [...weeks];
                                const lessonIdx = updatedWeeks[weekIndex].lessons.findIndex(l => l.id === lesson.id);
                                if (lessonIdx !== -1) {
                                  updatedWeeks[weekIndex].lessons[lessonIdx].is_published = !lesson.is_published;
                                  setWeeks(updatedWeeks);
                                }
                              }
                            } catch (error) {
                              console.error('Error toggling lesson publish:', error);
                            }
                          }}
                          className={`px-2 py-0.5 rounded font-medium hover:opacity-80 transition-opacity ${
                            lesson.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                          title="Click to toggle publish status"
                        >
                          {lesson.is_published ? '✓ Published' : '○ Draft'}
                        </button>
                      ) : (
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          week.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {week.is_published ? '✓ Published' : '○ Draft'}
                        </span>
                      )}
                      {lesson.release_date && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock className="w-3 h-3" />
                          {new Date(lesson.release_date).toLocaleDateString()}
                        </span>
                      )}
                      {lesson.deadline && (
                        <span className="flex items-center gap-1 text-red-600">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(lesson.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {lesson.language && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {lesson.language}
                        </span>
                      )}
                      {lesson.content_url && (
                        <a href={lesson.content_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {lesson.content_type === 'quiz' && (
                      <a
                        href={`/teacher/courses/${courseId}/quizzes/${lesson.id}`}
                        className="p-1.5 hover:bg-purple-50 rounded-md transition-colors"
                        title="View Quiz Results"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                      </a>
                    )}
                    {lesson.content_type === 'assignment' && (
                      <a
                        href={`/teacher/courses/${courseId}/assignments/${lesson.id}`}
                        className="p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Submissions"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      </a>
                    )}
                    <button 
                      onClick={() => setEditingLesson({ ...lesson, weekId: week.id, weekIndex })}
                      className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => deleteLesson(weekIndex, lesson.id)}
                      className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                </div>
              )}) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p>No lessons yet. Add your first lesson below.</p>
                </div>
              )}

              {/* Add Content Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                <button
                  key={`add-video-${week.id}`}
                  onClick={() => addLesson(week.id, weekIndex, 'video')}
                  className="flex flex-col items-center gap-1.5 p-2.5 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-md transition-all group"
                >
                  <Video className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Video</span>
                </button>
                <button
                  key={`add-quiz-${week.id}`}
                  onClick={() => addLesson(week.id, weekIndex, 'quiz')}
                  className="flex flex-col items-center gap-1.5 p-2.5 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-md transition-all group"
                >
                  <FileText className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Quiz</span>
                </button>
                <button
                  key={`add-assignment-${week.id}`}
                  onClick={() => addLesson(week.id, weekIndex, 'assignment')}
                  className="flex flex-col items-center gap-1.5 p-2.5 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-md transition-all group"
                >
                  <Upload className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Assignment</span>
                </button>
                <button
                  key={`add-resource-${week.id}`}
                  onClick={() => addLesson(week.id, weekIndex, 'resource')}
                  className="flex flex-col items-center gap-1.5 p-2.5 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-md transition-all group"
                >
                  <LinkIcon className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Resource</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {weeks.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No weeks yet</h3>
          <p className="text-gray-500 text-sm">Start building your course content</p>
        </div>
      )}

      {/* Lesson Editor Modal */}
      {editingLesson && (
        <LessonEditorModal 
          lesson={editingLesson} 
          setLesson={setEditingLesson} 
          onSave={saveLesson} 
          onClose={() => setEditingLesson(null)} 
        />
      )}

      {/* Week Editor Modal */}
      {editingWeekModal && (
        <WeekEditorModal 
          week={editingWeekModal} 
          onSave={async (updatedWeek) => {
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/weeks/${updatedWeek.id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    title: updatedWeek.title,
                    is_published: updatedWeek.is_published,
                    release_date: updatedWeek.release_date || null
                  })
                }
              );
              
              if (res.ok) {
                setWeeks(weeks.map(w => w.id === updatedWeek.id ? { ...w, ...updatedWeek } : w));
                setEditingWeekModal(null);
              }
            } catch (error) {
              console.error('Error updating week:', error);
            }
          }}
          onClose={() => setEditingWeekModal(null)} 
        />
      )}
    </div>
  );
}

// Lesson Editor Modal Component
function LessonEditorModal({ lesson, setLesson, onSave, onClose }: any) {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(lesson.quiz_questions || []);
  const [videoUrls, setVideoUrls] = useState<{language: string; url: string}[]>(
    lesson.video_urls || (lesson.content_url ? [{ language: lesson.language || 'English', url: lesson.content_url }] : [{ language: 'English', url: '' }])
  );
  const [showQuizPublishConfirm, setShowQuizPublishConfirm] = useState(false);
  const [publishConfirmText, setPublishConfirmText] = useState('');

  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, {
      id: Date.now().toString(),
      question: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      marks: 1
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...quizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...quizQuestions];
    updated[questionIndex].options = [...(updated[questionIndex].options || []), ''];
    setQuizQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...quizQuestions];
    updated[questionIndex].options = updated[questionIndex].options?.filter((_, i) => i !== optionIndex);
    setQuizQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const handleSave = (publishStatus?: boolean) => {
    // Update parent's lesson state with quiz questions or video URLs
    if (lesson.content_type === 'quiz') {
      lesson.quiz_questions = quizQuestions;
    }
    if (lesson.content_type === 'video') {
      lesson.video_urls = videoUrls;
    }
    // Set publish status if provided
    if (publishStatus !== undefined) {
      lesson.is_published = publishStatus;
    }
    onSave();
  };

  const totalMarks = quizQuestions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Edit {lesson?.content_type ? lesson.content_type.charAt(0).toUpperCase() + lesson.content_type.slice(1) : 'Lesson'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={lesson.title}
                onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                placeholder="Enter title"
              />
            </div>

            {lesson.content_type === 'video' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Video URLs (Multiple Languages)</label>
                {videoUrls.map((video, idx) => (
                  <div key={`video-${idx}-${video.language}`} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 space-y-3">
                      <select
                        value={video.language}
                        onChange={(e) => {
                          const updated = [...videoUrls];
                          updated[idx].language = e.target.value;
                          setVideoUrls(updated);
                          setLesson({ ...lesson, video_urls: updated, language: updated[0]?.language || 'English' });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={`lang-${idx}-${lang}`} value={lang}>{lang}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={video.url}
                        onChange={(e) => {
                          const updated = [...videoUrls];
                          updated[idx].url = e.target.value;
                          setVideoUrls(updated);
                          setLesson({ ...lesson, video_urls: updated, content_url: updated[0]?.url || '' });
                        }}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                      />
                    </div>
                    {videoUrls.length > 1 && (
                      <button
                        onClick={() => {
                          const updated = videoUrls.filter((_, i) => i !== idx);
                          setVideoUrls(updated);
                          setLesson({ ...lesson, video_urls: updated, content_url: updated[0]?.url || '', language: updated[0]?.language || 'English' });
                        }}
                        className="p-2 hover:bg-red-50 rounded-md transition-colors mt-1"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updated = [...videoUrls, { language: 'English', url: '' }];
                    setVideoUrls(updated);
                    setLesson({ ...lesson, video_urls: updated });
                  }}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  + Add Video in Another Language
                </button>
              </div>
            )}

            {lesson.content_type === 'assignment' && (
              <>
                {/* Assignment Settings */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    Assignment Settings
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Release Date & Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={utcToLocal(lesson.release_date)}
                        onChange={(e) => setLesson({ ...lesson, release_date: e.target.value ? localToUTC(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Assignment will be available from this time</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={utcToLocal(lesson.deadline)}
                        onChange={(e) => setLesson({ ...lesson, deadline: e.target.value ? localToUTC(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Students cannot submit after this time</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type *</label>
                  <p className="text-xs text-gray-500 mb-2">What type of submission should students upload?</p>
                  <select
                    value={lesson.assignment_type || 'document'}
                    onChange={(e) => setLesson({ ...lesson, assignment_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  >
                    <option value="document">Document (DOC, DOCX)</option>
                    <option value="pdf">PDF File</option>
                    <option value="audio">Audio Recording</option>
                    <option value="video">Video Recording</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Instructions</label>
                  <textarea
                    value={lesson.content_url || ''}
                    onChange={(e) => setLesson({ ...lesson, content_url: e.target.value })}
                    rows={5}
                    placeholder="Describe the assignment requirements..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  />
                </div>
              </>
            )}

            {lesson.content_type === 'resource' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resource/Drive Link</label>
                <input
                  type="text"
                  value={lesson.content_url || ''}
                  onChange={(e) => setLesson({ ...lesson, content_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
            )}

            {lesson.content_type === 'quiz' && (
              <div className="space-y-5">
                {/* Quiz Settings */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    Quiz Settings
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Release Date & Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={utcToLocal(lesson.release_date)}
                        onChange={(e) => setLesson({ ...lesson, release_date: e.target.value ? localToUTC(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Quiz will be available from this time (leave empty for immediate)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={utcToLocal(lesson.deadline)}
                        onChange={(e) => setLesson({ ...lesson, deadline: e.target.value ? localToUTC(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Students cannot submit after this time</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        value={lesson.time_limit_minutes || ''}
                        onChange={(e) => setLesson({ ...lesson, time_limit_minutes: parseInt(e.target.value) || null })}
                        placeholder="No limit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Attempts
                      </label>
                      <input
                        type="number"
                        value={lesson.max_attempts || ''}
                        onChange={(e) => setLesson({ ...lesson, max_attempts: parseInt(e.target.value) || null })}
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lesson.show_answers_after_deadline || false}
                        onChange={(e) => setLesson({ ...lesson, show_answers_after_deadline: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show correct answers after deadline</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lesson.show_correct_answers || false}
                        onChange={(e) => setLesson({ ...lesson, show_correct_answers: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show correct answers immediately after submission</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-900 text-base">Quiz Questions</h4>
                  <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-300">
                    <p className="text-sm font-medium text-gray-900">
                      Total: {totalMarks} marks
                    </p>
                  </div>
                </div>

                {quizQuestions.map((q, index) => (
                  <div key={q.id} className="p-5 border border-gray-200 rounded-lg space-y-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-900 text-sm">Question {index + 1}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">Marks:</label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) => updateQuestion(index, 'marks', parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="1"
                          />
                        </div>
                        <button
                          onClick={() => removeQuestion(index)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter question"
                      value={q.question}
                      onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                    />

                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium"
                    >
                      <option value="mcq">Multiple Choice</option>
                      <option value="fill">Fill in the Blank</option>
                    </select>

                    {q.type === 'mcq' && (
                      <div className="space-y-3">
                        {q.options?.map((opt, optIndex) => (
                          <div key={`option-${index}-${optIndex}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={`Option ${optIndex + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...(q.options || [])];
                                newOptions[optIndex] = e.target.value;
                                updateQuestion(index, 'options', newOptions);
                              }}
                              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                            />
                            {(q.options?.length || 0) > 2 && (
                              <button
                                onClick={() => removeOption(index, optIndex)}
                                className="p-2 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(index)}
                          className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          + Add Option
                        </button>
                      </div>
                    )}

                    {/* Correct Answer Selection */}
                    {q.type === 'mcq' && q.options && q.options.length > 0 ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-green-700 mb-2">
                          Select Correct Answer:
                        </label>
                        {q.options.map((option, optIndex) => (
                          <label
                            key={`correct-${index}-${optIndex}`}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                              q.correct_answer === option
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct-answer-${index}`}
                              checked={q.correct_answer === option}
                              onChange={() => updateQuestion(index, 'correct_answer', option)}
                              className="text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Correct answer"
                        value={q.correct_answer}
                        onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                        className="w-full px-4 py-2.5 border border-green-400 rounded-lg bg-green-50 text-sm"
                      />
                    )}

                    {/* Add Question Button after each question */}
                    <button
                      onClick={addQuestion}
                      className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                      + Add Question Below
                    </button>
                  </div>
                ))}

                {quizQuestions.length === 0 && (
                  <button
                    onClick={addQuestion}
                    className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                  >
                    + Add First Question
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {lesson.content_type === 'quiz' ? (
              <>
                <button
                  onClick={() => handleSave()}
                  className="flex-1 px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Quiz Draft
                </button>
                {lesson.is_published ? (
                  <button
                    onClick={() => handleSave(false)}
                    className="flex-1 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Unpublish Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!lesson.title || quizQuestions.length === 0) {
                        alert('Please add a title and at least one question before publishing quiz');
                        return;
                      }
                      handleSave(true);
                    }}
                    className="flex-1 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Publish Quiz
                  </button>
                )}
              </>
            ) : lesson.content_type === 'assignment' ? (
              <>
                <button
                  onClick={() => handleSave()}
                  className="flex-1 px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Assignment Draft
                </button>
                {lesson.is_published ? (
                  <button
                    onClick={() => handleSave(false)}
                    className="flex-1 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Unpublish Assignment
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!lesson.title) {
                        alert('Please add a title before publishing assignment');
                        return;
                      }
                      handleSave(true);
                    }}
                    className="flex-1 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Publish Assignment
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => handleSave()}
                className="flex-1 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save {lesson.content_type === 'video' && 'Video'}{lesson.content_type === 'resource' && 'Resource'}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Publish Confirmation Dialog */}
      {showQuizPublishConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Quiz Publication</h3>
            <p className="text-sm text-gray-700 mb-4">
              Publishing this quiz will make it available to all enrolled students. This action should be done carefully.
            </p>
            <p className="text-sm font-medium text-gray-900 mb-2">
              Type <span className="px-2 py-1 bg-gray-100 rounded font-mono text-red-600">publish</span> to confirm:
            </p>
            <input
              type="text"
              value={publishConfirmText}
              onChange={(e) => setPublishConfirmText(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Type 'publish' here"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowQuizPublishConfirm(false);
                  setPublishConfirmText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (publishConfirmText.toLowerCase() === 'publish') {
                    setShowQuizPublishConfirm(false);
                    setPublishConfirmText('');
                    // Mark quiz as published and save
                    setLesson({ ...lesson, is_published: true });
                    handleSave();
                    alert('Quiz published successfully!');
                  } else {
                    alert('Please type "publish" exactly to confirm');
                  }
                }}
                disabled={publishConfirmText.toLowerCase() !== 'publish'}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  publishConfirmText.toLowerCase() === 'publish'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Publish Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Students Tab Component with Modern List Design
function StudentsTab({ students, submissions, courseId, userId, weeks }: any) {
  const fetch = useBuilderApiFetch();

  const [searchTerm, setSearchTerm] = useState('');
  const [studentsTracking, setStudentsTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Fetch comprehensive tracking data
  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/students/tracking`);
        
        if (res.ok) {
          const data = await res.json();
          setStudentsTracking(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching tracking:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId && userId) {
      fetchTracking();
    }
  }, [courseId, userId, fetch]);

  const filteredStudents = studentsTracking.filter((student: any) =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      <IslamicCard className="p-8 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Enrolled Students
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {studentsTracking.length} student{studentsTracking.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
            />
            <Users className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50 to-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Quizzes</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Quiz Avg</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Assignments</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Assign Avg</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Attendance</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Grade</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-indigo-900">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student: any, index: number) => {
                const gradeColor = student.overall_grade >= 80 ? 'text-emerald-700 bg-emerald-100' : 
                                    student.overall_grade >= 60 ? 'text-blue-700 bg-blue-100' : 
                                    student.overall_grade >= 40 ? 'text-amber-700 bg-amber-100' : 
                                    'text-red-700 bg-red-100';
                
                return (
                  <tr 
                    key={student.student_id} 
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{student.full_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.email}</td>
                    
                    {/* Overall Progress */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                            style={{ width: `${Math.min(student.overall_progress || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{Math.round(student.overall_progress || 0)}%</span>
                      </div>
                    </td>
                    
                    {/* Quizzes */}
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-900">
                        {student.quizzes_completed || 0}/{student.total_quizzes || 0}
                      </span>
                    </td>
                    
                    {/* Quiz Average */}
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">
                        {Math.round(student.average_quiz_score || 0)}%
                      </span>
                    </td>
                    
                    {/* Assignments */}
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-900">
                        {student.assignments_completed || 0}/{student.total_assignments || 0}
                      </span>
                    </td>
                    
                    {/* Assignment Average */}
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        {Math.round(student.average_assignment_grade || 0)}%
                      </span>
                    </td>
                    
                    {/* Attendance */}
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-900">
                        {student.live_classes_attended || 0}/{student.total_live_classes || 0}
                      </span>
                    </td>
                    
                    {/* Overall Grade */}
                    <td className="px-4 py-3">
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${gradeColor}`}>
                        {Math.round(student.overall_grade || 0)}%
                      </span>
                    </td>
                    
                    {/* Certificate */}
                    <td className="px-4 py-3">
                      {student.certificate_eligible ? (
                        student.certificate_issued ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            ✓ Issued
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            ⚠ Eligible
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                          Not Yet
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-indigo-300" />
              <p className="font-medium">
                {searchTerm ? 'No students found matching your search' : 'No students enrolled yet'}
              </p>
            </div>
          )}
        </div>
      </IslamicCard>
      
      {/* Student Detail Modal with Submissions */}
      {selectedStudent && (
        <StudentDetailModal 
          student={selectedStudent} 
          courseId={courseId} 
          userId={userId} 
          weeks={weeks}
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </div>
  );
}

// Student Detail Modal with Submissions
function StudentDetailModal({ student, courseId, userId, weeks, onClose }: { student: any; courseId: string; userId: string; weeks: Week[]; onClose: () => void }) {
  const fetch = useBuilderApiFetch();

  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [gradeValue, setGradeValue] = useState(0);
  const [feedbackValue, setFeedbackValue] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'assignments' | 'quizzes'>('overview');

  useEffect(() => {
    const fetchStudentSubmissions = async () => {
      try {
        // Fetch all submissions (assignments + quizzes) then filter by this student
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/submissions`, {
          headers: {}
        });
        if (res.ok) {
          const data = await res.json();
          const allSubs = data.data || data.submissions || [];
          // Filter by student_id (clerk_user_id)
          const filtered = allSubs.filter((s: any) => s.student_id === student.student_id);

          // Keep only the latest submission per lesson (avoids counting multiple attempts as multiple quizzes/assignments)
          const byLessonKey = new Map<string, any>();
          filtered
            .sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
            .forEach((submission: any) => {
              const key = `${submission.type || 'unknown'}:${submission.lesson_id || submission.id}`;
              if (!byLessonKey.has(key)) {
                byLessonKey.set(key, submission);
              }
            });

          const latestSubmissions = Array.from(byLessonKey.values());
          const submittedLessonKeys = new Set(
            latestSubmissions.map((s: any) => `${s.type || 'unknown'}:${s.lesson_id || ''}`)
          );

          const allLessons = (weeks || []).flatMap((week: Week) =>
            (week.lessons || []).map((lesson: Lesson) => ({
              ...lesson,
              week_number: week.week_number,
              week_title: week.title
            }))
          );

          const pendingQuizzes = allLessons
            .filter((lesson: any) => lesson.content_type === 'quiz' && !submittedLessonKeys.has(`quiz:${lesson.id}`))
            .map((lesson: any) => ({
              id: `pending-quiz-${lesson.id}`,
              type: 'quiz',
              lesson_id: lesson.id,
              assignment_title: lesson.title || 'Quiz',
              student_id: student.student_id,
              status: 'pending',
              pending: true,
              submitted_at: null,
              total_points: 100,
              score: null,
              grade: null,
              week_number: lesson.week_number,
              week_title: lesson.week_title
            }));

          const pendingAssignments = allLessons
            .filter((lesson: any) => lesson.content_type === 'assignment' && !submittedLessonKeys.has(`assignment:${lesson.id}`))
            .map((lesson: any) => ({
              id: `pending-assignment-${lesson.id}`,
              type: 'assignment',
              lesson_id: lesson.id,
              assignment_title: lesson.title || 'Assignment',
              student_id: student.student_id,
              status: 'pending',
              pending: true,
              submitted_at: null,
              grade: null,
              total_points: 100,
              week_number: lesson.week_number,
              week_title: lesson.week_title,
              deadline: lesson.deadline
            }));

          setStudentSubmissions([
            ...latestSubmissions,
            ...pendingQuizzes,
            ...pendingAssignments
          ]);
        }
      } catch (error) {
        console.error('Error fetching student submissions:', error);
      } finally {
        setLoadingSubs(false);
      }
    };
    fetchStudentSubmissions();
  }, [student.student_id, courseId, userId, weeks, fetch]);

  const gradeSubmission = async () => {
    if (!gradingSubmission) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/submissions/${gradingSubmission.id}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grade: gradeValue, feedback: feedbackValue })
      });
      if (res.ok) {
        setStudentSubmissions(studentSubmissions.map((s: any) => 
          s.id === gradingSubmission.id ? { ...s, grade: gradeValue, feedback: feedbackValue, status: 'graded' } : s
        ));
        setGradingSubmission(null);
        setGradeValue(0);
        setFeedbackValue('');
        alert('Assignment graded successfully!');
      }
    } catch (error) {
      console.error('Error grading:', error);
    }
  };

  const quizSubmissions = studentSubmissions.filter((s: any) => s.type === 'quiz');
  const assignmentSubmissions = studentSubmissions.filter((s: any) => s.type === 'assignment');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-0 max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{student.full_name}</h2>
              <p className="text-indigo-200 text-sm mt-1">{student.email}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-indigo-500/40 rounded-lg p-3 text-center border border-indigo-400/50">
              <p className="text-xs text-indigo-100">Progress</p>
              <p className="text-xl font-bold">{Math.round(student.overall_progress || 0)}%</p>
            </div>
            <div className="bg-emerald-500/40 rounded-lg p-3 text-center border border-emerald-400/50">
              <p className="text-xs text-emerald-100">Overall Grade</p>
              <p className="text-xl font-bold">{Math.round(student.overall_grade || 0)}%</p>
            </div>
            <div className="bg-cyan-500/40 rounded-lg p-3 text-center border border-cyan-400/50">
              <p className="text-xs text-cyan-100">Quiz Avg</p>
              <p className="text-xl font-bold">{Math.round(student.average_quiz_score || 0)}%</p>
            </div>
            <div className="bg-orange-500/40 rounded-lg p-3 text-center border border-orange-400/50">
              <p className="text-xs text-orange-100">Assign Avg</p>
              <p className="text-xl font-bold">{Math.round(student.average_assignment_grade || 0)}%</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-slate-50 px-8">
          {(['overview', 'assignments', 'quizzes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${
                activeSubTab === tab 
                  ? 'border-indigo-600 text-indigo-700 bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'assignments' ? `📋 Assignments (${assignmentSubmissions.length})` : `📝 Quizzes (${quizSubmissions.length})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-cyan-50 p-5 rounded-xl border border-cyan-200">
                  <h3 className="font-bold text-cyan-900 mb-2">📝 Quiz Performance</h3>
                  <p className="text-sm text-cyan-700">
                    Completed: <span className="font-bold">{student.quizzes_completed || 0}/{student.total_quizzes || 0}</span>
                  </p>
                  <p className="text-sm text-cyan-700">
                    Average Score: <span className="font-bold">{Math.round(student.average_quiz_score || 0)}%</span>
                  </p>
                </div>
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
                  <h3 className="font-bold text-orange-900 mb-2">📋 Assignment Performance</h3>
                  <p className="text-sm text-orange-700">
                    Completed: <span className="font-bold">{student.assignments_completed || 0}/{student.total_assignments || 0}</span>
                  </p>
                  <p className="text-sm text-orange-700">
                    Average Grade: <span className="font-bold">{Math.round(student.average_assignment_grade || 0)}%</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200">
                  <h3 className="font-bold text-indigo-900 mb-2">📚 Lessons Progress</h3>
                  <p className="text-sm text-indigo-700">
                    Completed: <span className="font-bold">{student.lessons_completed || 0}/{student.total_lessons || 0}</span>
                  </p>
                  <div className="w-full h-3 bg-indigo-200 rounded-full mt-2">
                    <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${Math.min(student.lessons_percentage || 0, 100)}%` }} />
                  </div>
                </div>
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                  <h3 className="font-bold text-emerald-900 mb-2">🎓 Certificate</h3>
                  <p className="text-sm text-emerald-700">
                    {student.certificate_eligible 
                      ? student.certificate_issued 
                        ? '✅ Certificate has been issued' 
                        : '⚠️ Eligible - not yet issued'
                      : '❌ Not eligible yet'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'assignments' && (
            <div className="space-y-4">
              {loadingSubs ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                </div>
              ) : assignmentSubmissions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No assignment submissions yet</p>
                </div>
              ) : (
                assignmentSubmissions.map((sub: any) => (
                  <div key={sub.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-gray-900">{sub.assignment_title}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {sub.status === 'graded' ? '✓ Graded' : '⏳ Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {sub.pending
                            ? `Not submitted yet${sub.deadline ? ` • Due: ${new Date(sub.deadline).toLocaleDateString()}` : ''}`
                            : `Submitted: ${new Date(sub.submitted_at).toLocaleString()}`}
                        </p>
                        {sub.drive_link && !sub.pending && (
                          <a href={sub.drive_link} target="_blank" rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-700 text-sm inline-flex items-center gap-1 font-medium">
                            <LinkIcon className="w-4 h-4" /> View Submission
                          </a>
                        )}
                        {sub.status === 'graded' && !sub.pending && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm font-bold text-green-900">Grade: {sub.grade}/100</p>
                            {sub.feedback && <p className="text-sm text-green-700 mt-1">💬 {sub.feedback}</p>}
                          </div>
                        )}
                      </div>
                      {sub.status !== 'graded' && !sub.pending && (
                        <button
                          onClick={() => {
                            setGradingSubmission(sub);
                            setGradeValue(sub.grade || 0);
                            setFeedbackValue(sub.feedback || '');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
                        >
                          <Award className="w-4 h-4" /> Grade
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeSubTab === 'quizzes' && (
            <div className="space-y-4">
              {loadingSubs ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                </div>
              ) : quizSubmissions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No quiz submissions yet</p>
                </div>
              ) : (
                quizSubmissions.map((sub: any) => {
                  if (sub.pending) {
                    return (
                      <div key={sub.id} className="border border-amber-200 bg-amber-50 rounded-xl p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-amber-900">{sub.assignment_title}</h4>
                            <p className="text-xs text-amber-700 mt-1">Not submitted yet</p>
                          </div>
                          <span className="px-4 py-2 rounded-full text-sm font-bold bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const scorePct = sub.total_points > 0 ? Math.round((sub.score / sub.total_points) * 100) : (sub.grade || 0);
                  return (
                    <div key={sub.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">{sub.assignment_title}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {new Date(sub.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                            scorePct >= 80 ? 'bg-green-100 text-green-700' :
                            scorePct >= 60 ? 'bg-blue-100 text-blue-700' :
                            scorePct >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {sub.score}/{sub.total_points} ({scorePct}%)
                          </span>
                          <p className="text-xs text-gray-500 mt-1">Auto-graded</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Grading Modal */}
        {gradingSubmission && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm" onClick={() => setGradingSubmission(null)}>
            <div className="max-w-lg w-full bg-white rounded-xl p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-purple-900 mb-2">Grade Assignment</h3>
              <p className="text-sm text-gray-600 mb-6">
                {gradingSubmission.assignment_title} — {student.full_name}
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Grade (0-100)</label>
                  <input type="number" min="0" max="100" value={gradeValue}
                    onChange={(e) => setGradeValue(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl font-bold text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Feedback / Comment</label>
                  <textarea value={feedbackValue} onChange={(e) => setFeedbackValue(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder="Provide feedback to the student..."
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={gradeSubmission}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2">
                  <Award className="w-4 h-4" /> Submit Grade
                </button>
                <button onClick={() => setGradingSubmission(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Submissions Tab Component
function SubmissionsTab({ submissions, setSubmissions, userId, courseId, students }: any) {
  const fetch = useBuilderApiFetch();

  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});
  const [expandedAssignments, setExpandedAssignments] = useState<Record<string, boolean>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<Record<string, number>>({});
  const [feedbackValues, setFeedbackValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});

  // Fetch assignment submissions on mount
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/assignment-submissions`, {
          headers: {}
        });
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments || []);
          setSubmissions(data.submissions || []);
          // Auto-expand all weeks
          const weeks: Record<number, boolean> = {};
          (data.assignments || []).forEach((a: any) => { weeks[a.week_number] = true; });
          setExpandedWeeks(weeks);
          // Auto-expand all assignments
          const assgn: Record<string, boolean> = {};
          (data.assignments || []).forEach((a: any) => { assgn[a.lesson_id] = true; });
          setExpandedAssignments(assgn);
        }
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setLoading(false);
      }
    };
    if (courseId && userId) {
      fetchSubmissions();
    } else {
      setLoading(false);
    }
  }, [courseId, userId, fetch]);

  // Group assignments by week
  const weekMap: Record<number, { week_title: string; assignments: any[] }> = {};
  assignments.forEach((a: any) => {
    const wn = a.week_number || 0;
    if (!weekMap[wn]) {
      weekMap[wn] = { week_title: a.week_title || `Week ${wn}`, assignments: [] };
    }
    weekMap[wn].assignments.push(a);
  });
  const sortedWeeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b);

  // Get submissions for a specific assignment lesson
  const getSubsForLesson = (lessonId: string) =>
    (submissions || []).filter((s: any) => s.lesson_id === lessonId);

  const studentRoster = (students || [])
    .map((student: any) => ({
      student_id: student.student_id || student.clerk_user_id || student.id,
      student_name: student.full_name || student.name || student.email || 'Student',
      student_email: student.email || ''
    }))
    .filter((student: any) => !!student.student_id);

  const getRowsForAssignment = (assignment: any) => {
    const lessonSubs = getSubsForLesson(assignment.lesson_id);
    const submittedStudentIds = new Set((lessonSubs || []).map((s: any) => s.student_id).filter(Boolean));
    const now = new Date();
    const isDeadlineMissed = assignment.deadline ? new Date(assignment.deadline) < now : false;

    const pendingOrMissedRows = studentRoster
      .filter((student: any) => !submittedStudentIds.has(student.student_id))
      .map((student: any) => ({
        id: `missing-${assignment.lesson_id}-${student.student_id}`,
        lesson_id: assignment.lesson_id,
        student_id: student.student_id,
        student_name: student.student_name,
        student_email: student.student_email,
        assignment_title: assignment.title,
        status: isDeadlineMissed ? 'missed' : 'pending',
        is_placeholder: true,
        submitted_at: null,
        max_grade: assignment.max_grade,
        grade: null,
        feedback: null,
        file_url: null,
        link_url: null,
        text_content: null,
        submission_text: null
      }));

    return [...lessonSubs, ...pendingOrMissedRows];
  };

  const gradeSubmission = async (sub: any) => {
    const grade = gradeValues[sub.id] ?? sub.grade ?? 0;
    const feedback = feedbackValues[sub.id] ?? sub.feedback ?? '';
    setSavingId(sub.id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/submissions/${sub.id}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grade, feedback })
      });
      if (res.ok) {
        setSubmissions((prev: any[]) =>
          prev.map((s: any) => s.id === sub.id ? { ...s, grade, feedback, status: 'graded', graded_at: new Date().toISOString() } : s)
        );
        setGradingId(null);
        alert('Grade saved successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to save grade');
      }
    } catch (error) {
      console.error('Error grading submission:', error);
      alert('Error saving grade');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <ClipboardList className="w-7 h-7 text-white" />
              </div>
              Assignment Submissions
            </h3>
            <p className="text-indigo-100 mt-2 text-sm">Review, grade and provide feedback on student work</p>
          </div>
          {!loading && (
            <div className="flex gap-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/20">
                <div className="text-2xl font-extrabold text-white">{assignments.length}</div>
                <div className="text-xs text-indigo-100 font-medium">Assignment{assignments.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/20">
                <div className="text-2xl font-extrabold text-white">{(submissions || []).length}</div>
                <div className="text-xs text-indigo-100 font-medium">Submission{(submissions || []).length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/20">
                <div className="text-2xl font-extrabold text-emerald-300">
                  {(submissions || []).filter((s: any) => s.status === 'graded').length}
                </div>
                <div className="text-xs text-indigo-100 font-medium">Graded</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-24">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-purple-600 absolute inset-0"></div>
          </div>
          <p className="mt-5 text-slate-400 font-medium animate-pulse">Loading submissions...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-purple-200 bg-gradient-to-br from-white to-purple-50 p-20 text-center">
          <div className="absolute top-6 right-6 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-6 left-6 w-24 h-24 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
          <div className="relative">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <ClipboardList className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-slate-700 font-semibold text-xl">No assignments yet</p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">Create assignment lessons in your course content to start receiving student submissions</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedWeeks.map((weekNum) => {
            const week = weekMap[weekNum];
            const isWeekExpanded = expandedWeeks[weekNum] !== false;
            const weekSubmissionCount = week.assignments.reduce((sum: number, a: any) => sum + getRowsForAssignment(a).length, 0);
            const weekPendingCount = week.assignments.reduce((sum: number, a: any) =>
              sum + getRowsForAssignment(a).filter((s: any) => s.status !== 'graded').length, 0);
            const weekGradedCount = weekSubmissionCount - weekPendingCount;

            return (
              <div key={weekNum} className="group rounded-2xl overflow-hidden bg-white shadow-xl shadow-purple-100/50 border border-slate-200/80 hover:shadow-2xl hover:shadow-purple-200/40 transition-all duration-300">
                {/* Week Header */}
                <button
                  onClick={() => setExpandedWeeks(prev => ({ ...prev, [weekNum]: !isWeekExpanded }))}
                  className="w-full flex items-center justify-between px-7 py-5 bg-gradient-to-r from-slate-50 via-indigo-50/50 to-purple-50/50 hover:from-white hover:via-indigo-50 hover:to-purple-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl transition-all duration-200 ${isWeekExpanded ? 'bg-purple-600 text-white rotate-0 shadow-lg shadow-purple-200' : 'bg-purple-100 text-purple-600'}`}>
                      {isWeekExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-wider uppercase text-purple-500">Week {weekNum}</span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 mt-0.5">{week.week_title}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {weekGradedCount > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-700">{weekGradedCount} graded</span>
                      </div>
                    )}
                    {weekPendingCount > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-amber-700">{weekPendingCount} pending</span>
                      </div>
                    )}
                    <div className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">{weekSubmissionCount} total</span>
                    </div>
                  </div>
                </button>

                {/* Week Content */}
                {isWeekExpanded && (
                  <div className="border-t border-slate-100">
                    {week.assignments.map((assignment: any, aIdx: number) => {
                      const subs = getRowsForAssignment(assignment);
                      const isAssignmentExpanded = expandedAssignments[assignment.lesson_id] !== false;
                      const pendingCount = subs.filter((s: any) => s.status !== 'graded').length;
                      const gradedCount = subs.length - pendingCount;

                      return (
                        <div key={assignment.lesson_id} className={aIdx > 0 ? 'border-t border-slate-100' : ''}>
                          {/* Assignment Header */}
                          <button
                            onClick={() => setExpandedAssignments(prev => ({ ...prev, [assignment.lesson_id]: !isAssignmentExpanded }))}
                            className="w-full flex items-center justify-between px-7 py-4 hover:bg-gradient-to-r hover:from-transparent hover:to-purple-50/30 transition-all duration-200 group/item"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg transition-colors ${isAssignmentExpanded ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400 group-hover/item:bg-purple-50 group-hover/item:text-purple-500'}`}>
                                {isAssignmentExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </div>
                              <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
                                <ClipboardList className="w-4 h-4 text-white" />
                              </div>
                              <div className="text-left">
                                <span className="font-semibold text-slate-800 group-hover/item:text-purple-700 transition-colors">{assignment.title}</span>
                                {assignment.deadline && (
                                  <span className="text-xs text-slate-400 ml-3 font-medium">
                                    <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                                    Due {new Date(assignment.deadline).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 font-semibold bg-slate-50 px-2.5 py-1 rounded-md">
                                {assignment.max_grade} pts max
                              </span>
                              {subs.length > 0 ? (
                                <div className="flex items-center">
                                  {gradedCount > 0 && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-l-md border border-emerald-200">
                                      <CheckCircle className="w-3 h-3" /> {gradedCount}
                                    </span>
                                  )}
                                  {pendingCount > 0 && (
                                    <span className={`flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 border border-amber-200 ${gradedCount > 0 ? 'rounded-r-md border-l-0' : 'rounded-md'}`}>
                                      <Clock className="w-3 h-3" /> {pendingCount}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300 italic">No submissions</span>
                              )}
                            </div>
                          </button>

                          {/* Student Submissions */}
                          {isAssignmentExpanded && (
                            <div className="px-7 pb-5">
                              {subs.length === 0 ? (
                                <div className="py-10 text-center rounded-xl bg-gradient-to-br from-slate-50 to-purple-50/30 border border-dashed border-slate-200">
                                  <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-xl flex items-center justify-center">
                                    <Users className="w-6 h-6 text-slate-300" />
                                  </div>
                                  <p className="text-slate-400 text-sm font-medium">Waiting for student submissions</p>
                                </div>
                              ) : (
                                <div className="space-y-3 ml-2">
                                  {subs.map((sub: any) => {
                                    const isGrading = gradingId === sub.id;
                                    const isPlaceholder = !!sub.is_placeholder;
                                    const isGraded = sub.status === 'graded' && !isPlaceholder;
                                    const currentGrade = gradeValues[sub.id] ?? sub.grade ?? '';
                                    const currentFeedback = feedbackValues[sub.id] ?? sub.feedback ?? '';
                                    const isTextExpanded = expandedText[sub.id] || false;
                                    const maxGrade = sub.max_grade || assignment.max_grade;
                                    const gradePercent = isGraded && sub.grade ? Math.round((sub.grade / maxGrade) * 100) : 0;

                                    return (
                                      <div key={sub.id} className={`rounded-xl overflow-hidden transition-all duration-300 ${
                                        isGrading 
                                          ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-100 bg-white' 
                                          : isGraded
                                            ? 'bg-gradient-to-r from-emerald-50/60 to-white border border-emerald-200/60 hover:border-emerald-300 hover:shadow-md'
                                            : 'bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md shadow-sm'
                                      }`}>
                                        <div className="p-5">
                                          <div className="flex items-start justify-between gap-5">
                                            {/* Left side */}
                                            <div className="flex-1 min-w-0">
                                              {/* Student header */}
                                              <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                                                  isGraded ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : 'bg-gradient-to-br from-indigo-400 to-purple-600 text-white'
                                                }`}>
                                                  {(sub.student_name || 'S').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">{sub.student_name}</span>
                                                    {sub.is_late && (
                                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500 text-white uppercase tracking-wide shadow-sm">Late</span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Clock className="w-3 h-3 text-slate-300" />
                                                    <span className="text-xs text-slate-400">
                                                      {isPlaceholder
                                                        ? sub.status === 'missed'
                                                          ? 'Missed deadline — no submission'
                                                          : 'Pending submission'
                                                        : `${new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Submission attachments */}
                                              <div className="flex flex-wrap items-start gap-2 ml-12">
                                                {!isPlaceholder && sub.file_url && (
                                                  <a
                                                    href={sub.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group/link inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/60 text-purple-700 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300 hover:shadow-md text-sm font-semibold transition-all duration-200"
                                                  >
                                                    <div className="p-1 bg-purple-200/50 rounded-md group-hover/link:bg-purple-300/50 transition-colors">
                                                      <Upload className="w-3.5 h-3.5" />
                                                    </div>
                                                    {sub.file_name || 'View Uploaded File'}
                                                  </a>
                                                )}
                                                {!isPlaceholder && sub.link_url && (
                                                  <a
                                                    href={sub.link_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group/link inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/60 text-blue-700 hover:from-blue-100 hover:to-cyan-100 hover:border-blue-300 hover:shadow-md text-sm font-semibold transition-all duration-200"
                                                  >
                                                    <div className="p-1 bg-blue-200/50 rounded-md group-hover/link:bg-blue-300/50 transition-colors">
                                                      <LinkIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                    View Drive Link
                                                  </a>
                                                )}
                                                {!isPlaceholder && (sub.text_content || sub.submission_text) && (
                                                  <div className="w-full">
                                                    <button
                                                      onClick={() => setExpandedText(prev => ({ ...prev, [sub.id]: !isTextExpanded }))}
                                                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                                                        isTextExpanded
                                                          ? 'bg-gradient-to-r from-slate-100 to-slate-50 border-slate-300 text-slate-700 shadow-inner'
                                                          : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200/60 text-slate-600 hover:from-slate-100 hover:to-gray-100 hover:border-slate-300 hover:shadow-md'
                                                      }`}
                                                    >
                                                      <div className="p-1 bg-slate-200/50 rounded-md">
                                                        <FileText className="w-3.5 h-3.5" />
                                                      </div>
                                                      {isTextExpanded ? 'Hide Text' : 'View Text Submission'}
                                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTextExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {isTextExpanded && (
                                                      <div className="mt-3 p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap shadow-inner">
                                                        {sub.text_content || sub.submission_text}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                {isPlaceholder ? (
                                                  <span className={`text-xs font-semibold ml-1 ${sub.status === 'missed' ? 'text-red-400' : 'text-amber-400'}`}>
                                                    {sub.status === 'missed' ? 'Marked as missed' : 'Awaiting submission'}
                                                  </span>
                                                ) : !sub.file_url && !sub.link_url && !sub.text_content && !sub.submission_text ? (
                                                  <span className="text-xs text-slate-300 italic ml-1">No attachment provided</span>
                                                ) : null}
                                              </div>
                                            </div>

                                            {/* Right: Grade display / action */}
                                            <div className="shrink-0">
                                              {isPlaceholder ? (
                                                <div className="text-center">
                                                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sub.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {sub.status === 'missed' ? 'Missed' : 'Pending'}
                                                  </span>
                                                </div>
                                              ) : isGraded && !isGrading ? (
                                                <div className="text-center">
                                                  <div className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg ${
                                                    gradePercent >= 80 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                                                    gradePercent >= 60 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                                                    gradePercent >= 40 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                                                    'bg-gradient-to-br from-red-400 to-red-600'
                                                  }`}>
                                                    <span className="text-xl font-extrabold text-white leading-none">{sub.grade}</span>
                                                    <span className="text-[9px] font-bold text-white/70 mt-0.5">/ {maxGrade}</span>
                                                  </div>
                                                  <button
                                                    onClick={() => {
                                                      setGradingId(sub.id);
                                                      setGradeValues(prev => ({ ...prev, [sub.id]: sub.grade || 0 }));
                                                      setFeedbackValues(prev => ({ ...prev, [sub.id]: sub.feedback || '' }));
                                                    }}
                                                    className="mt-2 text-[11px] text-purple-500 hover:text-purple-700 font-semibold hover:underline transition-colors"
                                                  >
                                                    Edit
                                                  </button>
                                                </div>
                                              ) : !isGrading ? (
                                                <button
                                                  onClick={() => {
                                                    setGradingId(sub.id);
                                                    setGradeValues(prev => ({ ...prev, [sub.id]: sub.grade || 0 }));
                                                    setFeedbackValues(prev => ({ ...prev, [sub.id]: sub.feedback || '' }));
                                                  }}
                                                  className="flex flex-col items-center gap-1.5 px-5 py-3.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transition-all duration-200 hover:-translate-y-0.5"
                                                >
                                                  <Award className="w-5 h-5" />
                                                  <span className="text-xs font-bold">Grade</span>
                                                </button>
                                              ) : null}
                                            </div>
                                          </div>

                                          {/* Feedback display */}
                                          {isGraded && !isGrading && sub.feedback && (
                                            <div className="ml-12 mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200/60">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1 bg-emerald-200/50 rounded-md">
                                                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Your Feedback</span>
                                              </div>
                                              <p className="text-sm text-emerald-800 leading-relaxed">{sub.feedback}</p>
                                            </div>
                                          )}

                                          {/* Grading form */}
                                          {isGrading && (
                                            <div className="ml-12 mt-5">
                                              <div className="p-5 bg-gradient-to-br from-indigo-50 via-purple-50 to-fuchsia-50 rounded-2xl border border-purple-200/80 shadow-inner">
                                                <div className="flex items-center gap-2 mb-4">
                                                  <div className="p-1.5 bg-purple-500 rounded-lg">
                                                    <Award className="w-4 h-4 text-white" />
                                                  </div>
                                                  <span className="font-bold text-slate-700">Grade & Feedback</span>
                                                </div>
                                                <div className="flex gap-4">
                                                  <div className="shrink-0">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Score</label>
                                                    <div className="relative">
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        max={maxGrade}
                                                        value={currentGrade}
                                                        onChange={(e) => setGradeValues(prev => ({ ...prev, [sub.id]: parseInt(e.target.value) || 0 }))}
                                                        className="w-24 h-14 px-3 border-2 border-purple-200 rounded-xl font-extrabold text-2xl text-center text-purple-700 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:outline-none transition-all"
                                                      />
                                                      <div className="absolute -bottom-5 left-0 right-0 text-center">
                                                        <span className="text-[10px] font-semibold text-slate-400">out of {maxGrade}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex-1">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Feedback</label>
                                                    <textarea
                                                      value={currentFeedback}
                                                      onChange={(e) => setFeedbackValues(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                                      rows={3}
                                                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl text-sm bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:outline-none resize-none transition-all placeholder:text-slate-300"
                                                      placeholder="Write feedback for this student's work..."
                                                    />
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-purple-200/50">
                                                  <button
                                                    onClick={() => setGradingId(null)}
                                                    className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-all duration-200"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    onClick={() => gradeSubmission(sub)}
                                                    disabled={savingId === sub.id}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5"
                                                  >
                                                    {savingId === sub.id ? (
                                                      <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                      <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    {savingId === sub.id ? 'Saving...' : 'Save Grade'}
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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

// Discussion Tab Component
function DiscussionTab({ courseId, userId }: any) {
  const fetch = useBuilderApiFetch();

  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [collapsedReplies, setCollapsedReplies] = useState<Set<string>>(new Set());
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editReplyContent, setEditReplyContent] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showNewPostForm, setShowNewPostForm] = useState(false);

  useEffect(() => {
    fetchDiscussions();
    fetchUserRole();
    
    // Poll for new discussions every 8 seconds
    const pollInterval = setInterval(() => {
      fetchDiscussions(true);
    }, 8000);
    
    return () => clearInterval(pollInterval);
  }, [courseId]);

  const fetchUserRole = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
        headers: {}
      });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role || 'student');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchDiscussions = async (silent = false) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/discussions`, {
        headers: {}
      });
      if (res.ok) {
        const { data } = await res.json();
        setDiscussions(data || []);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const postDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle, content: newContent })
      });

      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setShowNewPostForm(false);
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Error posting discussion:', error);
      alert('Failed to post discussion');
    }
  };

  const postReply = async (discussionId: string) => {
    const content = replyContents[discussionId] || '';
    if (!content.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        setReplyContents(prev => ({ ...prev, [discussionId]: '' }));
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply');
    }
  };

  const vote = async (postId: string, voteType: 'up' | 'down') => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: voteType })
      });
      fetchDiscussions();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const editPost = async (postId: string) => {
    if (!editContent.trim()) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: editContent })
      });
      setEditingPost(null);
      setEditContent('');
      fetchDiscussions();
    } catch (error) {
      console.error('Error editing post:', error);
      alert('Failed to edit post');
    }
  };

  const editReply = async (replyId: string) => {
    if (!editReplyContent.trim()) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${replyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: editReplyContent })
      });
      setEditingReply(null);
      setEditReplyContent('');
      fetchDiscussions();
    } catch (error) {
      console.error('Error editing reply:', error);
      alert('Failed to edit reply');
    }
  };

  const deletePost = async (postId: string, createdAt: string, authorId: string) => {
    const hoursSincePost = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    
    if (userRole === 'student' && hoursSincePost > 2) {
      alert('You can only delete posts within 2 hours of posting');
      return;
    }
    
    if (!confirm('Delete this post?')) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${postId}`, {
        method: 'DELETE',
        headers: {}
      });
      fetchDiscussions();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const togglePin = async (discussionId: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/discussions/${discussionId}/pin`, {
        method: 'POST',
        headers: {}
      });
      fetchDiscussions();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const canEditDelete = (createdAt: string, authorClerkId: string) => {
    const hoursSincePost = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const isOwnPost = authorClerkId === userId;
    if (userRole === 'teacher' || userRole === 'admin') return true;
    return isOwnPost && hoursSincePost <= 2;
  };

  const toggleRepliesExpand = (postId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      newSet.has(postId) ? newSet.delete(postId) : newSet.add(postId);
      return newSet;
    });
    // When expanding, start with replies visible (not collapsed)
    setCollapsedReplies(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });
  };

  const toggleRepliesCollapse = (postId: string) => {
    setCollapsedReplies(prev => {
      const newSet = new Set(prev);
      newSet.has(postId) ? newSet.delete(postId) : newSet.add(postId);
      return newSet;
    });
  };

  const getReplyContent = (postId: string) => replyContents[postId] || '';
  const setReplyContent = (postId: string, value: string) => {
    setReplyContents(prev => ({ ...prev, [postId]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Course Discussion
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {discussions.length} {discussions.length === 1 ? 'post' : 'posts'} &middot; Auto-refreshes every 8s
          </p>
        </div>
        <button
          onClick={() => setShowNewPostForm(!showNewPostForm)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* New Post Form - Collapsible */}
      {showNewPostForm && (
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6 mb-6 shadow-sm">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Post Title"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What's on your mind? (markdown supported)"
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={postDiscussion}
              disabled={!newTitle.trim() || !newContent.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              Post
            </button>
            <button
              onClick={() => { setShowNewPostForm(false); setNewTitle(''); setNewContent(''); }}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {discussions.map((post: any) => (
          <div key={post.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 transition-all shadow-sm">
            {/* Post Header */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {post.is_pinned && (
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1">
                    <Pin className="w-3 h-3" />
                    PINNED
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {(post.author_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{post.author_name || 'Anonymous'}</span>
                  {post.author_role === 'teacher' && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">TEACHER</span>
                  )}
                  {post.author_role === 'admin' && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">ADMIN</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {(userRole === 'teacher' || userRole === 'admin') && (
                  <button
                    onClick={() => togglePin(post.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      post.is_pinned ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={post.is_pinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="p-5">
              <h4 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h4>
              
              {editingPost === post.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => editPost(post.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">Save</button>
                    <button onClick={() => { setEditingPost(null); setEditContent(''); }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
              )}

              {/* Actions Bar */}
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100 flex-wrap">
                {/* Voting */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => vote(post.id, 'up')}
                    className={`p-1.5 rounded-md transition-colors ${
                      post.user_vote === 'up' ? 'bg-orange-500 text-white' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-gray-900 min-w-[1.5rem] text-center text-sm">
                    {(post.upvotes || 0) - (post.downvotes || 0)}
                  </span>
                  <button
                    onClick={() => vote(post.id, 'down')}
                    className={`p-1.5 rounded-md transition-colors ${
                      post.user_vote === 'down' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Replies Toggle */}
                <button
                  onClick={() => toggleRepliesExpand(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                    expandedReplies.has(post.id) 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {post.reply_count || 0} {(post.reply_count || 0) === 1 ? 'Reply' : 'Replies'}
                  {expandedReplies.has(post.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Edit/Delete */}
                {canEditDelete(post.created_at, post.author_clerk_id) && !editingPost && (
                  <>
                    <button
                      onClick={() => { setEditingPost(post.id); setEditContent(post.content); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium text-blue-700 text-sm transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => deletePost(post.id, post.created_at, post.author_clerk_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg font-medium text-red-700 text-sm transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Replies Section - Expandable */}
            {expandedReplies.has(post.id) && (
              <div className="border-t border-gray-200 bg-gray-50">
                {/* Reply Input */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex gap-2">
                    <textarea
                      value={getReplyContent(post.id)}
                      onChange={(e) => setReplyContent(post.id, e.target.value)}
                      placeholder="Write a reply..."
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <button
                      onClick={() => postReply(post.id)}
                      disabled={!getReplyContent(post.id).trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors self-end"
                    >
                      Reply
                    </button>
                  </div>
                </div>

                {/* Replies List with Minimize/Maximize */}
                {post.replies && post.replies.length > 0 && (
                  <div className="px-4 pt-2 pb-1">
                    <button
                      onClick={() => toggleRepliesCollapse(post.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-2 transition-colors"
                    >
                      {collapsedReplies.has(post.id) ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          Show {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Minimize replies
                        </>
                      )}
                    </button>
                  </div>
                )}

                {!collapsedReplies.has(post.id) && (
                  <div className="px-4 pb-4 space-y-2">
                    {post.replies && post.replies.length > 0 ? (
                      post.replies.map((reply: any) => (
                        <div key={reply.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-200 transition-colors">
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-[10px] font-bold">
                                {(reply.author_name || 'A').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-900">{reply.author_name || 'Anonymous'}</span>
                              {reply.author_role === 'teacher' && (
                                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">TEACHER</span>
                              )}
                              {reply.author_role === 'admin' && (
                                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">ADMIN</span>
                              )}
                              <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => vote(reply.id, 'up')}
                                className={`p-1 rounded transition-colors ${
                                  reply.user_vote === 'up' ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-400'
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <span className="font-semibold text-[11px] text-gray-600 min-w-[1rem] text-center">
                                {(reply.upvotes || 0) - (reply.downvotes || 0)}
                              </span>
                              <button
                                onClick={() => vote(reply.id, 'down')}
                                className={`p-1 rounded transition-colors ${
                                  reply.user_vote === 'down' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'
                                }`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          {editingReply === reply.id ? (
                            <div className="mt-2">
                              <textarea
                                value={editReplyContent}
                                onChange={(e) => setEditReplyContent(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                rows={3}
                              />
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => editReply(reply.id)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium">Save</button>
                                <button onClick={() => { setEditingReply(null); setEditReplyContent(''); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-medium">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 text-sm whitespace-pre-wrap ml-8">{reply.content}</p>
                          )}
                          
                          {canEditDelete(reply.created_at, reply.author_clerk_id) && !editingReply && (
                            <div className="flex gap-3 mt-2 ml-8">
                              <button
                                onClick={() => { setEditingReply(reply.id); setEditReplyContent(reply.content); }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deletePost(reply.id, reply.created_at, reply.author_clerk_id)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-3">No replies yet. Be the first to reply!</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {discussions.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-16 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No discussions yet</h3>
            <p className="text-gray-500 mb-4">Start a conversation with your students!</p>
            <button
              onClick={() => setShowNewPostForm(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Create First Post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Announcements Tab Component
function AnnouncementsTab({ announcements, setAnnouncements, courseId, userId }: any) {
  const fetch = useBuilderApiFetch();

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch announcements on mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/announcements`, {
          headers: {}
        });
        if (res.ok) {
          const { data } = await res.json();
          setAnnouncements(data || []);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      }
    };
    fetchAnnouncements();
  }, [courseId, userId, fetch]);

  const addAnnouncement = async () => {
    if (!newTitle || !newContent) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle, content: newContent, is_pinned: false })
      });

      if (res.ok) {
        const { data } = await res.json();
        setAnnouncements([data, ...announcements]);
        setNewTitle('');
        setNewContent('');
      } else {
        alert('Failed to create announcement');
      }
    } catch (error) {
      console.error('Error adding announcement:', error);
      alert('Error creating announcement');
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_pinned: !currentPinned })
      });

      if (res.ok) {
        setAnnouncements(announcements.map((a: any) => 
          a.id === id ? { ...a, is_pinned: !currentPinned } : a
        ));
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/announcements/${id}`, {
        method: 'DELETE',
        headers: {}
      });

      if (res.ok) {
        setAnnouncements(announcements.filter((a: any) => a.id !== id));
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const sortedAnnouncements = [...(announcements || [])].sort((a, b) => {
    if (a?.is_pinned && !b?.is_pinned) return -1;
    if (!a?.is_pinned && b?.is_pinned) return 1;
    return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">Create Announcement</h3>
        
        <div className="space-y-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Announcement Title"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm font-medium"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Announcement Content"
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
          />
          <button
            onClick={addAnnouncement}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Post Announcement
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedAnnouncements.filter((a: any) => a && a.id).map((announcement: any) => (
          <div
            key={announcement?.id}
            className={`bg-white rounded-lg border p-5 ${
              announcement?.is_pinned 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                {announcement.is_pinned && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">PINNED</span>
                )}
                <h4 className="font-bold text-base text-gray-900">{announcement.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePin(announcement.id, announcement.is_pinned)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                  title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                >
                  📌
                </button>
                <button
                  onClick={() => setEditingId(announcement.id)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteAnnouncement(announcement.id)}
                  className="p-1.5 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{announcement.content}</p>
            <p className="text-xs text-gray-500">
              {new Date(announcement.created_at).toLocaleString()}
            </p>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No announcements yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Schedule Classes Tab Component
function ScheduleTab({ scheduledClasses, setScheduledClasses, courseId, userId }: any) {
  const fetch = useBuilderApiFetch();

  const [newClass, setNewClass] = useState({
    topic: '',
    date: '',
    time: '',
    meeting_link: ''
  });

  const [editingClass, setEditingClass] = useState<ScheduledClass | null>(null);

  // Fetch scheduled classes on mount
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/schedules`, {
          headers: {}
        });
        
        if (res.ok) {
          const data = await res.json();
          setScheduledClasses(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
      }
    };

    if (courseId && userId) {
      fetchSchedules();
    }
  }, [courseId, userId, fetch]);

  // Categorize schedules by status and time
  const categorizeSchedules = () => {
    const now = new Date();
    
    const categories = {
      live: [] as ScheduledClass[],
      upcoming: [] as ScheduledClass[],
      rescheduled: [] as ScheduledClass[],
      completed: [] as ScheduledClass[],
      cancelled: [] as ScheduledClass[],
      past: [] as ScheduledClass[]
    };

    scheduledClasses.forEach((cls: ScheduledClass) => {
      const classDate = new Date(cls.scheduled_date || cls.date);
      const status = cls.status || 'upcoming';

      if (status === 'live') {
        categories.live.push(cls);
      } else if (status === 'completed') {
        categories.completed.push(cls);
      } else if (status === 'cancelled') {
        categories.cancelled.push(cls);
      } else if (status === 'rescheduled') {
        categories.rescheduled.push(cls);
      } else if (status === 'upcoming' || status === 'scheduled') {
        if (classDate > now) {
          categories.upcoming.push(cls);
        } else {
          categories.past.push(cls);
        }
      } else {
        // Default to past if date is in the past and not categorized
        if (classDate < now) {
          categories.past.push(cls);
        } else {
          categories.upcoming.push(cls);
        }
      }
    });

    return categories;
  };

  const categorizedSchedules = categorizeSchedules();

  const scheduleClass = async () => {
    if (!newClass.topic || !newClass.date || !newClass.time) {
      alert('Please fill in topic, date, and time');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newClass.topic,
          scheduled_date: newClass.date,
          start_time: newClass.time,
          end_time: newClass.time, // You can add end_time input field if needed
          meet_link: newClass.meeting_link,
          timezone: 'Asia/Kolkata'
        })
      });

      if (res.ok) {
        const response = await res.json();
        const data = response.data || response;
        setScheduledClasses([...scheduledClasses, { ...data, status: 'scheduled' }]);
        setNewClass({ topic: '', date: '', time: '', meeting_link: '' });
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to schedule class');
      }
    } catch (error) {
      console.error('Error scheduling class:', error);
      alert('Failed to schedule class');
    }
  };

  const updateClassStatus = async (classId: string, newStatus: string, newDate?: string, newTime?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newDate) updateData.scheduled_date = newDate;
      if (newTime) updateData.start_time = newTime;
      if (newStatus === 'rescheduled' && newDate) {
        updateData.original_date = scheduledClasses.find((c: ScheduledClass) => c.id === classId)?.date;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/schedules/${classId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        const response = await res.json();
        const updatedClass = response.data || response;
        setScheduledClasses(scheduledClasses.map((c: ScheduledClass) => 
          c.id === classId ? { ...c, ...updatedClass } : c
        ));
        setEditingClass(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update class status');
      }
    } catch (error) {
      console.error('Error updating class status:', error);
      alert('Failed to update class status');
    }
  };

  const deleteClass = async (classId: string) => {
    if (!confirm('Delete this scheduled class?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/schedules/${classId}`, {
        method: 'DELETE',
        headers: {}
      });

      if (res.ok) {
        setScheduledClasses(scheduledClasses.filter((cls: ScheduledClass) => cls.id !== classId));
        alert('Class deleted successfully!');
      } else {
        alert('Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'live': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">Schedule New Class</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Class Topic *</label>
            <input
              type="text"
              value={newClass.topic}
              onChange={(e) => setNewClass({ ...newClass, topic: e.target.value })}
              placeholder="e.g., Tajweed Rules Session 1"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input
              type="date"
              value={newClass.date}
              onChange={(e) => setNewClass({ ...newClass, date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
            <input
              type="time"
              value={newClass.time}
              onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link (Optional)</label>
            <input
              type="text"
              value={newClass.meeting_link}
              onChange={(e) => setNewClass({ ...newClass, meeting_link: e.target.value })}
              placeholder="https://meet.google.com/..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>
        </div>
        <button
          onClick={scheduleClass}
          className="mt-5 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Schedule Class
        </button>
      </div>

      <div className="space-y-6">
        {/* Helper function to render a category section */}
        {(() => {
          const renderCategorySection = (title: string, icon: string, classes: ScheduledClass[], bgColor: string, textColor: string) => {
            if (classes.length === 0) return null;

            return (
              <div key={title} className="space-y-3">
                <div className={`${bgColor} ${textColor} px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-sm`}>
                  <span>{icon}</span>
                  <span>{title} ({classes.length})</span>
                </div>
                {classes.map((cls: ScheduledClass) => (
                  <div key={cls.id} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow ml-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-semibold text-lg text-gray-900">{cls.title || cls.topic || 'Untitled Class'}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(cls.status || 'upcoming')}`}>
                            {(cls.status || 'upcoming').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-5 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {(cls.scheduled_date ? new Date(cls.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : cls.date ? new Date(cls.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set')}
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {cls.start_time || cls.time || 'Not set'}
                          </span>
                        </div>
                        {cls.original_date && (
                          <p className="text-xs text-yellow-700 bg-yellow-50 inline-block px-2 py-1 rounded mb-2">
                            Originally scheduled for {new Date(cls.original_date).toLocaleDateString()}
                          </p>
                        )}
                        {cls.attendance_count !== undefined && (
                          <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {cls.attendance_count} students attended
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Join Meeting Button (shown for upcoming and live classes) */}
                        {(cls.meeting_link || cls.meet_link) && (cls.status === 'upcoming' || cls.status === 'live' || cls.status === 'scheduled') && (
                          <a
                            href={cls.meeting_link || cls.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4" />
                            Join Class
                          </a>
                        )}
                        
                        {/* Mark as Live Button (only for upcoming/scheduled classes) */}
                        {(cls.status === 'upcoming' || cls.status === 'scheduled') && (
                          <button
                            onClick={() => updateClassStatus(cls.id, 'live')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Start Live
                          </button>
                        )}

                        {/* Mark as Completed Button (only for live classes) */}
                        {cls.status === 'live' && (
                          <button
                            onClick={() => updateClassStatus(cls.id, 'completed')}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark as Completed
                          </button>
                        )}

                        {/* Reschedule Button (shown for all non-completed classes) */}
                        {cls.status !== 'completed' && (
                          <button
                            onClick={() => setEditingClass(cls)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Reschedule
                          </button>
                        )}

                        {/* Cancel Button (for non-cancelled and non-completed classes) */}
                        {cls.status !== 'cancelled' && cls.status !== 'completed' && (
                          <button
                            onClick={() => updateClassStatus(cls.id, 'cancelled')}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => deleteClass(cls.id)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          };

          return (
            <>
              {renderCategorySection('Live', '🟢', categorizedSchedules.live, 'bg-green-50', 'text-green-800')}
              {renderCategorySection('Upcoming', '📅', categorizedSchedules.upcoming, 'bg-blue-50', 'text-blue-800')}
              {renderCategorySection('Rescheduled', '🔄', categorizedSchedules.rescheduled, 'bg-yellow-50', 'text-yellow-800')}
              {renderCategorySection('Past', '⏰', categorizedSchedules.past, 'bg-orange-50', 'text-orange-800')}
              {renderCategorySection('Completed', '✅', categorizedSchedules.completed, 'bg-gray-50', 'text-gray-800')}
              {renderCategorySection('Cancelled', '❌', categorizedSchedules.cancelled, 'bg-red-50', 'text-red-800')}
            </>
          );
        })()}

        {scheduledClasses.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No classes scheduled yet</p>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Reschedule Class</h3>
              <button onClick={() => setEditingClass(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Date</label>
                <input
                  type="date"
                  defaultValue={editingClass.scheduled_date ? new Date(editingClass.scheduled_date).toISOString().split('T')[0] : editingClass.date}
                  onChange={(e) => setEditingClass({ ...editingClass, scheduled_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Time</label>
                <input
                  type="time"
                  defaultValue={editingClass.start_time || editingClass.time}
                  onChange={(e) => setEditingClass({ ...editingClass, start_time: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingClass(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => updateClassStatus(editingClass.id, 'rescheduled', editingClass.scheduled_date, editingClass.start_time)}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ course, setCourse, gradingPolicy, setGradingPolicy, setHasUnsavedChanges, userId, courseId }: any) {
  const fetch = useBuilderApiFetch();

  const [publishing, setPublishing] = useState(false);
  const [completionText, setCompletionText] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updatePolicy = (field: string, value: string) => {
    const normalized = value === '' ? '' : String(Math.max(0, Math.min(100, Number(value) || 0)));
    setGradingPolicy((prev: any) => ({ ...prev, [field]: normalized }));
    setHasUnsavedChanges(true);
  };

  const markCourseComplete = async () => {
    if (!userId) {
      setStatusMessage({ type: 'error', text: 'Unable to verify completion. Please sign in again and retry.' });
      return;
    }

    if (completionText.trim().toUpperCase() !== 'COMPLETE') {
      setStatusMessage({ type: 'error', text: 'Please type COMPLETE exactly to verify this course.' });
      return;
    }

    setMarkingComplete(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
      }

      setCourse((prev: any) => ({ ...prev, is_completed: true, completed_at: new Date().toISOString() }));
      setCompletionText('');
      setStatusMessage({
        type: 'success',
        text: payload.message || 'Course marked as complete. You can now submit it for admin approval.'
      });
    } catch (error) {
      console.error('Error marking course complete:', error);
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to mark course complete'
      });
    } finally {
      setMarkingComplete(false);
    }
  };

  const togglePublish = async () => {
    if (!userId) {
      setStatusMessage({ type: 'error', text: 'Unable to update publish status. Please sign in again.' });
      return;
    }

    setPublishing(true);
    try {
      const newStatus = course?.is_published ? false : true;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/publish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_published: newStatus,
          status: newStatus ? 'published' : 'draft'
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
      }

      setCourse((prev: any) => ({
        ...prev,
        is_published: newStatus,
        status: newStatus ? 'published' : 'draft'
      }));
      setStatusMessage({
        type: 'success',
        text: newStatus ? 'Course is now published and visible to students.' : 'Course moved to draft mode.'
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update publish status'
      });
    } finally {
      setPublishing(false);
    }
  };

  const quiz = parseInt(gradingPolicy.quiz_percentage) || 0;
  const activity = parseInt(gradingPolicy.activity_percentage) || 0;
  const finalExam = parseInt(gradingPolicy.final_exam_percentage) || 0;
  const totalPercentage = quiz + activity + finalExam;

  return (
    <div className="max-w-5xl space-y-6">
      {statusMessage && (
        <IslamicCard
          className={`p-4 border ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-rose-200 bg-rose-50'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              statusMessage.type === 'success' ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {statusMessage.text}
          </p>
        </IslamicCard>
      )}

      {/* Course Completion Verification */}
      <IslamicCard className="p-8 shadow-lg border border-slate-200 bg-white">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Course Completion Verification</h3>
        <p className="text-sm text-slate-600 mb-6">Confirm this course is production-ready before submitting for admin approval.</p>
        
        {course?.is_completed ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="font-bold text-lg text-emerald-900">Course Verified as Complete</p>
                <p className="text-sm text-emerald-700">
                  Completed on {new Date(course.completed_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="text-sm text-emerald-700 mt-3">
              Your course has been verified and is ready for admin approval. You can now submit it for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3">Verify Course Completion</h4>
              <p className="text-sm text-slate-700 mb-4">
                Before submitting for approval, please verify that:
              </p>
              <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside mb-4">
                <li>All course weeks and lessons are added</li>
                <li>All content URLs are working and correct</li>
                <li>Quizzes and assignments are configured properly</li>
                <li>Course description, objectives, and metadata are complete</li>
                <li>Live/hybrid courses have proper scheduling</li>
              </ul>
              
              <div className="mt-4">
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Type "COMPLETE" to verify
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={completionText}
                    onChange={(e) => setCompletionText(e.target.value)}
                    placeholder="Type COMPLETE"
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg font-medium text-center uppercase"
                    maxLength={8}
                  />
                  <button
                    onClick={markCourseComplete}
                    disabled={markingComplete || completionText.trim().toUpperCase() !== 'COMPLETE'}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {markingComplete ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Verify Complete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Once verified, your course will be eligible for admin approval. 
                Pre-recorded courses with unlock dates will auto-publish when the date is reached.
              </p>
            </div>
          </div>
        )}
      </IslamicCard>

      {/* Publish Toggle */}
      <IslamicCard className="p-8 shadow-lg border border-slate-200 bg-white">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Publish Course</h3>
        <p className="text-sm text-slate-600 mb-6">Control whether students can see and enroll in this course.</p>
        
        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="font-bold text-lg text-slate-900 mb-2">
              {course?.is_published ? 'Course is Live' : 'Course is Draft'}
            </p>
            <p className="text-sm text-slate-600">
              {course?.is_published ? 'Students can enroll and access content' : 'Only you can see this course'}
            </p>
          </div>
          <button
            onClick={togglePublish}
            disabled={publishing}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
              course?.is_published ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                course?.is_published ? 'translate-x-11' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </IslamicCard>

      {/* Grading Policy */}
      <IslamicCard className="p-8 shadow-lg border border-slate-200 bg-white">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900">Grading Policy</h3>
          <p className="text-sm text-slate-600 mt-1">Set how student performance is calculated. The total must be exactly 100%.</p>
        </div>
        
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Quiz Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={gradingPolicy.quiz_percentage}
              onChange={(e) => updatePolicy('quiz_percentage', e.target.value)}
              placeholder="e.g., 30"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl font-semibold text-lg"
            />
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Activity Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={gradingPolicy.activity_percentage}
              onChange={(e) => updatePolicy('activity_percentage', e.target.value)}
              placeholder="e.g., 10"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl font-semibold text-lg"
            />
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Final Exam Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={gradingPolicy.final_exam_percentage}
              onChange={(e) => updatePolicy('final_exam_percentage', e.target.value)}
              placeholder="e.g., 60"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl font-semibold text-lg"
            />
          </div>

          <div className={`p-5 rounded-xl ${totalPercentage === 100 ? 'bg-emerald-50 border border-emerald-300' : 'bg-rose-50 border border-rose-300'}`}>
            <p className={`font-bold text-lg ${totalPercentage === 100 ? 'text-emerald-900' : 'text-rose-900'}`}>
              Total: {totalPercentage}%
              {totalPercentage !== 100 && ' (Must equal 100%)'}
              {totalPercentage === 100 && ' ✓'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Certificate Passing Criteria (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={gradingPolicy.passing_percentage}
              onChange={(e) => updatePolicy('passing_percentage', e.target.value)}
              placeholder="e.g., 70"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl font-semibold text-lg"
            />
            <p className="text-xs text-slate-500 mt-2">Students must achieve this overall percentage to earn a certificate</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h4 className="font-bold text-white mb-2">Certificate Requirements</h4>
            <p className="text-sm text-slate-200 font-medium">
              Students must achieve a minimum of {gradingPolicy.passing_percentage || 70}% overall grade to receive a certificate.
            </p>
          </div>
        </div>
      </IslamicCard>
    </div>
  );
}

// Week Editor Modal Component
function WeekEditorModal({ week, onSave, onClose }: { week: Week; onSave: (week: Week) => void; onClose: () => void }) {
  const [title, setTitle] = useState(week.title || '');
  const [isPublished, setIsPublished] = useState(week.is_published || false);
  const [releaseDate, setReleaseDate] = useState(
    week.release_date ? new Date(week.release_date).toISOString().slice(0, 16) : ''
  );

  const handleSave = () => {
    onSave({
      ...week,
      title,
      is_published: isPublished,
      release_date: releaseDate || null
    });
  };

  const handlePublish = () => {
    setIsPublished(true);
    setTimeout(() => {
      onSave({
        ...week,
        title,
        is_published: true,
        release_date: null
      });
    }, 100);
  };

  const handleUnpublish = () => {
    setIsPublished(false);
    setTimeout(() => {
      onSave({
        ...week,
        title,
        is_published: false,
        release_date: releaseDate || null
      });
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Edit Week Settings</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Week Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Week Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Week 1: Introduction"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Publishing Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Publishing Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Current Status</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {isPublished ? 'This week is published and visible to students' : 'This week is in draft mode'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full font-medium ${
                  isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isPublished ? '✓ Published' : 'Draft'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Release Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-600 mt-1">
                  If set, the week will auto-publish at this date/time
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">About Week Publishing</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Publishing a week makes all its lessons visible to students</li>
              <li>Set a release date to schedule automatic publishing</li>
              <li>Individual lessons can have their own publish settings</li>
              <li>Unpublishing hides the entire week from students</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <div className="flex gap-2">
            {!isPublished ? (
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Publish Now
              </button>
            ) : (
              <button
                onClick={handleUnpublish}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Unpublish
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

