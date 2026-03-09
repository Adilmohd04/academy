import { currentUser, auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import StudentDashboardClient from './StudentDashboardClient'

async function getData(token: string | null) {
  if (!token) return { courses: [], meetings: [], profile: null }

  const headers = { Authorization: `Bearer ${token}` }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  try {
    const [coursesRes, meetingsRes, profileRes] = await Promise.all([
      fetch(`${baseUrl}/api/courses`, { headers, next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/meetings/student/upcoming`, { headers, cache: 'no-store' }),
      fetch(`${baseUrl}/api/users/profile`, { headers, next: { tags: ['profile'] } })
    ])

    const courses = await coursesRes.json()
    const meetings = await meetingsRes.json()
    const profile = await profileRes.json()

    return {
      courses: courses.data || [],
      meetings: meetings.data?.slice(0, 3) || [],
      profile: profile || null
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return { courses: [], meetings: [], profile: null }
  }
}

export default async function StudentDashboard() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const role = (user.publicMetadata?.role as string) || 'student'
  if (role !== 'student' && role !== 'admin') {
    redirect('/teacher')
  }

  const { getToken } = auth()
  const token = await getToken()
  const data = await getData(token)

  const userData = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses[0]?.emailAddress,
    imageUrl: user.imageUrl,
    role: role,
  }

  return (
    <StudentDashboardClient
      user={userData}
      initialData={data}
    />
  )
}
