import { UserButton } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboard() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Check if user is admin
  const userRole = user.publicMetadata?.role as string
  if (userRole !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminDashboardClient />
}
