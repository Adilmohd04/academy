'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { IslamicLoader } from '@/components/ui/IslamicLoader';
import { QuoteOfTheDay } from '@/components/student/QuoteOfTheDay';

interface StudentDashboardClientProps {
  user: any;
  initialData: any;
}

// Convert 24h to 12h format
const formatTime12h = (time24: string) => {
  if (!time24) return '--:--';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${period}`;
};

export default function StudentDashboardClient({ user: initialUser, initialData }: StudentDashboardClientProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="text-center">
          <IslamicLoader size="lg" className="mx-auto mb-6" />
          <p className="text-[#1B365D] font-arabic text-lg">جار التحميل...</p>
        </div>
      </div>
    );
  }

  const allMeetings = initialData?.meetings || [];
  const upcomingList = allMeetings.filter((m: any) => 
    ['assigned', 'pending_assignment', 'paid', 'pending', 'scheduled', 'confirmed'].includes(m.status)
  );
  
  // Sort by date/time to get the absolute next session
  const nextSession = upcomingList.sort((a: any, b: any) => {
    const dateA = new Date(`${a.meeting_date}T${a.start_time}`);
    const dateB = new Date(`${b.meeting_date}T${b.start_time}`);
    return dateA.getTime() - dateB.getTime();
  })[0];

  const otherUpcoming = upcomingList.filter((m: any) => m.id !== nextSession?.id);

  const uniqueCourses = (initialData?.courses || []).filter((course: any, index: number, arr: any[]) => {
    const title = String(course?.title || '').trim().toLowerCase();
    const teacher = String(course?.teacher_name || '').trim().toLowerCase();
    const firstMatchIndex = arr.findIndex((candidate: any) => {
      return String(candidate?.title || '').trim().toLowerCase() === title
        && String(candidate?.teacher_name || '').trim().toLowerCase() === teacher;
    });
    return firstMatchIndex === index;
  });

  return (
    <div className="max-w-5xl mx-auto pt-8 px-4">
      {/* Header & Quote */}
      <div className="grid md:grid-cols-2 gap-8 mb-12 items-stretch">
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-serif text-[#1B365D] mb-4 font-bold leading-tight">
            <span className="text-[#C5A059]">السلام عليكم</span>, <br/> 
            <span className="text-3xl text-[#1B365D]">{user?.firstName}</span>
          </h1>
          <p className="text-[#64748B] font-medium text-lg leading-relaxed">
            Welcome to your garden of knowledge. May your journey be blessed with light and understanding.
          </p>
        </div>
        <div className="h-full">
          <QuoteOfTheDay />
        </div>
      </div>

      {/* Primary Focus: Next Session */}
      <div className="mb-16">
        <h2 className="text-sm font-bold text-[#C5A059] uppercase tracking-widest mb-6">Next Journey</h2>
        
        {nextSession ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#E2E8F0] rounded-3xl p-8 md:p-12 shadow-xl shadow-[#1B365D]/5 relative overflow-hidden group hover:shadow-2xl transition-all"
          >
            {/* Decorative Pattern */}
            <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231B365D' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Decorative Arch */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="mb-8">
                <span className="inline-block px-4 py-1.5 bg-[#F0F7F4] border border-[#D1E7DD] text-[#10B981] rounded-full text-sm font-bold uppercase tracking-wider mb-4 shadow-sm">
                  Upcoming Session
                </span>
                <h3 className="text-4xl md:text-5xl font-serif text-[#1B365D] mb-4 leading-tight">
                  {nextSession.topic || 'Upcoming Lesson'}
                </h3>
                <p className="text-[#64748B] text-xl">
                  with <span className="text-[#10B981] font-serif italic font-bold">{nextSession.teacher_name || 'Your Teacher'}</span>
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-8 mb-10 text-[#1B365D]">
                <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm">
                  <Calendar className="w-6 h-6 text-[#10B981]" />
                  <span className="text-lg font-medium">
                    {new Date(nextSession.meeting_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-[#E2E8F0] shadow-sm">
                  <Clock className="w-6 h-6 text-[#10B981]" />
                  <span className="text-lg font-medium">
                    {formatTime12h(nextSession.start_time)} - {formatTime12h(nextSession.end_time)}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                {nextSession.meeting_link ? (
                  <a 
                    href={nextSession.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-[#10B981] text-white rounded-2xl font-bold hover:bg-[#059669] transition-all shadow-lg shadow-[#10B981]/20"
                  >
                    <Video className="w-5 h-5" />
                    Join Class
                  </a>
                ) : (
                  <button disabled className="inline-flex items-center gap-3 px-8 py-4 bg-[#F1F5F9] text-[#94A3B8] rounded-2xl font-bold cursor-not-allowed">
                    <Video className="w-5 h-5" />
                    Link Pending
                  </button>
                )}
                
                <Link 
                  href={`/student/meetings/${nextSession.id}`}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-[#E2E8F0] text-[#1B365D] rounded-2xl font-bold hover:bg-[#F0F7F4] hover:border-[#10B981]/30 transition-all"
                >
                  Details
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border-[3px] border-[#F0F4F8] rounded-3xl p-12 text-center"
          >
            <div className="w-20 h-20 bg-[#FDFBF7] rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-[#C5A059]" />
            </div>
            <h3 className="text-2xl font-serif text-[#1B365D] mb-2">Your garden is quiet</h3>
            <p className="text-[#64748B] mb-8">No upcoming lessons scheduled.</p>
            <Link 
              href="/student/meetings/select-teacher"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#1B365D] text-white rounded-2xl font-bold hover:bg-[#152C4E] transition-all shadow-lg shadow-[#1B365D]/20"
            >
              Book a Session <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        )}
      </div>

      {/* Secondary Section: Course Combination / Recommended Paths */}
      {uniqueCourses.length > 0 && (
        <div className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-sm font-bold text-[#C5A059] uppercase tracking-widest">Course Combinations</h2>
            <Link href="/student/courses/browse" className="text-sm font-bold text-[#1B365D] hover:text-[#10B981] transition-colors flex items-center gap-1">
              Browse All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {uniqueCourses.slice(0, 2).map((course: any) => (
              <Link key={course.id} href={`/student/courses/browse/${course.id}`} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:shadow-lg hover:border-[#10B981]/30 transition-all group flex gap-5 items-center">
                <div className="w-20 h-20 rounded-xl bg-[#FDFBF7] flex items-center justify-center border border-[#E2E8F0] shrink-0 overflow-hidden relative">
                  {course.course_image_url || course.thumbnail_url ? (
                    <img src={course.course_image_url || course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <BookOpen className="w-10 h-10 text-[#C5A059]/40" />
                  )}
                  {course.price === 0 && (
                    <div className="absolute bottom-0 w-full bg-[#10B981] text-white text-[10px] font-bold text-center py-0.5">FREE</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981] bg-[#F0F7F4] border border-[#D1E7DD] px-2 py-0.5 rounded-md">
                      {course.level || 'beginner'}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg text-[#1B365D] group-hover:text-[#10B981] transition-colors font-bold line-clamp-1">
                    {course.title || 'Course'}
                  </h4>
                  <p className="text-xs text-[#64748B] line-clamp-1 mt-1 font-medium bg-[#FDFBF7] px-2 py-1 rounded inline-block">
                    Taught by {course.teacher_name || 'Teacher'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tertiary Section: Upcoming */}
      {otherUpcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-[#C5A059] uppercase tracking-widest mb-6">Future Growth</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {otherUpcoming.map((meeting: any) => (
              <div key={meeting.id} className="bg-white border border-[#F0F4F8] rounded-2xl p-6 hover:border-[#C5A059]/30 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-serif text-xl text-[#1B365D] group-hover:text-[#C5A059] transition-colors">
                      {meeting.topic || 'Lesson'}
                    </h4>
                    <p className="text-sm text-[#64748B]">with {meeting.teacher_name}</p>
                  </div>
                  <div className="bg-[#FDFBF7] px-3 py-1 rounded-lg text-xs font-bold text-[#1B365D] uppercase tracking-wide">
                    {meeting.status}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-[#1B365D] font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#C5A059]" />
                    <span>{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#C5A059]" />
                    <span>{formatTime12h(meeting.start_time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
