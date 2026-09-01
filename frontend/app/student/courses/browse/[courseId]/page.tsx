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
    <>
      <CourseOverviewLayout
        course={course}
        courseId={courseId}
        router={router}
        isFreeCourse={isFreeCourse}
        currentEnrollment={currentEnrollment}
        hasCapacityLimit={hasCapacityLimit}
        maxStudentsRaw={maxStudentsRaw}
        seatsLeft={seatsLeft}
        totalWeeks={totalWeeks}
        hasPrerequisites={hasPrerequisites}
        missingPrereqs={missingPrereqs}
        eligibilityUnavailable={eligibilityUnavailable}
        isFull={isFull}
        canAttemptEnroll={canAttemptEnroll}
        enrolling={enrolling}
        openEnrollment={openEnrollment}
        showEnrollModal={showEnrollModal}
        enrollStep={enrollStep}
        setEnrollStep={setEnrollStep}
        draft={draft}
        setDraft={setDraft}
        closeEnrollment={closeEnrollment}
        proceedEnrollment={proceedEnrollment}
        canSubmitDetails={canSubmitDetails}
      />
      <div className="hidden">
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
      </div>
    </>
  );
}
interface CourseOverviewLayoutProps {
  course: CourseDetail;
  courseId: string;
  router: ReturnType<typeof useRouter>;
  isFreeCourse: boolean;
  currentEnrollment: number;
  hasCapacityLimit: boolean;
  maxStudentsRaw: number | null;
  seatsLeft: number | null;
  totalWeeks: number;
  hasPrerequisites: boolean;
  missingPrereqs: { id: string; title: string }[];
  eligibilityUnavailable: boolean;
  isFull: boolean;
  canAttemptEnroll: boolean;
  enrolling: boolean;
  openEnrollment: () => void;
  showEnrollModal: boolean;
  enrollStep: 'details' | 'confirm';
  setEnrollStep: React.Dispatch<React.SetStateAction<'details' | 'confirm'>>;
  draft: EnrollmentDraft;
  setDraft: React.Dispatch<React.SetStateAction<EnrollmentDraft>>;
  closeEnrollment: () => void;
  proceedEnrollment: () => Promise<void>;
  canSubmitDetails: boolean;
}

