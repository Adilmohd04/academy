import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacher_id, price } = body;

    if (!teacher_id || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: teacher_id and price' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update teacher price in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ teacher_price: price })
      .eq('clerk_user_id', teacher_id)
      .select();

    if (error) {
      console.error('Error updating teacher price:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in teacher price API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
