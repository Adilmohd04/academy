'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, FileText } from 'lucide-react';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Lesson {
  id: string;
  title: string;
  content: string;
  order_index: number;
}

export default function LessonPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const lessonId = params?.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (userId && lessonId) {
      fetchLesson();
    }
  }, [userId, lessonId]);

  const fetchLesson = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}`, {
        headers: { 'x-clerk-user-id': userId || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setLesson(data);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/progress/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ lessonId, courseId })
      });
      setCompleted(true);
    } catch (error) {
      console.error('Error marking complete:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <IslamicCard className="p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-700">Lesson not found</h2>
        </IslamicCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <IslamicCard className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{lesson.title}</h1>
                {completed && (
                  <div className="flex items-center gap-2 text-green-600 mt-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </div>
            </div>
            {!completed && (
              <IslamicButton
                variant="primary"
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </IslamicButton>
            )}
          </div>

          <div className="prose max-w-none">
            <div className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <IslamicButton
              variant="secondary"
              onClick={() => router.push(`/learn/${courseId}`)}
            >
              Back to Course
            </IslamicButton>
          </div>
        </IslamicCard>
      </div>
    </div>
  );
}
