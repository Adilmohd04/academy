'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { 
  BookOpen, User, Users, CheckCircle,
  XCircle, AlertCircle, ArrowLeft, Play, Lock 
} from 'lucide-react';
import { IslamicPageLoader } from '@/components/ui/IslamicPageLoader';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  max_students: number;
  teacher_name: string;
  enrolled_count: number;
  prerequisites: { id: string; title: string; description: string }[];
  weeks: { id: string; week_number: number; title: string; description: string }[];
  is_enrolled: boolean;
}

interface Eligibility {
  eligible: boolean;
  reason: string;
  missing_prerequisites: { id: string; title: string }[];
  has_capacity: boolean;
  already_enrolled: boolean;
  current_enrollment: number;
  max_students: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      checkEligibility();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const token = await getToken();
      const response = await api.student.getCourseDetails(courseId, token);
      
      if (response.data.success) {
        setCourse(response.data.course);
      } else {
        toast.error('Failed to load course details');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Error loading course');
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    try {
      const token = await getToken();
      const response = await api.student.checkEligibility(courseId, token);
      
      if (response.data.success) {
        setEligibility(response.data.eligibility);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    }
  };

  const handleEnroll = async () => {
    if (!eligibility?.eligible) {
      toast.error(eligibility?.reason || 'You are not eligible for this course');
      return;
    }

    if (!course) return;

    if (!course.price || course.price <= 0) {
      try {
        setEnrolling(true);
        const token = await getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/enroll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-clerk-user-id': userId || ''
          }
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          toast.error(data?.message || data?.error || 'Failed to enroll in course');
          return;
        }

        toast.success('Successfully enrolled!');
        router.push('/student/courses');
        return;
      } catch (error) {
        console.error('Error enrolling in free course:', error);
        toast.error('Could not enroll right now. Please try again.');
        return;
      } finally {
        setEnrolling(false);
      }
    }

