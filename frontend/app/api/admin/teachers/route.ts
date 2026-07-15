import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

const supabase = getSupabaseAdminClient()

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requesterRole = (user.publicMetadata?.role as string) || 'student'
    if (requesterRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: teachers, error } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, full_name, email, role, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching teachers:', error)
      return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 })
    }

    return NextResponse.json({ teachers: teachers || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
