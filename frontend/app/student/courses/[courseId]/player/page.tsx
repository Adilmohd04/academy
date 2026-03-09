'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { 
  ArrowLeft, PlayCircle, FileText, CheckCircle, Lock, BookOpen, Clock, 
  Award, Globe, ChevronLeft, ChevronRight, Menu, X, Book, MessageCircle 
} from 'lucide-react';
import IslamicLoader from '@/components/shared/IslamicLoader';

interface Lesson {
  id: string;
  title: string;
  content_type: 'video' | 'text' | 'quiz' | 'assignment';
  content_url?: string;
  content_url_en?: string;
  content_url_ta?: string;
  content_url_ar?: string;
  duration_minutes?: number;
  order_index: number;
  is_completed: boolean;
  is_locked: boolean;
}

interface Week {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  progress_percentage: number;
  total_lessons: number;
  completed_lessons: number;
  weeks: Week[];
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
];

export default function CoursePlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.id as string;
  const initialLessonId = searchParams.get('lesson');

  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchCourseContent();
  }, [courseId]);

  const fetchCourseContent = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/courses/${courseId}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch course');

      const data = await response.json();
      setCourse(data);

      // Determine starting lesson
      if (data.weeks && data.weeks.length > 0) {
        let foundLesson = false;
        
        // 1. Try to find requested lesson
        if (initialLessonId) {
          for (const week of data.weeks) {
            const lesson = week.lessons.find((l: Lesson) => l.id === initialLessonId);
            if (lesson) {
              setCurrentWeek(week);
              setCurrentLesson(lesson);
              foundLesson = true;
              break;
            }
          }
        }
        
        // 2. Default to first lesson if not found
        if (!foundLesson && data.weeks[0].lessons.length > 0) {
          setCurrentWeek(data.weeks[0]);
          setCurrentLesson(data.weeks[0].lessons[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = (week: Week, lesson: Lesson) => {
    if (lesson.is_locked) return;
    setCurrentWeek(week);
    setCurrentLesson(lesson);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const markLessonComplete = async (lessonId: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state to reflect completion immediately
      setCourse(prev => {
        if (!prev) return null;
        const newWeeks = prev.weeks.map(w => ({
          ...w,
          lessons: w.lessons.map(l => 
            l.id === lessonId ? { ...l, is_completed: true } : l
          )
        }));
        
        // Recalculate progress roughly
        const completedCount = prev.completed_lessons + 1;
        const total = prev.total_lessons || 1;
        const progress = Math.min(100, Math.round((completedCount / total) * 100));

        return {
          ...prev,
          weeks: newWeeks,
          completed_lessons: completedCount,
          progress_percentage: progress
        };
      });

      if (currentLesson?.id === lessonId) {
        setCurrentLesson(prev => prev ? { ...prev, is_completed: true } : null);
      }

    } catch (error) {
      console.error('Error marking lesson complete:', error);
    }
  };

  const findNextLesson = () => {
    if (!course || !currentWeek || !currentLesson) return null;

    const currentWeekIndex = course.weeks.findIndex(w => w.id === currentWeek.id);
    const currentLessonIndex = currentWeek.lessons.findIndex(l => l.id === currentLesson.id);

    // Try next lesson in current week
    if (currentLessonIndex < currentWeek.lessons.length - 1) {
      const nextLesson = currentWeek.lessons[currentLessonIndex + 1];
      return { week: currentWeek, lesson: nextLesson };
    }
    // Try first lesson of next week
    else if (currentWeekIndex < course.weeks.length - 1) {
      const nextWeek = course.weeks[currentWeekIndex + 1];
      if (nextWeek.lessons.length > 0) {
        return { week: nextWeek, lesson: nextWeek.lessons[0] };
      }
    }
    return null;
  };

  const findPrevLesson = () => {
    if (!course || !currentWeek || !currentLesson) return null;

    const currentWeekIndex = course.weeks.findIndex(w => w.id === currentWeek.id);
    const currentLessonIndex = currentWeek.lessons.findIndex(l => l.id === currentLesson.id);

    // Try prev lesson in current week
    if (currentLessonIndex > 0) {
      const prevLesson = currentWeek.lessons[currentLessonIndex - 1];
      return { week: currentWeek, lesson: prevLesson };
    }
    // Try last lesson of prev week
    else if (currentWeekIndex > 0) {
      const prevWeek = course.weeks[currentWeekIndex - 1];
      if (prevWeek.lessons.length > 0) {
        return { week: prevWeek, lesson: prevWeek.lessons[prevWeek.lessons.length - 1] };
      }
    }
    return null;
  };

  const handleNextLesson = () => {
    if (currentLesson && !currentLesson.is_completed) {
      markLessonComplete(currentLesson.id);
    }
    const next = findNextLesson();
    if (next) {
      setCurrentWeek(next.week);
      setCurrentLesson(next.lesson);
    }
  };

  const handlePrevLesson = () => {
    const prev = findPrevLesson();
    if (prev) {
      setCurrentWeek(prev.week);
      setCurrentLesson(prev.lesson);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center"><IslamicLoader /></div>;
  if (!course) return <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center text-gray-500">Course not found</div>;

  const nextItem = findNextLesson();
  const prevItem = findPrevLesson();

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-[#1B365D] text-white flex items-center justify-between px-4 z-20 shadow-md flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/student/courses/${courseId}/learn`}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-8 w-[1px] bg-white/20 mx-2"></div>
          <div>
            <h1 className="font-semibold text-sm md:text-base line-clamp-1">{course.title}</h1>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#C5A059] rounded-full"
                  style={{ width: `${course.progress_percentage}%` }}
                />
              </div>
              <span>{course.progress_percentage}% complete</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-white/10 rounded-lg lg:hidden"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Content Area (Player) */}
        <div className="flex-1 flex flex-col relative bg-gray-900 overflow-y-auto">
          {currentLesson ? (
            <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
              
              {/* Media Player Container */}
              <div className="aspect-video bg-black w-full relative group">
                {currentLesson.content_type === 'video' ? (
                  (() => {
                    const urlMap: Record<string, string | undefined> = {
                      en: currentLesson.content_url_en || currentLesson.content_url,
                      ta: currentLesson.content_url_ta,
                      ar: currentLesson.content_url_ar,
                    };
                    const videoUrl = urlMap[selectedLanguage] || currentLesson.content_url;
                    
                    if (!videoUrl) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-900 border-b border-gray-800">
                          <div className="text-center">
                            <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No video available for selected language</p>
                          </div>
                        </div>
                      );
                    }
                    
                    // Convert YouTube URL to embed
                    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                    const embedUrl = youtubeMatch 
                      ? `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`
                      : videoUrl;
                    
                    return (
                      <iframe
                        key={selectedLanguage + videoUrl}
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  })()
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-8">
                    {currentLesson.content_type === 'text' && <BookOpen className="w-20 h-20 text-[#C5A059] mb-4" />}
                    {currentLesson.content_type === 'quiz' && <FileText className="w-20 h-20 text-[#C5A059] mb-4" />}
                    {currentLesson.content_type === 'assignment' && <FileText className="w-20 h-20 text-[#C5A059] mb-4" />}
                    <h2 className="text-2xl font-bold mb-2">{currentLesson.title}</h2>
                    <p className="text-gray-400">
                      {currentLesson.content_type === 'text' ? 'Read the material below' : 
                       'Please complete this activity'}
                    </p>
                  </div>
                )}
              </div>

              {/* Lesson Controls & Info */}
              <div className="bg-white flex-1 p-6 border-t border-gray-200">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-[#C5A059] font-medium mb-1">
                      {currentWeek?.title} • Lesson {currentLesson.order_index + 1}
                    </div>
                    <h2 className="text-2xl font-bold text-[#1B365D] mb-4">{currentLesson.title}</h2>
                    
                    {/* Language Toggles */}
                    {currentLesson.content_type === 'video' && 
                     (currentLesson.content_url_ta || currentLesson.content_url_ar) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {LANGUAGES.map(lang => {
                          const hasUrl = lang.code === 'en' 
                            ? (currentLesson.content_url_en || currentLesson.content_url)
                            : (currentLesson as any)[`content_url_${lang.code}`];
                          
                          if (!hasUrl) return null;

                          return (
                            <button
                              key={lang.code}
                              onClick={() => setSelectedLanguage(lang.code)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                selectedLanguage === lang.code
                                  ? 'bg-[#1B365D] text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevLesson}
                      disabled={!prevItem}
                      className="p-3 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {!currentLesson.is_completed ? (
                       <button
                        onClick={() => markLessonComplete(currentLesson.id)}
                        className="px-6 py-3 bg-[#1B365D] text-white rounded-lg hover:bg-[#152a48] font-medium flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Complete
                      </button>
                    ) : (
                       <button
                        disabled
                        className="px-6 py-3 bg-green-100 text-green-700 rounded-lg font-medium flex items-center gap-2 cursor-default"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </button>
                    )}
                    <button
                      onClick={handleNextLesson}
                      disabled={!nextItem}
                      className="p-3 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content Tabs / Details */}
                <div className="border-t border-gray-100 pt-6">
                  {currentLesson.content_type === 'text' && (
                     <div className="prose max-w-none text-gray-700">
                        {/* Mock Text Content */}
                        <p>This is a text lesson. Please read the content carefully.</p>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                     </div>
                  )}

                  {currentLesson.content_type === 'quiz' && (
                     <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-[#C5A059] mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-900">Quiz: {currentLesson.title}</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">This lesson includes a quiz to test your understanding of the material.</p>
                        <button
                          onClick={() => router.push(`/student/courses/${courseId}/quiz/${currentLesson.id}`)}
                          className="px-6 py-2 bg-[#C5A059] text-white rounded-lg hover:bg-[#B08D4C] transition-colors"
                        >
                          Start Quiz Attempt
                        </button>
                     </div>
                  )}
                  
                  {currentLesson.content_type === 'assignment' && (
                     <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <Book className="w-12 h-12 text-[#1B365D] mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-900">Assignment: {currentLesson.title}</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">You need to submit an assignment to complete this module.</p>
                        <button
                          onClick={() => router.push(`/student/courses/${courseId}/assignment/${currentLesson.id}`)}
                          className="px-6 py-2 bg-[#1B365D] text-white rounded-lg hover:bg-[#152a48] transition-colors"
                        >
                          View Assignment Details
                        </button>
                     </div>
                  )}

                  {currentLesson.content_type === 'video' && (
                    <div className="flex gap-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">About this lesson</h4>
                        <p>Watch the video lecture to understand the core concepts. You can switch between languages using the buttons above if available.</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex justify-center">
                    <Link 
                      href={`/student/courses/${courseId}/discussions`}
                      target="_blank"
                      className="text-[#1B365D] hover:underline flex items-center gap-2 text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Discuss this lesson in the forum
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>Select a lesson from the sidebar to start learning</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Course Content */}
        <div className={`
          fixed inset-y-0 right-0 z-30 w-80 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:mr-[-320px]'}
        `}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-[#1B365D]">Course Content</h3>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {course.weeks.map((week) => (
              <div key={week.id} className="border-b border-gray-100 last:border-0">
                <div className="px-5 py-3 bg-gray-50/50">
                  <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider">
                    {week.title}
                  </h4>
                </div>
                <div>
                  {week.lessons.map((lesson) => {
                    const isActive = currentLesson?.id === lesson.id;
                    const isCompleted = lesson.is_completed;
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(week, lesson)}
                        disabled={lesson.is_locked}
                        className={`w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-l-4 ${
                          isActive 
                            ? 'border-[#C5A059] bg-[#FDFBF7]' 
                            : 'border-transparent'
                        } ${lesson.is_locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : lesson.is_locked ? (
                            <Lock className="w-4 h-4 text-gray-300" />
                          ) : (
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              isActive ? 'border-[#C5A059]' : 'border-gray-300'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            isActive ? 'text-[#1B365D]' : 'text-gray-700'
                          }`}>
                            {lesson.order_index + 1}. {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {lesson.content_type === 'video' && <PlayCircle className="w-3 h-3 text-gray-400" />}
                            {lesson.content_type === 'text' && <BookOpen className="w-3 h-3 text-gray-400" />}
                            {lesson.content_type === 'quiz' && <FileText className="w-3 h-3 text-gray-400" />}
                            {lesson.duration_minutes && (
                              <span className="text-xs text-gray-400">{lesson.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
