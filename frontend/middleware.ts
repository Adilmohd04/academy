import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/clear-session(.*)',
  '/verify(.*)',
  '/api/student/courses/browse(.*)',
  '/api/enrollments/my-courses(.*)',
  '/api/webhooks(.*)',
  '/api/ensure-profile(.*)',
  '/api/sync-role(.*)',
  '/favicon.ico',
  '/.well-known(.*)',
])

// The previous 1200ms budget expired routinely on a cold session, and every
// expiry silently downgraded the user to "student".
const LOOKUP_TIMEOUT_MS = 3000

type UserRole = 'admin' | 'teacher' | 'student'

const roleHomePath = (role: UserRole) => `/${role}`

async function getUserRole(sessionClaims: any, userId: string): Promise<string | null> {
  // 1. Try Claims
  const roleFromClaims =
    sessionClaims?.metadata?.role ||
    sessionClaims?.publicMetadata?.role ||
    sessionClaims?.role ||
    null

  if (typeof roleFromClaims === 'string') return roleFromClaims;

  // Claims are fast. If they are not available on a first login, allow
  // one short Clerk lookup, but never hold navigation open indefinitely.
  try {
    // Clerk v5 exposes a synchronous client factory. Await the user lookup
    // itself so this works both with the current SDK and a slow first session.
    const client = clerkClient();
    const lookup = client.users
      .getUser(userId)
      .then((user) => user.publicMetadata?.role);
    const roleFromClerk = await Promise.race([
      lookup,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), LOOKUP_TIMEOUT_MS)),
    ]);
    if (typeof roleFromClerk === 'string') return roleFromClerk;
  } catch {
    // Fall through when the optional lookup is unavailable.
  }

  // Unknown, not "student". Defaulting to a concrete role here sent teachers
  // and admins to the student portal whenever claims were missing and the
  // lookup timed out, and the backend — which resolves the real role — then
  // rejected their student API calls with 403.
  return null;
}

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname

  // Skip middleware for static files and Next.js internals
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.startsWith('/landing/')) {
    return NextResponse.next()
  }

  // Allow public routes without protection
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Get auth data for protected routes
  const { userId, sessionClaims } = await auth()
  
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  // Send users to their role's home. When the role cannot be resolved, fall
  // through rather than guessing — guessing is what routed teachers into the
  // student portal.
  if (pathname === '/dashboard' || pathname === '/') {
    const role = await getUserRole(sessionClaims, userId)

    if (role === 'admin' || role === 'teacher' || role === 'student') {
      return NextResponse.redirect(new URL(roleHomePath(role), request.url))
    }

    return NextResponse.next()
  }

  // Role-based route protection
  if (pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/admin') || pathname.startsWith('/learn')) {
    const role = await getUserRole(sessionClaims, userId)

    // Allow /learn for all authenticated users (students, teachers, admins)
    if (pathname.startsWith('/learn')) {
      return NextResponse.next()
    }

    const requestedRole = pathname.split('/')[1] // 'teacher' | 'student' | 'admin'

    // Which portals each role may open. Admin sees everything; everyone else is
    // confined to their own. The backend re-checks every request, so this is a
    // navigation guard, not the security boundary.
    const allowedPortals: Record<UserRole, string[]> = {
      admin: ['admin', 'teacher', 'student'],
      teacher: ['teacher'],
      student: ['student'],
    }

    // An unresolved role must not trigger a redirect — that misroutes real
    // teachers and admins. Let it through; the API still enforces the role.
    if (role !== 'admin' && role !== 'teacher' && role !== 'student') {
      return NextResponse.next()
    }

    if (!allowedPortals[role].includes(requestedRole)) {
      return NextResponse.redirect(new URL(roleHomePath(role), request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
