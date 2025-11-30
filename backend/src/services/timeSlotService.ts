/**
 * Time Slot Service
 * 
 * Database operations for time slots and blocked dates
 */

import { supabase } from '../config/database';

// ============================================
// INTERFACES
// ============================================

export interface TimeSlot {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlockedDate {
  id: string;
  blocked_date: string;
  reason?: string;
  is_recurring: boolean;
  day_of_week?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BlockedTimeSlot {
  id: string;
  time_slot_id: string;
  blocked_date?: string;
  is_recurring: boolean;
  day_of_week?: number;
  reason?: string;
  created_by?: string;
  created_at: string;
}

export interface CreateTimeSlotInput {
  slot_name: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  display_order?: number;
}

export interface CreateBlockedDateInput {
  blocked_date?: string;
  reason?: string;
  is_recurring?: boolean;
  day_of_week?: number;
  created_by?: string;
}

export interface CreateBlockedTimeSlotInput {
  time_slot_id: string;
  blocked_date?: string;
  is_recurring?: boolean;
  day_of_week?: number;
  reason?: string;
  created_by?: string;
}

// ============================================
// TIME SLOTS
// ============================================

/**
 * Get all time slots
 */
export const getAllTimeSlots = async (activeOnly: boolean = false): Promise<TimeSlot[]> => {
  let query = supabase.from('time_slots').select('*');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  query = query.order('display_order', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching time slots:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Get available time slots (using view)
 */
export const getAvailableTimeSlots = async (): Promise<TimeSlot[]> => {
  const { data, error } = await supabase
    .from('available_time_slots')
    .select('*');

  if (error) {
    console.error('Error fetching available time slots:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Get time slot by ID
 */
export const getTimeSlotById = async (id: string): Promise<TimeSlot | null> => {
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching time slot:', error);
    return null;
  }

  return data;
};

/**
 * Create new time slot
 */
export const createTimeSlot = async (data: CreateTimeSlotInput): Promise<TimeSlot> => {
  const { data: slot, error } = await supabase
    .from('time_slots')
    .insert([
      {
        ...data,
        duration_minutes: data.duration_minutes || 60,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating time slot:', error);
    throw new Error(error.message);
  }

  return slot;
};

/**
 * Update time slot
 */
export const updateTimeSlot = async (id: string, data: Partial<TimeSlot>): Promise<TimeSlot> => {
  const { data: slot, error } = await supabase
    .from('time_slots')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating time slot:', error);
    throw new Error(error.message);
  }

  return slot;
};

/**
 * Delete time slot
 */
export const deleteTimeSlot = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('time_slots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting time slot:', error);
    throw new Error(error.message);
  }
};

/**
 * Toggle time slot active status
 */
export const toggleTimeSlotStatus = async (id: string, isActive: boolean): Promise<TimeSlot> => {
  return updateTimeSlot(id, { is_active: isActive });
};

// ============================================
// AVAILABILITY CHECKS
// ============================================

/**
 * Get available slots for a specific date (using database function)
 */
export const getAvailableSlotsForDate = async (date: string): Promise<any[]> => {
  const { data, error } = await supabase.rpc('get_available_slots_for_date', {
    check_date: date,
  });

  if (error) {
    console.error('Error fetching available slots for date:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Check if a date is available (using database function)
 */
export const isDateAvailable = async (date: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('is_date_available', {
    check_date: date,
  });

  if (error) {
    console.error('Error checking date availability:', error);
    throw new Error(error.message);
  }

  return data === true;
};

/**
 * Check if a specific time slot is available on a date
 */
export const isTimeSlotAvailable = async (date: string, timeSlotId: string): Promise<boolean> => {
  // Check if date is blocked
  const dateAvailable = await isDateAvailable(date);
  if (!dateAvailable) {
    return false;
  }

  // Check if time slot is blocked on this date
  const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, etc.

  const { data, error } = await supabase
    .from('blocked_time_slots')
    .select('*')
    .eq('time_slot_id', timeSlotId)
    .or(`blocked_date.eq.${date},and(is_recurring.eq.true,day_of_week.eq.${dayOfWeek})`);

  if (error) {
    console.error('Error checking time slot availability:', error);
    return false;
  }

  return !data || data.length === 0;
};

// ============================================
// BLOCKED DATES
// ============================================

/**
 * Get all blocked dates
 */
export const getAllBlockedDates = async (): Promise<BlockedDate[]> => {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .order('blocked_date', { ascending: true });

  if (error) {
    console.error('Error fetching blocked dates:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Get blocked dates in range
 */
export const getBlockedDatesInRange = async (startDate: string, endDate: string): Promise<BlockedDate[]> => {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .gte('blocked_date', startDate)
    .lte('blocked_date', endDate)
    .order('blocked_date', { ascending: true });

  if (error) {
    console.error('Error fetching blocked dates:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Create blocked date
 */
export const createBlockedDate = async (data: CreateBlockedDateInput): Promise<BlockedDate> => {
  const { data: blocked, error } = await supabase
    .from('blocked_dates')
    .insert([
      {
        ...data,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating blocked date:', error);
    throw new Error(error.message);
  }

  return blocked;
};

/**
 * Delete blocked date
 */
export const deleteBlockedDate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting blocked date:', error);
    throw new Error(error.message);
  }
};

// ============================================
// BLOCKED TIME SLOTS
// ============================================

/**
 * Get all blocked time slots
 */
export const getAllBlockedTimeSlots = async (): Promise<BlockedTimeSlot[]> => {
  const { data, error } = await supabase
    .from('blocked_time_slots')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching blocked time slots:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Create blocked time slot
 */
export const createBlockedTimeSlot = async (data: CreateBlockedTimeSlotInput): Promise<BlockedTimeSlot> => {
  const { data: blocked, error } = await supabase
    .from('blocked_time_slots')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating blocked time slot:', error);
    throw new Error(error.message);
  }

  return blocked;
};

/**
 * Delete blocked time slot
 */
export const deleteBlockedTimeSlot = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('blocked_time_slots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting blocked time slot:', error);
    throw new Error(error.message);
  }
};
