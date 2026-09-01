import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

interface UserMetadata {
  role?: 'admin' | 'teacher' | 'student';
}

/**
 * Role resolver for the post-sign-in landing.
 *
 * The middleware redirects /dashboard straight to the role portal whenever it
 * can read the role from session claims. It reaches this page only when that
 * lookup was inconclusive, so the job here is to resolve the role the reliable
 * way — a server-side `currentUser()` call with no timeout budget — and send
 * the user on. This previously rendered a separate generic dashboard, which
 * stranded exactly those users on a page unrelated to their portal.
 */
export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const role = (user?.publicMetadata as UserMetadata)?.role;

  if (role === 'admin' || role === 'teacher') {
    redirect(`/${role}`);
  }

  // A signed-in account with no assigned role is a student by default. That is
  // safe here — unlike in the middleware — because this path resolved the role
  // authoritatively rather than guessing after a timeout.
  redirect('/student');
}
