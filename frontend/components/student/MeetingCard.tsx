'use client'

import { motion } from 'framer-motion'

interface Meeting {
    id: string
    scheduled_date: string
    start_time: string
    end_time: string
    course_name: string
    teacher_name: string | null
    status: string
    payment_status: string
    meeting_link: string | null
    notes_link: string | null
}

interface MeetingCardProps {
    meeting: Meeting
    isPast?: boolean
}

export default function MeetingCard({ meeting, isPast = false }: MeetingCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200'
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 ${isPast ? 'opacity-75 grayscale-[0.5]' : ''}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isPast ? 'bg-gray-100' : 'bg-indigo-50 text-indigo-600'}`}>
                        {isPast ? '📚' : '🎓'}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{meeting.course_name}</h3>
                        <p className="text-sm text-gray-500">with {meeting.teacher_name || 'Instructor'}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(meeting.status)}`}>
                    {meeting.status.toUpperCase()}
                </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center text-gray-600 text-sm">
                    <span className="w-5 mr-2">📅</span>
                    <span className="font-medium">
                        {new Date(meeting.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                    <span className="w-5 mr-2">⏰</span>
                    <span className="font-medium">{meeting.start_time} - {meeting.end_time}</span>
                </div>
            </div>

            {!isPast && meeting.status === 'confirmed' && (
                <div className="space-y-3">
                    {meeting.meeting_link ? (
                        <a
                            href={meeting.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2.5 bg-indigo-600 text-white text-center rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Join Meeting
                        </a>
                    ) : (
                        <button disabled className="block w-full py-2.5 bg-gray-100 text-gray-400 text-center rounded-xl font-semibold cursor-not-allowed">
                            Link Available Soon
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    )
}
