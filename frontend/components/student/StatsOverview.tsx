'use client'

import { motion } from 'framer-motion'

interface StatsOverviewProps {
    stats: {
        enrolledCourses: number
        totalMeetings: number
        upcomingMeetings: number
    }
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
    const cards = [
        {
            label: 'Enrolled Courses',
            value: stats.enrolledCourses,
            icon: '📚',
            color: 'from-blue-500 to-cyan-500',
            bg: 'bg-blue-50',
            text: 'text-blue-600'
        },
        {
            label: 'Total Sessions',
            value: stats.totalMeetings,
            icon: '🎓',
            color: 'from-purple-500 to-pink-500',
            bg: 'bg-purple-50',
            text: 'text-purple-600'
        },
        {
            label: 'Upcoming',
            value: stats.upcomingMeetings,
            icon: '✨',
            color: 'from-emerald-500 to-teal-500',
            bg: 'bg-emerald-50',
            text: 'text-emerald-600'
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cards.map((card, index) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-500`} />

                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
                            <h3 className={`text-3xl font-bold ${card.text}`}>{card.value}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                            {card.icon}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