    router.push(`/student/courses/${courseId}/payment`);
  };

  if (loading) {
    return <IslamicPageLoader message="Loading Course..." arabicMessage="جاري تحميل الدورة..." />;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-islamic-midnight-800 mb-2">Course Not Found</h2>
          <IslamicButton onClick={() => router.push('/student/courses/browse')}>
            Back to Browse
          </IslamicButton>
        </div>
      </div>
    );
  }

  const isFull = eligibility && !eligibility.has_capacity;
  const hasPrerequisites = course.prerequisites && course.prerequisites.length > 0;
  const missingPrereqs = eligibility?.missing_prerequisites || [];
  const maxStudents = eligibility?.max_students || course.max_students || 0;
  const currentEnrollment = eligibility?.current_enrollment || course.enrolled_count || 0;
  const seatsLeft = Math.max(maxStudents - currentEnrollment, 0);
  const isFreeCourse = !course.price || course.price <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-primary-50 via-white to-islamic-gold-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-islamic-primary-700 to-islamic-emerald-600 text-white py-8 px-6 mb-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/student/courses/browse')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold mb-3 inline-block">
              {course.category}
            </span>
            <h1 className="text-4xl font-bold mb-2">{course.title}</h1>
            <div className="flex items-center gap-4 text-islamic-primary-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{course.teacher_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{eligibility?.current_enrollment || course.enrolled_count}/{eligibility?.max_students || course.max_students} Students</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <IslamicCard>
              <h2 className="text-2xl font-bold text-islamic-primary-800 mb-4">About This Course</h2>
              <p className="text-islamic-midnight-700 leading-relaxed">{course.description}</p>
            </IslamicCard>

            {/* Prerequisites */}
            {hasPrerequisites && (
              <IslamicCard>
                <h2 className="text-2xl font-bold text-islamic-primary-800 mb-4 flex items-center gap-2">
                  <Lock className="w-6 h-6" />
                  Prerequisites
                </h2>
                
                {missingPrereqs.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-800 mb-1">Not Eligible</p>
                        <p className="text-sm text-red-700">
                          You must complete the following courses before enrolling:
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {course.prerequisites.map((prereq) => {
                    const isCompleted = !missingPrereqs.find(m => m.id === prereq.id);
                    
                    return (
                      <div
                        key={prereq.id}
                        className={`p-4 rounded-xl border-2 ${
                          isCompleted
                            ? 'bg-islamic-emerald-50 border-islamic-emerald-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 text-islamic-emerald-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                              <h3 className="font-bold text-islamic-midnight-800">{prereq.title}</h3>
                            </div>
                            <p className="text-sm text-islamic-midnight-600 ml-7">{prereq.description}</p>
                          </div>
                          {!isCompleted && (
                            <button
                              onClick={() => router.push(`/student/courses/browse/${prereq.id}`)}
                              className="ml-4 px-3 py-1 bg-islamic-primary-600 text-white rounded-lg text-sm hover:bg-islamic-primary-700 transition-colors"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </IslamicCard>
            )}

            {/* Course Outline */}
            {course.weeks && course.weeks.length > 0 && (
              <IslamicCard>
                <h2 className="text-2xl font-bold text-islamic-primary-800 mb-4">Course Outline</h2>
                <div className="space-y-3">
                  {course.weeks.map((week) => (
                    <div key={week.id} className="p-4 bg-islamic-gold-50 rounded-xl border border-islamic-gold-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-islamic-primary-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {week.week_number}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-islamic-midnight-800 mb-1">{week.title}</h3>
                          <p className="text-sm text-islamic-midnight-600">{week.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </IslamicCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card */}
            <IslamicCard className="sticky top-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-islamic-emerald-600 mb-2">
                  {isFreeCourse ? 'Free' : `₹${course.price}`}
                </div>
                <p className="text-sm text-islamic-midnight-600">
                  {isFreeCourse ? 'No payment required' : 'One-time payment'}
                </p>
              </div>

              {/* Status Messages */}
              {course.is_enrolled ? (
                <div className="mb-4 p-4 bg-islamic-emerald-50 rounded-xl border-2 border-islamic-emerald-200">
                  <div className="flex items-center gap-2 text-islamic-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-bold">Already Enrolled</span>
                  </div>
                </div>
              ) : isFull ? (
                <div className="mb-4 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">Course is Full</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    This course has reached maximum capacity. Please check back later.
                  </p>
                </div>
              ) : missingPrereqs.length > 0 ? (
                <div className="mb-4 p-4 bg-amber-50 rounded-xl border-2 border-amber-200">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Lock className="w-5 h-5" />
                    <span className="font-bold">Prerequisites Required</span>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">
                    Complete {missingPrereqs.length} prerequisite course{missingPrereqs.length > 1 ? 's' : ''} first.
                  </p>
                </div>
              ) : null}

              {/* Action Button */}
              {course.is_enrolled ? (
                <IslamicButton
                  variant="primary"
                  onClick={() => router.push(`/student/courses/${courseId}/learn`)}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continue Learning
                </IslamicButton>
              ) : (
                <IslamicButton
                  variant="primary"
                  onClick={handleEnroll}
                  disabled={!eligibility?.eligible || enrolling}
                  className="w-full"
                >
                  {enrolling ? 'Processing...' : isFreeCourse ? 'Enroll for Free' : 'Pay & Enroll'}
                </IslamicButton>
              )}

              {/* Course Stats */}
              <div className="mt-6 pt-6 border-t border-islamic-gold-200 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-islamic-midnight-600">Enrolled Students</span>
                  <span className="font-bold text-islamic-midnight-800">
                    {currentEnrollment}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-islamic-midnight-600">Capacity</span>
                  <span className="font-bold text-islamic-midnight-800">{maxStudents}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-islamic-midnight-600">Spots Left</span>
                  <span className="font-bold text-islamic-midnight-800">
                    {seatsLeft} spot{seatsLeft !== 1 ? 's' : ''}
                  </span>
                </div>
                {course.weeks && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-islamic-midnight-600">Total Weeks</span>
                    <span className="font-bold text-islamic-midnight-800">{course.weeks.length}</span>
                  </div>
                )}
              </div>
            </IslamicCard>
          </div>
        </div>
      </div>
    </div>
  );
}
