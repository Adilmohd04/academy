'use client'

import { motion } from 'framer-motion'

interface Meeting {
    id: string
    scheduled_date: string
    start_time: string
    course_name: string
    teacher_name: string | null
    status: string
}

interface MeetingListProps {
    meetings: Meeting[]
}

export default function MeetingList({ meetings }: MeetingListProps) {
    if (meetings.length === 0) {
        return null
    }

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">🗓️</span>
                    Upcoming Sessions
                </h2>
                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                    View All
                </button>
            </div>

            <div className="space-y-4">
                {meetings.map((meeting, index) => (
                    <motion.div
                        key={meeting.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100 group-hover:border-indigo-200 transition-colors">
                                🎓
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{meeting.course_name}</h3>
                                <p className="text-sm text-gray-500">with {meeting.teacher_name || 'Instructor'}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">
                                {new Date(meeting.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-lg shadow-sm mt-1 inline-block">
                                {meeting.start_time}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
