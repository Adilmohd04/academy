import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization'

const supabase = getSupabaseAdminClient()

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireRole(['admin'])
    if (isAuthorizationFailure(authorization)) {
      return authorization.response
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
