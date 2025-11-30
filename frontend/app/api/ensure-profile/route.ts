import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Auto-create profile if it doesn't exist
 * This handles cases where users were created in Clerk but not in database
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      })
    }

    // Profile doesn't exist, create it from Clerk data
    const user = await clerkClient().users.getUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      )
    }

    // Get role from Clerk public metadata (or default to student)
    const role = (user.publicMetadata?.role as string) || 'student'

    // Get email
    const email = user.emailAddresses[0]?.emailAddress || ''

    // Get full name
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email

    // Create profile in database
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert([
        {
          clerk_user_id: userId,
          email: email,
          full_name: fullName,
          role: role,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Failed to create profile:', error)
      return NextResponse.json(
        { error: 'Failed to create profile', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Auto-created profile for user ${userId} with role: ${role}`)

    return NextResponse.json({
      success: true,
      message: 'Profile created',
      profile: newProfile
    })
  } catch (error: any) {
    console.error('Error creating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Check if current user has a profile
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({
        success: false,
        exists: false,
        userId: userId
      })
    }

    return NextResponse.json({
      success: true,
      exists: true,
      profile: profile
    })
  } catch (error: any) {
    console.error('Error checking profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