function CourseOverviewLayout({
  course,
  courseId,
  router,
  isFreeCourse,
  currentEnrollment,
  hasCapacityLimit,
  maxStudentsRaw,
  seatsLeft,
  totalWeeks,
  hasPrerequisites,
  missingPrereqs,
  eligibilityUnavailable,
  isFull,
  canAttemptEnroll,
  enrolling,
  openEnrollment,
  showEnrollModal,
  enrollStep,
  setEnrollStep,
  draft,
  setDraft,
  closeEnrollment,
  proceedEnrollment,
  canSubmitDetails,
}: CourseOverviewLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e4f3ee_0%,#f8faf7_34%,#f5f7f3_100%)] pb-20 text-[#183b4a]">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <button onClick={() => router.push('/student/courses/browse')} className="group mb-5 inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm font-semibold text-[#668087] transition-colors hover:text-[#183b4a]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d5e5df] bg-white/75 transition-transform duration-200 group-hover:-translate-x-0.5"><ArrowLeft className="h-4 w-4" /></span>
          Back to course library
        </button>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }} className="relative overflow-hidden rounded-[2rem] border border-[#28586a]/35 bg-[#173d4b] shadow-[0_28px_70px_rgba(24,59,74,0.2)]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#f2d78d]/20" />
          <div className="pointer-events-none absolute -bottom-40 left-[42%] h-96 w-96 rounded-full bg-[#2b8c77]/20 blur-3xl" />
          <div className="relative grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
            <div className="p-7 sm:p-10 lg:p-12">
              <div className="mb-7 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#f2d78d]/45 bg-[#f2d78d]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#f8df9f]">{course.category}</span>
                {course.level && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold capitalize text-white/80">{course.level} level</span>}
                {isFreeCourse && <span className="rounded-full border border-[#9de0ba]/40 bg-[#9de0ba]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#baf0cd]">Free enrollment</span>}
              </div>
              <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-[#9dd4c2]"><Sparkles className="h-3.5 w-3.5" /> Your next learning path</p>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-.045em] text-white sm:text-5xl lg:text-[4.35rem]">{course.title}</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{course.description}</p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm"><User className="h-4 w-4 text-[#f2d78d]" /> {course.teacher_name}</span>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm"><Users className="h-4 w-4 text-[#9de0ba]" /> {currentEnrollment}{hasCapacityLimit ? ` / ${maxStudentsRaw}` : ''} learners</span>
              </div>
            </div>

            <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden bg-[#f3e3b9] p-7 sm:min-h-[350px] lg:min-h-full">
              <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(30deg,rgba(23,61,75,.1)_12%,transparent_12.5%,transparent_87%,rgba(23,61,75,.1)_87.5%),linear-gradient(150deg,rgba(23,61,75,.1)_12%,transparent_12.5%,transparent_87%,rgba(23,61,75,.1)_87.5%)] [background-size:34px_58px]" />
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#173d4b]/15" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-[#173d4b]/15" />
              <div className="relative z-10 w-full max-w-sm rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_20px_45px_rgba(23,61,75,.16)] backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173d4b] text-[#f2d78d] shadow-lg"><BookOpen className="h-6 w-6" /></span>
                  <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b48635]">Course pathway</p><p className="mt-1 text-lg font-bold text-[#173d4b]">Learn with intention</p></div>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#edf7f1] p-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6d8784]">Course length</p><p className="mt-1 text-xl font-bold text-[#173d4b]">{totalWeeks || '—'} <span className="text-xs font-semibold text-[#6d8784]">weeks</span></p></div>
                  <div className="rounded-2xl bg-[#fff7df] p-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a77a25]">Your place</p><p className="mt-1 text-xl font-bold text-[#173d4b]">{course.is_enrolled ? 'Ready' : 'Open'}</p></div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#668087]"><ShieldCheck className="h-4 w-4 text-[#2b8c77]" /> A calm, guided learning experience</div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="space-y-6">
            <article className="rounded-[1.5rem] border border-[#dbe9e2] bg-white/90 p-6 shadow-[0_12px_34px_rgba(24,59,74,.06)] sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b48635]">Course overview</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-[#173d4b]">A clear place to begin.</h2></div><span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#e5f4eb] text-[#2b8c77] sm:flex"><BookOpen className="h-5 w-5" /></span></div>
              <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5f767b]">{course.description}</p>
            </article>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                { label: 'Learners', value: currentEnrollment, icon: Users, tone: 'bg-[#e5f4eb] text-[#2b8c77]' },
                { label: 'Capacity', value: hasCapacityLimit ? maxStudentsRaw : 'Open', icon: ShieldCheck, tone: 'bg-[#fff3d4] text-[#b48635]' },
                { label: 'Spots left', value: seatsLeft === null ? 'Open' : seatsLeft, icon: Sparkles, tone: 'bg-[#fbe8ed] text-[#b96880]' },
                { label: 'Course length', value: totalWeeks || '—', icon: BookOpen, tone: 'bg-[#e8eff8] text-[#3c6b93]' },
              ].map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-[1.25rem] border border-[#dbe9e2] bg-white/80 p-4 shadow-[0_8px_20px_rgba(24,59,74,.04)] transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span><p className="mt-4 text-[10px] font-bold uppercase tracking-[.15em] text-[#809093]">{label}</p><p className="mt-1 truncate text-xl font-bold text-[#173d4b] sm:text-2xl">{value}</p></div>)}
            </div>

            {course.weeks && course.weeks.length > 0 && <article className="rounded-[1.5rem] border border-[#dbe9e2] bg-white/90 p-6 shadow-[0_12px_34px_rgba(24,59,74,.06)] sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b48635]">Your learning path</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-[#173d4b]">Course outline</h2></div><span className="rounded-full bg-[#edf7f1] px-3 py-1.5 text-xs font-bold text-[#2b8c77]">{totalWeeks} weeks</span></div><div className="relative mt-7 space-y-3"><div className="absolute bottom-6 left-[1.2rem] top-6 w-px bg-[#cfe4d7]" />{course.weeks.map((week) => <div key={week.id} className="relative flex gap-4 rounded-2xl border border-transparent p-3 transition-colors duration-200 hover:border-[#dbe9e2] hover:bg-[#fbfdfb]"><div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#173d4b] text-sm font-bold text-[#f2d78d] shadow-[0_4px_12px_rgba(23,61,75,.15)]">{week.week_number}</div><div className="min-w-0 pt-1"><h3 className="text-base font-bold text-[#173d4b] sm:text-lg">{week.title}</h3><p className="mt-1 text-sm leading-6 text-[#6c8084]">{week.description || 'A guided step in your learning journey.'}</p></div></div>)}</div></article>}

            {hasPrerequisites && <article className="rounded-[1.5rem] border border-[#dbe9e2] bg-white/90 p-6 shadow-[0_12px_34px_rgba(24,59,74,.06)] sm:p-8"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3d4] text-[#b48635]"><Lock className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b48635]">Before you begin</p><h2 className="mt-1 text-2xl font-semibold text-[#173d4b]">Prerequisites</h2></div></div>{missingPrereqs.length > 0 && <div className="mt-5 rounded-2xl border border-[#f5d5a2] bg-[#fff9eb] p-4 text-sm font-semibold leading-6 text-[#8a641e]">You need to complete {missingPrereqs.length} prerequisite course{missingPrereqs.length > 1 ? 's' : ''} before enrolling.</div>}<div className="mt-5 space-y-3">{course.prerequisites.map((prereq) => { const isCompleted = !missingPrereqs.find((m) => m.id === prereq.id); return <div key={prereq.id} className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${isCompleted ? 'border-[#bfe4ca] bg-[#f0faf3]' : 'border-[#f1c9c9] bg-[#fff5f5]'}`}><div className="flex min-w-0 items-start gap-3">{isCompleted ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#1f9a68]" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#c55b5b]" />}<div><h3 className="font-bold text-[#173d4b]">{prereq.title}</h3><p className="mt-1 text-sm leading-6 text-[#6c8084]">{prereq.description}</p></div></div>{!isCompleted && <button onClick={() => router.push(`/student/courses/browse/${prereq.id}`)} className="shrink-0 rounded-xl bg-[#173d4b] px-3 py-2 text-xs font-bold text-white transition-transform duration-150 hover:-translate-y-0.5 active:scale-[.97]">View</button>}</div>; })}</div></article>}
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start"><div className="overflow-hidden rounded-[1.5rem] border border-[#dbe9e2] bg-[#173d4b] p-6 text-white shadow-[0_20px_45px_rgba(24,59,74,.17)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#f2d78d]">Enrollment</p><p className="mt-2 text-sm text-white/60">Start when you are ready.</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#f2d78d]"><Sparkles className="h-5 w-5" /></span></div><div className="mt-8 border-b border-white/15 pb-6"><p className="text-5xl font-semibold tracking-[-.045em] text-white">{isFreeCourse ? 'Free' : `₹${course.price}`}</p><p className="mt-2 text-sm text-white/55">{isFreeCourse ? 'No payment required' : 'One-time secure payment'}</p></div>{eligibilityUnavailable && !course.is_enrolled && <div className="mt-5 rounded-2xl border border-[#9bd5ed]/30 bg-[#9bd5ed]/10 p-4 text-sm leading-6 text-[#c8efff]">Eligibility check is temporarily unavailable. You can still continue.</div>}{course.is_enrolled ? <div className="mt-5 rounded-2xl border border-[#9de0ba]/30 bg-[#9de0ba]/10 p-4 text-sm font-semibold leading-6 text-[#baf0cd]">You are already enrolled in this course.</div> : isFull ? <div className="mt-5 rounded-2xl border border-[#f2b8b8]/30 bg-[#f2b8b8]/10 p-4 text-sm font-semibold leading-6 text-[#ffd2d2]">Course is currently full.</div> : missingPrereqs.length > 0 ? <div className="mt-5 rounded-2xl border border-[#f2d78d]/30 bg-[#f2d78d]/10 p-4 text-sm font-semibold leading-6 text-[#ffeab0]">Complete prerequisites to unlock enrollment.</div> : null}{course.is_enrolled ? <IslamicButton variant="success" onClick={() => router.push(`/student/courses/${courseId}/learn`)} className="mt-5 h-12 w-full !rounded-2xl !font-bold active:scale-[.98]"><Play className="mr-2 h-4 w-4" /> Continue Learning</IslamicButton> : <IslamicButton variant="gold" onClick={openEnrollment} disabled={!canAttemptEnroll || enrolling} className="mt-5 h-12 w-full !rounded-2xl !font-bold !text-[#173d4b] active:scale-[.98]">{isFreeCourse ? 'Enroll for free' : 'Continue to enrollment'}</IslamicButton>}<div className="mt-6 border-t border-white/15 pt-5 text-sm"><div className="flex items-center justify-between py-2"><span className="text-white/55">Learners</span><span className="font-bold text-white">{currentEnrollment}</span></div><div className="flex items-center justify-between py-2"><span className="text-white/55">Capacity</span><span className="font-bold text-white">{hasCapacityLimit ? maxStudentsRaw : 'Unlimited'}</span></div><div className="flex items-center justify-between py-2"><span className="text-white/55">Spots left</span><span className="font-bold text-[#f2d78d]">{seatsLeft === null ? 'Open enrollment' : seatsLeft}</span></div><div className="flex items-center justify-between py-2"><span className="text-white/55">Course length</span><span className="font-bold text-white">{totalWeeks || '—'} weeks</span></div></div><p className="mt-5 flex items-center gap-2 text-xs text-white/50"><ShieldCheck className="h-4 w-4 text-[#9de0ba]" /> Secure enrollment flow</p></div></aside>
        </div>
      </div>

      {showEnrollModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d3a]/55 p-4 backdrop-blur-md"><div className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-[#dbe9e2] bg-[#fbfdfb] shadow-[0_30px_80px_rgba(16,45,58,.25)]"><div className="flex items-start justify-between border-b border-[#e3ece7] px-6 py-5 sm:px-8"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b48635]">{enrollStep === 'details' ? 'Step 1 of 2' : 'Step 2 of 2'}</p><h3 className="mt-1 text-2xl font-semibold text-[#173d4b]">{enrollStep === 'details' ? 'Tell us about you' : 'Review your enrollment'}</h3><p className="mt-1 text-sm text-[#6b8084]">{course.title}</p></div><button onClick={closeEnrollment} className="rounded-xl p-2 text-[#6b8084] transition-colors hover:bg-[#edf5f0] hover:text-[#173d4b]" disabled={enrolling}><X className="h-5 w-5" /></button></div><div className="p-6 sm:p-8">{enrollStep === 'details' ? <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{([['Full name', 'fullName', 'text'], ['Email', 'email', 'email'], ['Phone number', 'phone', 'text'], ['City', 'city', 'text']] as const).map(([label, key, type]) => <label key={key} className="space-y-1.5 text-sm font-semibold text-[#355d66]">{label}<input type={type} value={draft[key]} onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))} className="w-full rounded-xl border border-[#cfe1d7] bg-white px-3.5 py-3 text-[#173d4b] outline-none transition-shadow focus:border-[#2b8c77] focus:ring-4 focus:ring-[#bfe4ca]/40" /></label>)}</div><label className="block space-y-1.5 text-sm font-semibold text-[#355d66]">Country<input value={draft.country} onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value }))} className="w-full rounded-xl border border-[#cfe1d7] bg-white px-3.5 py-3 text-[#173d4b] outline-none transition-shadow focus:border-[#2b8c77] focus:ring-4 focus:ring-[#bfe4ca]/40" /></label><label className="flex items-start gap-2 text-sm leading-6 text-[#5f767b]"><input type="checkbox" checked={draft.agree} onChange={(e) => setDraft((p) => ({ ...p, agree: e.target.checked }))} className="mt-1.5 accent-[#2b8c77]" /> I confirm my details are correct and agree to the course enrollment terms.</label></div> : <div className="space-y-4"><div className="rounded-2xl border border-[#dbe9e2] bg-white p-5"><div className="flex items-center gap-2 font-bold text-[#173d4b]"><Sparkles className="h-4 w-4 text-[#b48635]" /> Enrollment summary</div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-[#779096]">Name:</span> <span className="font-semibold text-[#173d4b]">{draft.fullName}</span></p><p><span className="text-[#779096]">Email:</span> <span className="font-semibold text-[#173d4b]">{draft.email}</span></p><p><span className="text-[#779096]">Phone:</span> <span className="font-semibold text-[#173d4b]">{draft.phone}</span></p><p><span className="text-[#779096]">Location:</span> <span className="font-semibold text-[#173d4b]">{draft.city}, {draft.country}</span></p><p><span className="text-[#779096]">Course:</span> <span className="font-semibold text-[#173d4b]">{course.title}</span></p><p><span className="text-[#779096]">Amount:</span> <span className="font-semibold text-[#168263]">{isFreeCourse ? 'Free' : `₹${course.price}`}</span></p></div></div><div className="rounded-2xl border border-[#bfe4ca] bg-[#f0faf3] p-4 text-sm leading-6 text-[#277652]"><div className="mb-1 flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> Secure flow</div>{isFreeCourse ? 'After confirmation, you will be enrolled instantly and redirected to your courses.' : 'After confirmation, you will proceed to secure payment and verification.'}</div></div>}</div><div className="flex items-center justify-end gap-3 border-t border-[#e3ece7] px-6 py-5 sm:px-8"><button onClick={() => (enrollStep === 'details' ? closeEnrollment() : setEnrollStep('details'))} disabled={enrolling} className="rounded-xl border border-[#cfe1d7] px-4 py-2.5 text-sm font-semibold text-[#5f767b] transition-colors hover:bg-[#edf5f0]">{enrollStep === 'details' ? 'Cancel' : 'Back'}</button>{enrollStep === 'details' ? <button onClick={() => setEnrollStep('confirm')} disabled={!canSubmitDetails} className="rounded-xl bg-[#173d4b] px-5 py-2.5 text-sm font-bold text-white transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.97]">Continue</button> : <button onClick={proceedEnrollment} disabled={enrolling} className="rounded-xl bg-[#e7b84d] px-5 py-2.5 text-sm font-bold text-[#173d4b] transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.97]">{enrolling ? 'Processing…' : isFreeCourse ? 'Confirm & enroll' : 'Proceed to payment'}</button>}</div></div></div>}
    </div>
  );
}
