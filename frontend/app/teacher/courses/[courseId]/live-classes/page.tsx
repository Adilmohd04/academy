'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Video, Calendar, Clock, Users, Plus, ExternalLink } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface LiveClass {
  id: string
  title: string
  description?: string
  scheduledDate: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  meetLink?: string
  attendeeCount?: number
}

export default function LiveClassesPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const courseId = params.courseId as string
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLiveClasses()
  }, [courseId])

  const fetchLiveClasses = async () => {
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/teacher/courses/${courseId}/schedules`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.message || 'Could not load live classes')
      }
      const data = await res.json()
      setClasses((data.data || data.schedules || []).map((liveClass: any) => ({
        id: liveClass.id,
        title: liveClass.title,
        description: liveClass.description,
        scheduledDate: liveClass.scheduled_date || liveClass.scheduledDate,
        startTime: liveClass.start_time || liveClass.startTime,
        endTime: liveClass.end_time || liveClass.endTime,
        status: liveClass.status,
        meetLink: liveClass.meet_link || liveClass.meetLink,
        attendeeCount: liveClass.attendee_count,
      })))
    } catch (error) {
      console.error('Error fetching live classes:', error)
      setError(error instanceof Error ? error.message : 'Could not load live classes')
    } finally {
      setLoading(false)
    }
  }

  const scheduleLiveClass = async (formData: any) => {
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/teacher/courses/${courseId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error(await res.text())
      fetchLiveClasses()
      setShowScheduleModal(false)
    } catch (error) {
      console.error('Error scheduling class:', error)
      setError('Could not schedule the live class. Please check the details and try again.')
    }
  }

  const goLive = async (scheduleId: string) => {
    const meetLink = prompt('Enter Google Meet link (or leave empty to generate):')
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/teacher/schedules/${scheduleId}/go-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ meet_link: meetLink })
      })

      if (!res.ok) throw new Error(await res.text())
      fetchLiveClasses()
      if (meetLink) window.open(meetLink, '_blank')
    } catch (error) {
      console.error('Error going live:', error)
      setError('Could not start this live class. Please try again.')
    }
  }

  const endClass = async (scheduleId: string) => {
    const recordingUrl = prompt('Enter recording URL (optional):')
    try {
      const token = await getToken()
      const res = await fetch(`${API}/api/teacher/schedules/${scheduleId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ recording_url: recordingUrl })
      })

      if (!res.ok) throw new Error(await res.text())
      fetchLiveClasses()
    } catch (error) {
      console.error('Error ending class:', error)
      setError('Could not end this live class. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-800 border-red-200'
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Classes</h1>
          <p className="text-gray-600 mt-1">Schedule and manage your live sessions</p>
        </div>
        <Button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Schedule Class
        </Button>
      </div>

      {error ? (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{error}</span>
          <button onClick={() => void fetchLiveClasses()} className="font-semibold underline">Retry</button>
        </div>
      ) : null}

      <div className="grid gap-4">
        {classes.map((liveClass) => (
          <Card key={liveClass.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Video className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{liveClass.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(liveClass.status)}`}>
                    {liveClass.status.toUpperCase()}
                  </span>
                </div>
                
                {liveClass.description && (
                  <p className="text-gray-600 mb-4">{liveClass.description}</p>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(liveClass.scheduledDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{liveClass.startTime} - {liveClass.endTime}</span>
                  </div>
                  {liveClass.attendeeCount !== undefined && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{liveClass.attendeeCount} attendees</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {liveClass.status === 'scheduled' && (
                  <Button onClick={() => goLive(liveClass.id)} className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Go Live
                  </Button>
                )}
                
                {liveClass.status === 'live' && (
                  <>
                    {liveClass.meetLink && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(liveClass.meetLink, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Join Meeting
                      </Button>
                    )}
                    <Button onClick={() => endClass(liveClass.id)} variant="outline">
                      End Class
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}

        {classes.length === 0 && (
          <Card className="p-12 text-center">
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No live classes scheduled</h3>
            <p className="text-gray-600 mb-4">Schedule your first live class to interact with students in real-time</p>
            <Button onClick={() => setShowScheduleModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule First Class
            </Button>
          </Card>
        )}
      </div>

      {showScheduleModal && (
        <ScheduleClassModal
          courseId={courseId}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={scheduleLiveClass}
        />
      )}
    </div>
  )
}

function ScheduleClassModal({ 
  courseId, 
  onClose, 
  onSchedule 
}: { 
  courseId: string
  onClose: () => void
  onSchedule: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    timezone: 'Asia/Kolkata',
    meet_link: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSchedule(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Schedule Live Class</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Week 1 Q&A Session"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="What will you cover in this session?"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Meet Link (Optional)</label>
              <input
                type="url"
                value={formData.meet_link}
                onChange={(e) => setFormData({ ...formData, meet_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="https://meet.google.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to generate link when going live</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">Schedule Class</Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
