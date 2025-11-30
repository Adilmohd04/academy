import { currentUser, auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import MeetingsPageClient from './MeetingsPageClient'

async function getMeetings(token: string | null) {
  if (!token) return []

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/student/upcoming`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching meetings:', error)
    return []
  }
}

export default async function StudentMeetingsPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { getToken } = auth()
  const token = await getToken()
  const meetings = await getMeetings(token)

  const userData = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  }

  return <MeetingsPageClient user={userData} meetings={meetings} />
}
