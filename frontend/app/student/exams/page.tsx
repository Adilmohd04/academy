'use client'

import { useEffect, useState } from 'react'
import FinalExamInterview from '@/components/student/FinalExamInterview'
import Card from '@/components/ui/Card'

export default function StudentExamPage() {
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingExams()
  }, [])

  const fetchUpcomingExams = async () => {
    try {
      const res = await fetch('/api/student/exams/upcoming')
      if (res.ok) {
        const data = await res.json()
        setUpcomingExams(data.exams || [])
      }
    } catch (error) {
      console.error('Error fetching exams:', error)
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Final Exams & Interviews</h1>
        <p className="text-gray-600 mt-1">Schedule and manage your final exam interviews</p>
      </div>

      {upcomingExams.length > 0 ? (
        <div className="space-y-6">
          {upcomingExams.map((exam) => (
            <FinalExamInterview key={exam.id} exam={exam} studentId="student-id" />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming exams</h3>
          <p className="text-gray-600">Final exam interviews will appear here when available</p>
        </Card>
      )}
    </div>
  )
}
