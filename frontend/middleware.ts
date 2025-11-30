import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  if (!userId) {
    await auth().protect()
    return
  }

  const pathname = request.nextUrl.pathname

  // Role-based route protection for /teacher, /student, /admin
  if (pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/admin')) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
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

      if (response.ok) {
        const data = await response.json()
        const role = (data && data.length > 0 && data[0].role) ? data[0].role : 'student'

        // Enforce access rules
        if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin') {
          return NextResponse.redirect(new URL('/student', request.url))
        }
        if (pathname.startsWith('/student') && role !== 'student' && role !== 'admin') {
          return NextResponse.redirect(new URL('/teacher', request.url))
        }
        if (pathname.startsWith('/admin') && role !== 'admin') {
          // Non-admins trying to access admin
          return NextResponse.redirect(new URL(`/${role}`, request.url))
        }
      }
    } catch (error) {
      console.error('Error enforcing role-based routes:', error)
      // On error, default to student dashboard for safety
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  if (request.nextUrl.pathname === '/dashboard') {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
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
      
      if (response.ok) {
        const data = await response.json()
        
        if (data && data.length > 0) {
          const role = data[0].role
          return NextResponse.redirect(new URL(`/${role}`, request.url))
        }
      }
      
      return NextResponse.redirect(new URL('/student', request.url))
    } catch (error) {
      console.error('Error fetching user role:', error)
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