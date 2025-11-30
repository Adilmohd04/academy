'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, BookOpen, Video, Award, Clock, UserCheck } from 'lucide-react';
import Link from 'next/link';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-arabic">جار التحميل...</p>
        </div>
      </div>
    );
  }

  const upcomingMeetings = initialData?.meetings || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Islamic Pattern Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}/>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Islamic Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* User Profile Image */}
              {user?.imageUrl && (
                <img 
                  src={user.imageUrl} 
                  alt={user.firstName || 'User'} 
                  className="w-16 h-16 rounded-full border-4 border-emerald-200 shadow-lg"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  <span className="font-arabic">السلام عليكم،</span> {user?.firstName}
                </h1>
                <p className="text-gray-600">Welcome to your Islamic learning journey</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/student/meetings/select-teacher"
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                📚 Book New Session
              </Link>
              {/* Clerk User Button for Profile/Logout */}
              <div className="scale-110">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-12 h-12",
                      userButtonPopoverCard: "bg-white shadow-xl border border-gray-200",
                      userButtonPopoverActionButton: "hover:bg-emerald-50",
                    }
                  }}
                  afterSignOutUrl="/"
                />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingMeetings.length}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Sessions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Upcoming Sessions
              </h2>
              <Link href="/student/meetings" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                View All →
              </Link>
            </div>

            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Upcoming Sessions</h3>
                <p className="text-gray-600 mb-4">Start your learning journey by booking your first session</p>
                <Link
                  href="/student/meetings/select-teacher"
                  className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Book Session
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMeetings.map((meeting: any, index: number) => (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push('/student/meetings')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{meeting.topic || 'Islamic Studies Session'}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('en-IN', { 
                              timeZone: 'Asia/Kolkata',
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'Date pending'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime12h(meeting.start_time)} - {formatTime12h(meeting.end_time)}
                          </span>
                        </div>
                        {meeting.teacher_name && (
                          <p className="text-sm text-gray-500 mt-2">Teacher: {meeting.teacher_name}</p>
                        )}
                        {(meeting.resource_link || meeting.notes_link) && (
                          <div className="mt-2 flex flex-wrap gap-3">
                            {meeting.resource_link && (
                              <a
                                href={meeting.resource_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                📁 Resources
                              </a>
                            )}
                            {meeting.notes_link && (
                              <a
                                href={meeting.notes_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                              >
                                📝 Notes
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        meeting.status === 'approved' || meeting.status === 'assigned'
                          ? 'bg-green-100 text-green-700'
                          : meeting.status === 'pending' || meeting.status === 'pending_assignment'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {meeting.status === 'pending_assignment' ? 'Pending Assignment' : meeting.status || 'Pending'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
            {/* Study Resources */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Study Resources
              </h2>
              <Link
                href="/student/resources"
                className="block p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg hover:shadow-md transition-all border border-emerald-100 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">View Materials</p>
                    <p className="text-sm text-gray-600">Access notes & resources</p>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Islamic Quote */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-lg font-arabic text-center mb-4 leading-relaxed">
                "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ"
              </p>
              <p className="text-sm text-center text-emerald-100 italic">
                "Seeking knowledge is obligatory upon every Muslim"
              </p>
              <p className="text-xs text-center text-emerald-200 mt-2">- Prophet Muhammad ﷺ</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
