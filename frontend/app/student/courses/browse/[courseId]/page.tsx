'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  Users,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Play,
  Lock,
  Sparkles,
  BookOpen,
  ShieldCheck,
  X,
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
  level?: string;
  price: number;
  max_students?: number | null;
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

interface EnrollmentDraft {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  agree: boolean;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [eligibilityUnavailable, setEligibilityUnavailable] = useState(false);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState<'details' | 'confirm'>('details');
  const [draft, setDraft] = useState<EnrollmentDraft>({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    country: 'India',
    agree: false,
  });

  useEffect(() => {
    if (user) {
      setDraft((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || '',
        email: prev.email || user.primaryEmailAddress?.emailAddress || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (courseId) {
      loadCoursePage();
    }
  }, [courseId]);

  const loadCoursePage = async () => {
    setLoading(true);
    const hasCourse = await fetchCourseDetails();
    if (hasCourse) {
      await checkEligibility();
    }
    setLoading(false);
  };

  const fetchCourseDetails = async (): Promise<boolean> => {
    try {
      const token = await getToken();
      const response = await api.student.getCourseDetails(courseId, token);

      if (response.data.success) {
        setCourse(response.data.course);
        return true;
      }
      setCourse(null);
      toast.error('Failed to load course details');
      return false;
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        setCourse(null);
        return false;
      }
      console.error('Error fetching course:', error);
      toast.error('Error loading course');
      setCourse(null);
      return false;
    }
  };

  const checkEligibility = async () => {
    try {
      setEligibilityUnavailable(false);
      const token = await getToken();
      const response = await api.student.checkEligibility(courseId, token);

      if (response.data.success) {
        setEligibility(response.data.eligibility);
      }
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status !== 404) {
        console.error('Error checking eligibility:', error);
      }
      setEligibility(null);
      setEligibilityUnavailable(true);
    }
  };

  const missingPrereqs = eligibility?.missing_prerequisites || [];
  const hasPrerequisites = !!(course?.prerequisites && course.prerequisites.length > 0);
  const maxStudentsRaw = eligibility?.max_students ?? course?.max_students ?? null;
  const currentEnrollment = eligibility?.current_enrollment ?? course?.enrolled_count ?? 0;
  const hasCapacityLimit = typeof maxStudentsRaw === 'number' && maxStudentsRaw > 0;
  const seatsLeft = hasCapacityLimit ? Math.max(maxStudentsRaw - currentEnrollment, 0) : null;
  const isFull = hasCapacityLimit ? currentEnrollment >= maxStudentsRaw : false;
  const blockedByPrereqs = eligibility ? missingPrereqs.length > 0 : false;
  const canAttemptEnroll = !!course && !course.is_enrolled && !blockedByPrereqs && !isFull;
  const isFreeCourse = !course?.price || course.price <= 0;
  const totalWeeks = course?.weeks?.length || 0;

  const canSubmitDetails = useMemo(() => {
    const phoneDigits = draft.phone.replace(/\D/g, '');
    return (
      draft.fullName.trim().length >= 3
      && /^\S+@\S+\.\S+$/.test(draft.email.trim())
      && phoneDigits.length >= 8
      && draft.city.trim().length >= 2
      && draft.country.trim().length >= 2
      && draft.agree
    );
  }, [draft]);

  const openEnrollment = () => {
    if (!canAttemptEnroll) {
      if (eligibility && !eligibility.eligible) {
        toast.error(eligibility.reason || 'You are not eligible for this course');
      }
      return;
    }
    setEnrollStep('details');
    setShowEnrollModal(true);
  };

  const closeEnrollment = () => {
    if (enrolling) return;
    setShowEnrollModal(false);
  };

  const proceedEnrollment = async () => {
    if (!course) return;

    if (eligibility && !eligibility.eligible) {
      toast.error(eligibility?.reason || 'You are not eligible for this course');
      return;
    }

    if (isFreeCourse) {
      try {
        setEnrolling(true);
        const token = await getToken();
        await api.student.enrollInCourse(courseId, token);
        toast.success('Enrollment successful. Welcome to your course!');
        setShowEnrollModal(false);
        router.push('/student/courses');
      } catch (error) {
        console.error('Error enrolling in free course:', error);
        const message = (error as any)?.response?.data?.error || (error as any)?.response?.data?.message;
        toast.error(message || 'Could not enroll right now. Please try again.');
      } finally {
        setEnrolling(false);
      }
      return;
    }

    const params = new URLSearchParams({
      mode: 'course',
      course_id: course.id,
      amount: String(course.price),
      topic: course.title,
      description: 'Course Enrollment',
      student_name: draft.fullName,
      student_email: draft.email,
      student_phone: draft.phone,
      student_city: draft.city,
      student_country: draft.country,
    });

    setShowEnrollModal(false);
    router.push(`/student/payment?${params.toString()}`);
  };

  if (loading) {
    return <IslamicPageLoader message="Preparing your enrollment page..." arabicMessage="جاري تجهيز صفحة التسجيل..." />;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eff8ff_0%,#f9fbff_35%,#f5f8fc_100%)] pb-16">
      <div className="px-5 md:px-8 pt-8">
        <div className="max-w-7xl mx-auto rounded-[30px] border border-[#d5e3f1] bg-[linear-gradient(120deg,#102d4f_0%,#17517d_50%,#167067_100%)] text-white px-7 py-10 shadow-[0_25px_60px_rgba(16,44,77,0.28)]">
          <button
            onClick={() => router.push('/student/courses/browse')}
            className="inline-flex items-center gap-2 text-white/85 hover:text-white mb-7"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </button>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap gap-2.5 mb-5">
              <span className="px-3 py-1 rounded-full border border-white/35 bg-white/15 text-sm font-semibold capitalize">
                {course.category}
              </span>
              {course.level && (
                <span className="px-3 py-1 rounded-full border border-white/25 bg-white/10 text-sm font-medium capitalize">
                  {course.level}
                </span>
              )}
              {isFreeCourse && (
                <span className="px-3 py-1 rounded-full border border-emerald-300/45 bg-emerald-300/20 text-xs font-bold uppercase tracking-wider">
                  Free Enrollment
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold leading-tight max-w-5xl mb-4">{course.title}</h1>
            <p className="text-[#d8e8f6] max-w-4xl text-base md:text-lg leading-relaxed mb-5">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[#d5e6f5]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <User className="w-4 h-4" />
                {course.teacher_name}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <Users className="w-4 h-4" />
                {currentEnrollment}{hasCapacityLimit ? ` / ${maxStudentsRaw}` : ''} students
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 mt-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-8">
          <section className="space-y-6">
            <IslamicCard className="bg-white border border-[#d9e6f2] rounded-3xl shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
              <h2 className="text-[30px] leading-tight font-bold text-[#14365a] mb-5">About This Course</h2>
              <p className="text-[17px] leading-8 text-[#425c76]">{course.description}</p>
            </IslamicCard>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#dbe9f5] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Enrolled</p>
                <p className="text-2xl font-bold text-[#14365a]">{currentEnrollment}</p>
              </div>
              <div className="rounded-2xl border border-[#dbe9f5] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Capacity</p>
                <p className="text-2xl font-bold text-[#14365a]">{hasCapacityLimit ? maxStudentsRaw : 'Unlimited'}</p>
              </div>
              <div className="rounded-2xl border border-[#dbe9f5] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Spots Left</p>
                <p className="text-2xl font-bold text-[#14365a]">{seatsLeft === null ? 'Open' : seatsLeft}</p>
              </div>
              <div className="rounded-2xl border border-[#dbe9f5] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total Weeks</p>
                <p className="text-2xl font-bold text-[#14365a]">{totalWeeks}</p>
              </div>
            </div>

            {hasPrerequisites && (
              <IslamicCard className="bg-white border border-[#d9e6f2] rounded-3xl shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <h2 className="text-2xl font-bold text-[#14365a] mb-4 flex items-center gap-2">
                  <Lock className="w-6 h-6" />
                  Prerequisites
                </h2>

                {missingPrereqs.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800 font-semibold">You need to complete {missingPrereqs.length} prerequisite course{missingPrereqs.length > 1 ? 's' : ''} before enrolling.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {course.prerequisites.map((prereq) => {
                    const isCompleted = !missingPrereqs.find((m) => m.id === prereq.id);
                    return (
                      <div
                        key={prereq.id}
                        className={`rounded-xl border p-4 ${isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-700" /> : <XCircle className="w-5 h-5 text-red-700" />}
                              <h3 className="font-bold text-[#14365a]">{prereq.title}</h3>
                            </div>
                            <p className="text-sm text-[#536d85] ml-7">{prereq.description}</p>
                          </div>
                          {!isCompleted && (
                            <button
                              onClick={() => router.push(`/student/courses/browse/${prereq.id}`)}
                              className="px-3 py-1.5 rounded-lg bg-[#1b4f87] text-white text-sm font-semibold hover:bg-[#163f6a]"
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

            {course.weeks && course.weeks.length > 0 && (
              <IslamicCard className="bg-white border border-[#d9e6f2] rounded-3xl shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <h2 className="text-[30px] font-bold text-[#14365a] mb-5">Course Outline</h2>
                <div className="space-y-3.5">
                  {course.weeks.map((week) => (
                    <div key={week.id} className="rounded-2xl border border-[#deecf8] bg-[#fbfdff] px-4 py-5 hover:border-[#bcd4ec]">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-[#14365a] text-white flex items-center justify-center font-bold text-sm">
                          {week.week_number}
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-[#14365a] mb-1">{week.title}</h3>
                          <p className="text-sm text-[#556f87]">{week.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </IslamicCard>
            )}
          </section>

          <aside className="xl:sticky xl:top-8 xl:self-start">
            <IslamicCard className="bg-white border border-[#d9e6f2] rounded-3xl shadow-[0_16px_38px_rgba(15,23,42,0.11)]">
              <div className="text-center pb-6 mb-6 border-b border-[#e4edf6]">
                <p className="text-5xl font-bold text-[#0c7a52] leading-none mb-2">{isFreeCourse ? 'Free' : `₹${course.price}`}</p>
                <p className="text-sm text-[#5e748b]">{isFreeCourse ? 'No payment required' : 'One-time secure payment'}</p>
              </div>

              {eligibilityUnavailable && !course.is_enrolled && (
                <div className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm">
                  Eligibility check is temporarily unavailable. You can still continue.
                </div>
              )}

              {course.is_enrolled ? (
                <div className="mb-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold">
                  You are already enrolled in this course.
                </div>
              ) : isFull ? (
                <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 font-semibold">
                  Course is currently full.
                </div>
              ) : missingPrereqs.length > 0 ? (
                <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-semibold">
                  Complete prerequisites to unlock enrollment.
                </div>
              ) : null}

              {course.is_enrolled ? (
                <IslamicButton
                  variant="primary"
                  onClick={() => router.push(`/student/courses/${courseId}/learn`)}
                  className="w-full !h-12 !font-bold"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continue Learning
                </IslamicButton>
              ) : (
                <IslamicButton
                  variant="primary"
                  onClick={openEnrollment}
                  disabled={!canAttemptEnroll || enrolling}
                  className="w-full !h-12 !font-bold"
                >
                  {isFreeCourse ? 'Enroll for Free' : 'Proceed to Payment'}
                </IslamicButton>
              )}

              <div className="mt-6 pt-6 border-t border-[#e4edf6] space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[#5f768d]">Enrolled Students</span><span className="font-bold text-[#14365a]">{currentEnrollment}</span></div>
                <div className="flex justify-between"><span className="text-[#5f768d]">Capacity</span><span className="font-bold text-[#14365a]">{hasCapacityLimit ? maxStudentsRaw : 'Unlimited'}</span></div>
                <div className="flex justify-between"><span className="text-[#5f768d]">Spots Left</span><span className="font-bold text-[#14365a]">{seatsLeft === null ? 'Open enrollment' : seatsLeft}</span></div>
                <div className="flex justify-between"><span className="text-[#5f768d]">Total Weeks</span><span className="font-bold text-[#14365a]">{totalWeeks}</span></div>
              </div>
            </IslamicCard>
          </aside>
        </div>
      </div>

      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#d6e4f0] shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e5edf6] flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-[#14365a]">{enrollStep === 'details' ? 'Enrollment Details' : 'Confirm Enrollment'}</h3>
                <p className="text-sm text-[#5f768d]">{course.title}</p>
              </div>
              <button onClick={closeEnrollment} className="p-2 rounded-full hover:bg-slate-100" disabled={enrolling}>
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              {enrollStep === 'details' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-1 text-sm font-semibold text-[#35516d]">
                      Full Name
                      <input value={draft.fullName} onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))} className="w-full rounded-xl border border-[#d4e2ef] px-3 py-2.5 text-[#123455]" />
                    </label>
                    <label className="space-y-1 text-sm font-semibold text-[#35516d]">
                      Email
                      <input type="email" value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-[#d4e2ef] px-3 py-2.5 text-[#123455]" />
                    </label>
                    <label className="space-y-1 text-sm font-semibold text-[#35516d]">
                      Phone Number
                      <input value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border border-[#d4e2ef] px-3 py-2.5 text-[#123455]" />
                    </label>
                    <label className="space-y-1 text-sm font-semibold text-[#35516d]">
                      City
                      <input value={draft.city} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))} className="w-full rounded-xl border border-[#d4e2ef] px-3 py-2.5 text-[#123455]" />
                    </label>
                  </div>

                  <label className="space-y-1 text-sm font-semibold text-[#35516d] block">
                    Country
                    <input value={draft.country} onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value }))} className="w-full rounded-xl border border-[#d4e2ef] px-3 py-2.5 text-[#123455]" />
                  </label>

                  <label className="flex items-start gap-2 text-sm text-[#4d657e] mt-2">
                    <input type="checkbox" checked={draft.agree} onChange={(e) => setDraft((p) => ({ ...p, agree: e.target.checked }))} className="mt-1" />
                    I confirm my details are correct and agree to course enrollment terms.
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#dce8f3] bg-[#f8fbff] p-4">
                    <div className="flex items-center gap-2 text-[#14365a] font-semibold mb-2">
                      <Sparkles className="w-4 h-4" />
                      Enrollment Summary
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                      <p><span className="text-[#58708a]">Name:</span> <span className="font-semibold text-[#123455]">{draft.fullName}</span></p>
                      <p><span className="text-[#58708a]">Email:</span> <span className="font-semibold text-[#123455]">{draft.email}</span></p>
                      <p><span className="text-[#58708a]">Phone:</span> <span className="font-semibold text-[#123455]">{draft.phone}</span></p>
                      <p><span className="text-[#58708a]">Location:</span> <span className="font-semibold text-[#123455]">{draft.city}, {draft.country}</span></p>
                      <p><span className="text-[#58708a]">Course:</span> <span className="font-semibold text-[#123455]">{course.title}</span></p>
                      <p><span className="text-[#58708a]">Amount:</span> <span className="font-semibold text-[#0c7a52]">{isFreeCourse ? 'Free' : `₹${course.price}`}</span></p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-semibold mb-1"><ShieldCheck className="w-4 h-4" /> Secure Flow</div>
                    {isFreeCourse
                      ? 'After confirmation, you will be enrolled instantly and redirected to your courses.'
                      : 'After confirmation, you will proceed to secure payment and verification.'}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-[#e5edf6] flex items-center justify-end gap-3">
              <button
                onClick={() => (enrollStep === 'details' ? closeEnrollment() : setEnrollStep('details'))}
                disabled={enrolling}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {enrollStep === 'details' ? 'Cancel' : 'Back'}
              </button>

              {enrollStep === 'details' ? (
                <button
                  onClick={() => setEnrollStep('confirm')}
                  disabled={!canSubmitDetails}
                  className="px-5 py-2.5 rounded-xl bg-[#184d86] text-white font-semibold hover:bg-[#133f6d] disabled:opacity-50"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={proceedEnrollment}
                  disabled={enrolling}
                  className="px-5 py-2.5 rounded-xl bg-[#0c7a52] text-white font-semibold hover:bg-[#096443] disabled:opacity-50"
                >
                  {enrolling ? 'Processing...' : isFreeCourse ? 'Confirm & Enroll' : 'Proceed to Payment'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
