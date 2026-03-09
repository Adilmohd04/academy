'use client'

import { useEffect, useState } from 'react'
import { Calendar, Users, DollarSign, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import Card from '@/components/ui/Card'

interface DashboardStats {
  totalCourses: number
  publishedCourses: number
  draftCourses: number
  totalStudents: number
  totalRevenue: number
  pendingApprovals: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of platform activity and metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={<Calendar className="h-8 w-8 text-emerald-600" />}
          trend="+12%"
          trendUp={true}
        />
        <StatsCard
          title="Published Courses"
          value={stats.publishedCourses}
          icon={<CheckCircle className="h-8 w-8 text-green-600" />}
          subtitle={`${stats.draftCourses} drafts`}
        />
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="h-8 w-8 text-blue-600" />}
          trend="+8%"
          trendUp={true}
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-8 w-8 text-purple-600" />}
          trend="+15%"
          trendUp={true}
        />
        <StatsCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          icon={<Clock className="h-8 w-8 text-amber-600" />}
          subtitle="Requires attention"
        />
        <StatsCard
          title="Active Now"
          value="47"
          icon={<TrendingUp className="h-8 w-8 text-teal-600" />}
          subtitle="Users online"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Course Submissions</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Advanced Tajweed Course</p>
                  <p className="text-sm text-gray-600">by Teacher Name</p>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Activity</h2>
          <div className="space-y-4">
            <ActivityItem 
              icon={<CheckCircle className="h-5 w-5 text-green-600" />}
              title="Course Published"
              description="Quran Memorization Basics went live"
              time="5 minutes ago"
            />
            <ActivityItem 
              icon={<Users className="h-5 w-5 text-blue-600" />}
              title="New Enrollment"
              description="15 students enrolled in Arabic Grammar"
              time="12 minutes ago"
            />
            <ActivityItem 
              icon={<DollarSign className="h-5 w-5 text-purple-600" />}
              title="Payment Received"
              description="₹2,500 from student enrollment"
              time="1 hour ago"
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  subtitle 
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  subtitle?: string
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          {icon}
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-600">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </Card>
  )
}

function ActivityItem({
  icon,
  title,
  description,
  time
}: {
  icon: React.ReactNode
  title: string
  description: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600 truncate">{description}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  )
}
