'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import FinalExamInterview from '@/components/student/FinalExamInterview'
import Card from '@/components/ui/Card'

export default function StudentExamPage() {
  const { getToken, userId } = useAuth()
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchUpcomingExams()
    }
  }, [userId])

  const fetchUpcomingExams = async () => {
    try {
      const token = await getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/exams/upcoming`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-clerk-user-id': userId || ''
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUpcomingExams(data.exams || data.data || [])
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
            <FinalExamInterview key={exam.id} exam={exam} studentId={userId || ''} />
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
