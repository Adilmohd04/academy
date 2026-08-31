import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import IslamicDashboard from './IslamicDashboard';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export default async function AdminDashboard() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Resolve the role from our database instead of Clerk public metadata. This
  // keeps the page guard aligned with every admin API route and prevents a
  // stale session claim from granting access.
  const authorization = await requireRole(['admin'])
  if (isAuthorizationFailure(authorization)) {
    redirect('/dashboard')
  }

  return <IslamicDashboard />;
}
