import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin by checking their role in database
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('clerk_user_id', userId)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const formData = await req.formData()
    const profileId = formData.get('userId') as string
    const newRole = formData.get('role') as string

    if (!profileId || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate role value
    if (!['student', 'teacher', 'admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    console.log(`🔄 Admin ${user.emailAddresses[0]?.emailAddress} changing user ${profileId} role to: ${newRole}`)

    // Update user role in Supabase database (this is the backend update!)
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating role:', error)
      return NextResponse.json({ error: 'Failed to update role in database' }, { status: 500 })
    }

    console.log(`✅ Role updated successfully in database:`, updatedProfile)

    // Redirect back to admin page with success
    return NextResponse.redirect(new URL('/admin?success=role-updated', req.url))
  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
