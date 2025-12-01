import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/ensure-profile(.*)',
  '/api/sync-role(.*)',
])

// Helper to get user role from Supabase
async function getUserRole(userId: string): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return null
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?clerk_user_id=eq.${userId}&select=role`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch user role:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data && data.length > 0 && data[0].role) {
      return data[0].role
    }
    
    return 'student' // Default to student if no role found
  } catch (error) {
    console.error('Error fetching user role:', error)
    return null
  }
}

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Require authentication for protected routes
  if (!userId) {
    await auth().protect()
    return
  }

  // Handle /dashboard redirect - send users to their role page
  if (pathname === '/dashboard') {
    const role = await getUserRole(userId)
    
    if (role) {
      // Admin goes to /admin, teacher to /teacher, student to /student
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    
    // Default to student if role not found
    return NextResponse.redirect(new URL('/student', request.url))
  }

  // Role-based route protection
  if (pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/admin')) {
    const role = await getUserRole(userId)
    
    if (!role) {
      // If we can't get role, allow access but log error
      console.error('Could not verify user role for:', userId)
      return NextResponse.next()
    }

    const requestedRole = pathname.split('/')[1] // Extract 'teacher', 'student', or 'admin'
    
    // Admin can access all pages (admin, teacher, student)
    if (role === 'admin') {
      return NextResponse.next()
    }
    
    // Teachers can only access /teacher
    if (role === 'teacher' && requestedRole !== 'teacher') {
      console.log(`Redirecting teacher from /${requestedRole} to /teacher`)
      return NextResponse.redirect(new URL('/teacher', request.url))
    }
    
    // Students can only access /student
    if (role === 'student' && requestedRole !== 'student') {
      console.log(`Redirecting student from /${requestedRole} to /student`)
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