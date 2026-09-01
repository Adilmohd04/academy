import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

const supabase = getSupabaseAdminClient()

type ProfileRoleRow = {
  role: string | null
}

type ProfileIdentityRow = {
  id: string
  clerk_user_id: string
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin by checking their role in database
    const { data: adminProfileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('clerk_user_id', userId)
      .single()

    const adminProfile = adminProfileData as ProfileRoleRow | null

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const contentType = req.headers.get('content-type') || ''
    let profileIdentifier = ''
    let newRole = ''

    if (contentType.includes('application/json')) {
      const body = await req.json()
      profileIdentifier = body.userId || body.clerk_user_id || body.profileId || ''
      newRole = body.role || ''
    } else {
      const formData = await req.formData()
      profileIdentifier = (formData.get('userId') || formData.get('clerk_user_id') || formData.get('profileId') || '') as string
      newRole = (formData.get('role') || '') as string
    }

    if (!profileIdentifier || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate role value
    if (!['student', 'teacher', 'admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    console.log(`🔄 Admin ${user.emailAddresses[0]?.emailAddress} changing user ${profileIdentifier} role to: ${newRole}`)

    // Accept either a profile UUID or a Clerk user id from the admin UI.
    let targetProfile: ProfileIdentityRow | null = null
    if (UUID_V4_REGEX.test(profileIdentifier)) {
      const { data } = await supabase
        .from('profiles')
        .select('id, clerk_user_id')
        .eq('id', profileIdentifier)
        .single()

      targetProfile = (data as ProfileIdentityRow | null) || null
    }

    if (!targetProfile) {
      const { data } = await supabase
        .from('profiles')
        .select('id, clerk_user_id')
        .eq('clerk_user_id', profileIdentifier)
        .single()

      targetProfile = (data as ProfileIdentityRow | null) || null
    }

    if (!targetProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Update user role in Supabase database
    const { data: updatedProfile, error } = await ((supabase.from('profiles') as any)
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetProfile.id)
      .select()
      .single())

    if (error) {
      console.error('❌ Error updating role:', error)
      return NextResponse.json({ error: 'Failed to update role in database' }, { status: 500 })
    }

    // Keep Clerk metadata in sync so auth middleware sees the new role immediately
    try {
      const clerk = await clerkClient()
      await clerk.users.updateUserMetadata(updatedProfile.clerk_user_id, {
        publicMetadata: { role: newRole },
      })
    } catch (metadataError) {
      console.error('⚠️ Failed to sync Clerk metadata after role update:', metadataError)
    }

    console.log(`✅ Role updated successfully in database:`, updatedProfile)

    return NextResponse.json({ success: true, profile: updatedProfile })
  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
