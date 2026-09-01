import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

const supabase = getSupabaseAdminClient()

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch teacher pricing information
    const { data: pricingData } = await supabase
      .from('teacher_pricing')
      .select('price_per_meeting, is_free')
      .eq('teacher_id', userId)
      .single()

    const pricing = pricingData ?? { price_per_meeting: 0, is_free: true }

    // Combine profile with pricing info (default to free if no pricing record)
    const profileWithPricing = Object.assign({}, profile as Record<string, unknown>, {
      teacher_price: pricing.price_per_meeting,
      hourly_price: pricing.price_per_meeting,
      is_free: pricing.is_free,
    })

    // Fetch meetings for this teacher
    const { data: meetings, error: meetingsError } = await supabase
      .from('meeting_bookings')
      .select(`
        *,
        time_slots:time_slot_id (
          id,
          slot_name,
          start_time,
          end_time
        ),
        teacher_slot_availability:teacher_slot_id (
          id,
          date,
          max_capacity
        )
      `)
      .eq('teacher_id', userId)
      .order('meeting_date', { ascending: true })

    if (meetingsError) {
      console.error('Meetings error:', meetingsError)
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
    }

    return NextResponse.json({
      profile: profileWithPricing,
      meetings: meetings || []
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
