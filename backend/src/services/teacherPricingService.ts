import pool from '../config/database';

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

    return result.rows.map(row => ({
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
 */
export const setTeacherPrice = async (
  teacherId: string,
  price: number,
  notes?: string
): Promise<void> => {
  try {
    const isFree = price === 0;
    
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
