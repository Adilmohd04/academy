import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

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

async function getUserRole(sessionClaims: any, userId: string, request: NextRequest) {
  // 1. Try Claims
  const roleFromClaims =
    sessionClaims?.metadata?.role ||
    sessionClaims?.publicMetadata?.role ||
    sessionClaims?.role ||
    null

  if (typeof roleFromClaims === 'string') return roleFromClaims;

  // 2. Try Cookie (set by sync or previously)
  const cookieRole = request.cookies.get('_academy_role')?.value;
  if (cookieRole) return cookieRole;

  // 3. Fallback: Fetch from Clerk directly
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const roleFromClerk = user.publicMetadata?.role;
    if (typeof roleFromClerk === 'string') return roleFromClerk;
  } catch (err) {
    console.error("Failed to fetch user from clerk in middleware:");
  }

  return 'student';
}

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname

  // Skip middleware for static files and Next.js internals
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
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

  // Handle /dashboard redirect - send users to their role page
  if (pathname === '/dashboard') {
    const role = await getUserRole(sessionClaims, userId, request)
    
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (role === 'teacher') {
      return NextResponse.redirect(new URL('/teacher', request.url))
    } else {
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  // Redirect root authenticated users to their dashboard
  if (pathname === '/' && userId) {
    const role = await getUserRole(sessionClaims, userId, request)
    
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (role === 'teacher') {
      return NextResponse.redirect(new URL('/teacher', request.url))
    } else {
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  // Role-based route protection
  if (pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/admin') || pathname.startsWith('/learn')) {
    const role = await getUserRole(sessionClaims, userId, request)

    // Allow /learn for all authenticated users (students, teachers, admins)
    if (pathname.startsWith('/learn')) {
      return NextResponse.next()
    }

    const requestedRole = pathname.split('/')[1] // Extract 'teacher', 'student', or 'admin'
    
    // Admin can access all pages (admin, teacher, student)
    if (role === 'admin') {
      return NextResponse.next()
    }
    
    // Teachers can only access /teacher
    if (role === 'teacher' && requestedRole !== 'teacher') {
      return NextResponse.redirect(new URL('/teacher', request.url))
    }
    
    // Students can only access /student
    if (role === 'student' && requestedRole !== 'student') {
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}