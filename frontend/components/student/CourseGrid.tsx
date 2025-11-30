'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface Course {
    id: string
    title: string
    description: string
    price: number
    duration_weeks: number
    thumbnail_url?: string
}

interface CourseGridProps {
    courses: Course[]
}

export default function CourseGrid({ courses }: CourseGridProps) {
    if (courses.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-900">No Courses Available</h3>
                <p className="text-gray-500 mt-2">Check back soon for new learning opportunities.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, index) => (
                <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-300"
                >
                    <div className="relative h-48 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 mix-blend-multiply opacity-90 z-10" />
                        {course.thumbnail_url ? (
                            <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-4xl">📖</span>
                            </div>
                        )}
                        <div className="absolute bottom-4 left-4 z-20">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/30">
                                {course.duration_weeks} Weeks
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {course.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">
                            {course.description}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Price</span>
                                <span className="text-xl font-bold text-gray-900">₹{course.price}</span>
                            </div>
                            <Link
                                href="/student/meetings/select-teacher"
                                className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-indigo-500/30"
                            >
                                Enroll Now
                            </Link>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
