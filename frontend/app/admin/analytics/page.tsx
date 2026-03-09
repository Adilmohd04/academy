/**
 * Islamic Admin Analytics Page
 * Comprehensive analytics with charts and insights
 */

'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, GraduationCap, Video, DollarSign,
  Calendar, Award, BookOpen, Target, Activity
} from 'lucide-react';
import { IslamicCard, IslamicStatCard } from '@/components/ui/IslamicCards';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { IslamicButton } from '@/components/ui/IslamicButtons';

export default function IslamicAdminAnalytics() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days');
  const [analyticsData, setAnalyticsData] = useState({
    studentGrowth: 156,
    teacherActivity: 89,
    meetingCompletion: 94,
    averageRating: 4.7,
    totalRevenue: 45600,
    enrollmentTrend: '+23%',
  });

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => setLoading(false), 800);
  }, [dateRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-islamic-primary-200 border-t-islamic-primary-600 mx-auto mb-4"></div>
          <p className="text-islamic-primary-700 font-semibold">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-emerald-50">
      <IslamicPatternBackground pattern="arabesque" opacity={0.03}>
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-islamic-primary-900 mb-2">Analytics Dashboard</h1>
                <p className="text-gray-600">Comprehensive insights and performance metrics</p>
              </div>
              
              {/* Date Range Selector */}
              <div className="flex gap-2">
                {['7days', '30days', '90days', 'year'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      dateRange === range
                        ? 'bg-gradient-to-r from-islamic-primary-600 to-islamic-emerald-600 text-white shadow-lg'
                        : 'bg-white text-gray-600 hover:bg-islamic-sand-100'
                    }`}
                  >
                    {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : range === '90days' ? '90 Days' : 'Year'}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <IslamicStatCard
                icon={Users}
                label="Student Growth"
                value={analyticsData.studentGrowth}
                iconColor="text-islamic-emerald-600"
                iconBg="bg-islamic-emerald-50"
                trend="up"
                trendValue={analyticsData.enrollmentTrend}
              />
              <IslamicStatCard
                icon={GraduationCap}
                label="Teacher Activity"
                value={`${analyticsData.teacherActivity}%`}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
                subtext="Average engagement"
              />
              <IslamicStatCard
                icon={Video}
                label="Meeting Completion"
                value={`${analyticsData.meetingCompletion}%`}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
                trend="up"
                trendValue="+8%"
              />
              <IslamicStatCard
                icon={Award}
                label="Average Rating"
                value={analyticsData.averageRating}
                iconColor="text-islamic-gold-600"
                iconBg="bg-islamic-gold-50"
                subtext="Student feedback"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Enrollment Trend */}
              <IslamicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-islamic-primary-900">Student Enrollment Trend</h3>
                    <p className="text-sm text-gray-500 mt-1">Monthly growth over time</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                
                {/* Line Chart Placeholder */}
                <div className="h-80 bg-gradient-to-br from-islamic-sand-50 to-islamic-emerald-50 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-20 h-20 text-islamic-primary-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <p className="text-gray-600 font-semibold">Line Chart</p>
                    <p className="text-sm text-gray-400 mt-2">Recharts/Chart.js integration</p>
                    <div className="mt-4 flex items-center justify-center gap-8 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-islamic-emerald-500"></div>
                        <span className="text-gray-600">Enrollments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-islamic-gold-500"></div>
                        <span className="text-gray-600">Active Students</span>
                      </div>
                    </div>
                  </div>
                </div>
              </IslamicCard>

              {/* Teacher Performance */}
              <IslamicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-islamic-primary-900">Teacher Performance</h3>
                    <p className="text-sm text-gray-500 mt-1">Activity by teacher</p>
                  </div>
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                </div>
                
                {/* Bar Chart Placeholder */}
                <div className="h-80 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-20 h-20 text-blue-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-gray-600 font-semibold">Bar Chart</p>
                    <p className="text-sm text-gray-400 mt-2">Teacher activity breakdown</p>
                  </div>
                </div>
              </IslamicCard>
            </div>

            {/* Additional Metrics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Course Distribution */}
              <IslamicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-islamic-primary-900">Course Distribution</h3>
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-purple-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <p className="text-gray-600 font-semibold">Pie Chart</p>
                  </div>
                </div>
              </IslamicCard>

              {/* Top Teachers Table */}
              <IslamicCard className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-islamic-primary-900">Top Teachers</h3>
                  <Target className="w-6 h-6 text-islamic-gold-600" />
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Sheikh Ahmed', rating: 4.9, sessions: 156 },
                    { name: 'Ustadha Fatima', rating: 4.8, sessions: 142 },
                    { name: 'Sheikh Muhammad', rating: 4.7, sessions: 128 },
                    { name: 'Ustadha Aisha', rating: 4.6, sessions: 115 },
                  ].map((teacher, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-islamic-sand-50 to-islamic-gold-50/30 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-islamic-primary-600 to-islamic-emerald-600 flex items-center justify-center text-white font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{teacher.name}</p>
                          <p className="text-sm text-gray-500">{teacher.sessions} sessions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-islamic-gold-500" />
                        <span className="font-bold text-islamic-gold-600">{teacher.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </IslamicCard>
            </div>

            {/* Insights Section */}
            <IslamicCard className="p-6 bg-gradient-to-br from-islamic-primary-600 to-islamic-emerald-600 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">AI-Generated Insights</h3>
                  <div className="space-y-2 text-white/90">
                    <p>• Student enrollment increased by 23% this month - highest growth in Q4</p>
                    <p>• Teacher engagement is 12% above platform average</p>
                    <p>• Meeting completion rate improved from 87% to 94%</p>
                    <p>• Peak learning hours: 6-8 PM local time (consider adding more slots)</p>
                  </div>
                </div>
              </div>
            </IslamicCard>
          </div>
        </IslamicPatternBackground>
    </div>
  );
}
