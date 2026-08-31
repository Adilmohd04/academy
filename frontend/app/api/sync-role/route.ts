import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = getSupabaseAdminClient()

/**
 * Sync user role from Supabase to Clerk
 * This ensures Clerk's publicMetadata always has the latest role from database
 */
export async function POST(req: Request) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      console.log('No userId in auth result:', authResult)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role from Supabase
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !profile) {
      console.error('Failed to fetch user profile:', error)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Update Clerk's publicMetadata with role from Supabase
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: profile.role,
      },
    })

    console.log(`✅ Synced role for user ${userId}: ${profile.role}`)

    return NextResponse.json({
      success: true,
      role: profile.role,
    })
  } catch (error: any) {
    console.error('Error syncing role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get current user role from Supabase
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role from Supabase
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, email, full_name')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: profile,
    })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
