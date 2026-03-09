'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Users, Video, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface Meeting {
  id: string
  title: string
  courseTitle?: string
  scheduledDate: string
  scheduledTime: string
  duration: number
  meetingLink?: string
  teacherName?: string
  status: 'upcoming' | 'completed' | 'cancelled'
}

export default function StudentMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings/student/upcoming')
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.meetings || [])
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const joinMeeting = (meetingLink: string) => {
    window.open(meetingLink, '_blank')
  }

  const isJoinable = (meeting: Meeting) => {
    const meetingTime = new Date(`${meeting.scheduledDate}T${meeting.scheduledTime}`)
    const now = new Date()
    const minutesUntil = (meetingTime.getTime() - now.getTime()) / 1000 / 60
    return minutesUntil <= 15 && minutesUntil >= -meeting.duration
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Meetings</h1>
        <p className="text-gray-600 mt-1">Your scheduled live classes and meetings</p>
      </div>

      <div className="space-y-4">
        {meetings.map((meeting) => (
          <Card key={meeting.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Video className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
                  {meeting.status === 'cancelled' && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                      Cancelled
                    </span>
                  )}
                </div>

                {meeting.courseTitle && (
                  <p className="text-gray-600 mb-3">{meeting.courseTitle}</p>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(meeting.scheduledDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{meeting.scheduledTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{meeting.duration} minutes</span>
                  </div>
                </div>

                {meeting.teacherName && (
                  <p className="text-sm text-gray-500 mt-2">with {meeting.teacherName}</p>
                )}
              </div>

              <div>
                {meeting.status !== 'cancelled' && meeting.meetingLink && (
                  isJoinable(meeting) ? (
                    <Button
                      onClick={() => joinMeeting(meeting.meetingLink!)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Video className="h-4 w-4" />
                      Join Now
                    </Button>
                  ) : (
                    <div className="text-center">
                      <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Opens 15 min before</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </Card>
        ))}

        {meetings.length === 0 && (
          <Card className="p-12 text-center">
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming meetings</h3>
            <p className="text-gray-600">Your scheduled meetings will appear here</p>
          </Card>
        )}
      </div>
    </div>
  )
}
