import { supabase } from '../../../config/database';

export const getAllTeachers = async () => {
  try {
    // Get global default price first
    const { data: settingData, error: settingError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'meeting_price')
      .single();
    
    const globalPrice = settingData?.setting_value ? parseFloat(settingData.setting_value) : 100;

    // Get all teachers with their pricing - ONLY role='teacher'
    // Note: teacher_pricing.teacher_id references profiles.clerk_user_id, not profiles.id
    const { data: teachers, error } = await supabase
      .from('profiles')
      .select(`
        id,
        clerk_user_id,
        full_name,
        email,
        role
      `)
      .eq('role', 'teacher')
      .order('full_name');

    if (error) {
      console.error('❌ Supabase error fetching teachers:', error);
      throw error;
    }

    if (!teachers) {
      console.log('⚠️ No teachers found');
      return [];
    }

    console.log(`✅ Found ${teachers.length} teachers (role='teacher' only)`);

    const canonicalTeachers = new Map<string, any>();

    for (const teacher of teachers as any[]) {
      const emailKey = (teacher.email || '').trim().toLowerCase();
      const clerkKey = (teacher.clerk_user_id || '').trim();
      const idKey = (teacher.id || '').trim();
      const canonicalKey = emailKey || clerkKey || idKey;

      if (!canonicalKey) {
        continue;
      }

      const existing = canonicalTeachers.get(canonicalKey);
      if (!existing) {
        canonicalTeachers.set(canonicalKey, teacher);
        continue;
      }

      const existingScore = Number(Boolean(existing.full_name)) + Number(Boolean(existing.email)) + Number(Boolean(existing.clerk_user_id));
      const currentScore = Number(Boolean(teacher.full_name)) + Number(Boolean(teacher.email)) + Number(Boolean(teacher.clerk_user_id));

      if (currentScore > existingScore) {
        canonicalTeachers.set(canonicalKey, teacher);
      }
    }

    // Fetch pricing separately for each teacher using clerk_user_id
    const teachersWithPricing = await Promise.all(
      Array.from(canonicalTeachers.values()).map(async (teacher: any) => {
        const { data: pricing } = await supabase
          .from('teacher_pricing')
          .select('price_per_meeting, is_free, notes')
          .eq('teacher_id', teacher.clerk_user_id)
          .single();

        return {
          ...teacher,
          pricing
        };
      })
    );

    return teachersWithPricing.map((teacher: any) => {
      const pricing = teacher.pricing;

      return {
        id: teacher.id,
        clerk_user_id: teacher.clerk_user_id,
        full_name: teacher.full_name,
        email: teacher.email,
        // Use custom price if exists, otherwise global price
        teacher_price: pricing?.price_per_meeting
          ? (pricing.is_free ? 0 : parseFloat(pricing.price_per_meeting))
          : globalPrice,
        hourly_price: pricing?.price_per_meeting
          ? (pricing.is_free ? 0 : parseFloat(pricing.price_per_meeting))
          : globalPrice,
        is_free: pricing?.is_free || false,
        notes: pricing?.notes || null
      };
    });
  } catch (error) {
    console.error('Error in getAllTeachers service:', error);
    throw error;
  }
};


