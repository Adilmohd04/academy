import pool from '../../../config/database';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MAX_MEETING_PRICE = 1_000_000;

const assertValidMeetingPrice = (price: number): void => {
  if (!Number.isFinite(price) || price < 0 || price > MAX_MEETING_PRICE) {
    throw new Error(`Price must be a finite amount between 0 and ${MAX_MEETING_PRICE}`);
  }
};

/**
 * Pricing rows use the Clerk identifier, not the profile UUID.  Resolve it
 * once at the boundary so an admin cannot create pricing records for a
 * deleted user or a non-teacher profile.
 */
const requireTeacherPricingTarget = async (teacherId: string): Promise<void> => {
  if (typeof teacherId !== 'string' || !teacherId.trim()) {
    throw new Error('Teacher ID is required');
  }

  const result = await pool.query(
    `SELECT clerk_user_id
       FROM profiles
      WHERE clerk_user_id = $1
        AND role = 'teacher'
      LIMIT 1`,
    [teacherId],
  );

  if (result.rows.length === 0) {
    throw new Error('Teacher not found');
  }
};

/**
 * Get price for a specific teacher
 * Returns teacher's custom price or falls back to global price
 */
export const getTeacherPrice = async (teacherId: string): Promise<number> => {
  try {
    // First, try to get teacher-specific price
    const result = await pool.query(
      `SELECT price_per_meeting, is_free 
       FROM teacher_pricing 
       WHERE teacher_id = $1`,
      [teacherId]
    );

    if (result.rows.length > 0) {
      const { price_per_meeting, is_free } = result.rows[0];
      return is_free ? 0 : parseFloat(price_per_meeting);
    }

    // Fallback to global price if teacher-specific price not found
    const globalPrice = await pool.query(
      `SELECT setting_value 
       FROM system_settings 
       WHERE setting_key = 'meeting_price'`
    );

    return globalPrice.rows.length > 0 
      ? parseFloat(globalPrice.rows[0].setting_value) 
      : 100; // Final fallback
  } catch (error) {
    console.error('Error getting teacher price:', error);
    return 100; // Default fallback
  }
};

/**
 * Get all teachers with their pricing
 * Shows ALL teachers, even if not in teacher_pricing table yet
 */
export const getAllTeacherPricing = async () => {
  try {
    // Get global default price first
    const globalPriceResult = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'meeting_price'`
    );
    const globalPrice = globalPriceResult.rows.length > 0 
      ? parseFloat(globalPriceResult.rows[0].setting_value) 
      : 100;

    // LEFT JOIN to show ALL teachers, even without custom pricing
    const result = await pool.query(
      `SELECT 
        p.clerk_user_id as teacher_id,
        p.full_name,
        p.email,
        tp.id,
        tp.price_per_meeting,
        tp.is_free,
        tp.notes,
        tp.updated_at
      FROM profiles p
      LEFT JOIN teacher_pricing tp ON tp.teacher_id = p.clerk_user_id
      WHERE p.role = 'teacher'
      ORDER BY p.full_name`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      teacherId: row.teacher_id,
      teacherName: row.full_name,
      teacherEmail: row.email,
      profileImage: row.profile_image,
      // Use custom price if exists, otherwise global price
      price: row.price_per_meeting 
        ? (row.is_free ? 0 : parseFloat(row.price_per_meeting))
        : globalPrice,
      isFree: row.is_free || false,
      notes: row.notes,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting all teacher pricing:', error);
    throw error;
  }
};

/**
 * Set price for a specific teacher
 * Also updates all existing slots if teacher is set to FREE
 */
export const setTeacherPrice = async (
  teacherId: string,
  price: number,
  notes?: string
): Promise<void> => {
  try {
    await requireTeacherPricingTarget(teacherId);
    assertValidMeetingPrice(price);

    const isFree = price === 0;
    
    // Update teacher pricing
    await pool.query(
      `INSERT INTO teacher_pricing (teacher_id, price_per_meeting, is_free, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (teacher_id) 
       DO UPDATE SET 
         price_per_meeting = $2,
         is_free = $3,
         notes = $4,
         updated_at = CURRENT_TIMESTAMP`,
      [teacherId, price, isFree, notes || null]
    );

    // If teacher is set to FREE, update ALL their existing slots to be free
    if (isFree) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get the teacher's profile ID (teacher_slot_availability uses profile.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('clerk_user_id')
        .eq('clerk_user_id', teacherId)
        .single();

      if (profile) {
        // Update all existing slots for this teacher to be free
        await supabase
          .from('teacher_slot_availability')
          .update({ is_free: true })
          .eq('teacher_id', profile.clerk_user_id);

        console.log(`✅ Updated all slots for teacher ${teacherId} to FREE`);
      }
    }
  } catch (error) {
    console.error('Error setting teacher price:', error);
    throw error;
  }
};

/**
 * Set teacher to FREE
 */
export const setTeacherFree = async (
  teacherId: string,
  notes?: string
): Promise<void> => {
  return setTeacherPrice(teacherId, 0, notes || 'FREE meeting');
};

/**
 * Reset teacher to global price (delete custom pricing)
 */
export const resetTeacherToGlobalPrice = async (teacherId: string): Promise<void> => {
  try {
    await requireTeacherPricingTarget(teacherId);
    await pool.query(
      `DELETE FROM teacher_pricing WHERE teacher_id = $1`,
      [teacherId]
    );
  } catch (error) {
    console.error('Error resetting teacher price:', error);
    throw error;
  }
};

/**
 * Get price display for student
 * Returns formatted price string
 */
export const getPriceDisplay = async (teacherId: string): Promise<string> => {
  const price = await getTeacherPrice(teacherId);
  
  if (price === 0) {
    return 'FREE';
  }
  
  return `₹${price}`;
};
