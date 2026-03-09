'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Calendar, Trophy, TrendingUp } from 'lucide-react'
import Card from '@/components/ui/Card'

interface DashboardStats {
  enrolledCourses: number
  totalMeetings: number
  upcomingMeetings: number
  completedCourses: number
}

interface CourseProgress {
  courseId: string
  courseTitle: string
  progress: number
  thumbnail?: string
}

export default function StudentDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    totalMeetings: 0,
    upcomingMeetings: 0,
    completedCourses: 0
  })
  const [courses, setCourses] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Failed to fetch dashboard')

      const data = await res.json()
      setStats(data.overall_stats || stats)
      setCourses(data.courses || [])
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your learning progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enrolled Courses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.enrolledCourses}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalMeetings}</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-full">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcomingMeetings}</p>
              </div>
              <div className="bg-emerald-100 p-4 rounded-full">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedCourses}</p>
              </div>
              <div className="bg-amber-100 p-4 rounded-full">
                <Trophy className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Course Progress */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Courses</h2>
          {courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.courseId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{course.courseTitle}</h3>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-sm font-medium text-gray-600">{course.progress}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No enrolled courses yet</p>
          )}
        </Card>
      </div>
    </div>
  )
}
