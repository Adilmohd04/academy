import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/clear-session(.*)',
  '/api/webhooks(.*)',
  '/api/ensure-profile(.*)',
  '/api/sync-role(.*)',
  '/favicon.ico',
  '/.well-known(.*)',
])

// Helper to get user role from Supabase
async function getUserRole(userId: string, sessionClaims?: any): Promise<string | null> {
  console.log('🔑 Getting role for userId:', userId?.substring(0, 10))
  
  // 1. Try to get role from session claims (fastest)
  if (sessionClaims?.metadata?.role) {
    console.log('✅ Role from session claims:', sessionClaims.metadata.role)
    return sessionClaims.metadata.role;
  }
  
  // 2. Fallback to Supabase fetch (slower)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials')
      return null
    }

    console.log('🔍 Fetching role from Supabase for clerk_user_id:', userId)
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
      console.error('❌ Failed to fetch user role:', response.status, await response.text())
      return 'student' // Default to student if profile not found
    }

    const data = await response.json()
    console.log('📋 Supabase response:', data)
    
    if (data && data.length > 0 && data[0].role) {
      console.log('✅ Role from Supabase:', data[0].role)
      return data[0].role
    }
    
    console.log('⚠️ No role found in Supabase, defaulting to student')
    return 'student' // Default to student if no role found
  } catch (error) {
    console.error('❌ Error fetching user role:', error)
    return 'student' // Default to student on error
  }
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
    console.log('❌ No userId, redirecting to sign-in:', pathname)
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  console.log('✅ Authenticated:', { pathname, userId: userId.substring(0, 10) })

  // Handle /dashboard redirect - send users to their role page
  if (pathname === '/dashboard') {
    const role = await getUserRole(userId, sessionClaims)
    console.log('📊 Dashboard redirect, role:', role)
    
    if (role === 'admin') {
      console.log('→ Redirecting to /admin')
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (role === 'teacher') {
      console.log('→ Redirecting to /teacher')
      return NextResponse.redirect(new URL('/teacher', request.url))
    } else {
      console.log('→ Redirecting to /student (default)')
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  // Redirect root authenticated users to their dashboard
  if (pathname === '/' && userId) {
    const role = await getUserRole(userId, sessionClaims)
    console.log('🏠 Root redirect, role:', role)
    
    if (role === 'admin') {
      console.log('→ Redirecting to /admin')
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (role === 'teacher') {
      console.log('→ Redirecting to /teacher')
      return NextResponse.redirect(new URL('/teacher', request.url))
    } else {
      console.log('→ Redirecting to /student (default)')
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  // Role-based route protection
  if (pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/admin') || pathname.startsWith('/learn')) {
    const role = await getUserRole(userId, sessionClaims)
    
    if (!role) {
      // If we can't get role, allow access but log error
      console.error('Could not verify user role for:', userId)
      return NextResponse.next()
    }

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