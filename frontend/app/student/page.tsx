import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import StudentDashboardClient from './StudentDashboardClient'

async function getData(token: string | null) {
  if (!token) return { courses: [], meetings: [], profile: null }

  const headers = { Authorization: `Bearer ${token}` }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  try {
    const [coursesRes, meetingsRes, profileRes] = await Promise.all([
      fetch(`${baseUrl}/api/student/courses/published`, { headers, next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/meetings/student/upcoming`, { headers, cache: 'no-store' }),
      fetch(`${baseUrl}/api/users/profile`, { headers, next: { tags: ['profile'] } })
    ])

    const courses = await coursesRes.json()
    const meetings = await meetingsRes.json()
    const profile = await profileRes.json()

    return {
      courses: courses.courses || courses.data || [],
      meetings: meetings.data?.slice(0, 3) || [],
      profile: profile || null
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return { courses: [], meetings: [], profile: null }
  }
}

export default async function StudentDashboard() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const token = await getToken()
  const role = 'student'
  if (role !== 'student' && role !== 'admin') {
    redirect('/teacher')
  }

  const data = await getData(token)

  const userData = {
    id: userId,
    firstName: null,
    lastName: null,
    email: null,
    imageUrl: null,
    role: role,
  }

  return (
    <StudentDashboardClient
      user={userData}
      initialData={data}
    />
  )
}
