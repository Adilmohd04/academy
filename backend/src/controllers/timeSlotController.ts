/**
 * Time Slot Controller
 * 
 * Handles HTTP requests for time slots and blocked dates
 */

import { Request, Response } from 'express';
import * as timeSlotService from '../services/timeSlotService';

// Cache for time slots (refresh every 5 minutes)
let timeSlotsCache: any = null;
let timeslotsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============================================
// TIME SLOTS
// ============================================

/**
 * Get all time slots
 * GET /api/time-slots
 */
export const getAllTimeSlots = async (req: Request, res: Response) => {
  try {
    const { active_only } = req.query;
    const activeOnly = active_only === 'true';
    
    // Check cache first
    const now = Date.now();
    if (timeSlotsCache && (now - timeslotsCacheTime) < CACHE_DURATION) {
      console.log('✅ Serving time slots from cache');
      const cachedSlots = activeOnly 
        ? timeSlotsCache.filter((slot: any) => slot.is_active)
        : timeSlotsCache;
      return res.json(cachedSlots);
    }
    
    console.log('🔄 Fetching fresh time slots from database');
    const slots = await timeSlotService.getAllTimeSlots(false); // Get all, cache all
    
    // Update cache
    timeSlotsCache = slots;
    timeslotsCacheTime = now;
    
    // Return filtered result
    const result = activeOnly 
      ? slots.filter((slot: any) => slot.is_active)
      : slots;
    
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch time slots' });
  }
};

/**
 * Get available time slots
 * GET /api/time-slots/available
 */
export const getAvailableTimeSlots = async (req: Request, res: Response) => {
  try {
    const slots = await timeSlotService.getAvailableTimeSlots();
    res.json(slots);
  } catch (error: any) {
    console.error('Error fetching available time slots:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch available time slots' });
  }
};

/**
 * Get available slots for specific date
 * GET /api/time-slots/available/:date
 */
export const getAvailableSlotsForDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const slots = await timeSlotService.getAvailableSlotsForDate(date);
    res.json(slots);
  } catch (error: any) {
    console.error('Error fetching available slots for date:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch available slots' });
  }
};

/**
 * Check if date is available
 * GET /api/time-slots/check-date/:date
 */
export const checkDateAvailability = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const isAvailable = await timeSlotService.isDateAvailable(date);
    res.json({ date, available: isAvailable });
  } catch (error: any) {
    console.error('Error checking date availability:', error);
    res.status(500).json({ error: error.message || 'Failed to check date availability' });
  }
};

/**
 * Check if time slot is available on date
 * GET /api/time-slots/check-availability
 */
export const checkTimeSlotAvailability = async (req: Request, res: Response) => {
  try {
    const { date, time_slot_id } = req.query;

    if (!date || !time_slot_id) {
      return res.status(400).json({ error: 'Date and time_slot_id are required' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date as string)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const isAvailable = await timeSlotService.isTimeSlotAvailable(
      date as string,
      time_slot_id as string
    );
    
    res.json({ date, time_slot_id, available: isAvailable });
  } catch (error: any) {
    console.error('Error checking time slot availability:', error);
    res.status(500).json({ error: error.message || 'Failed to check availability' });
  }
};

/**
 * Get time slot by ID
 * GET /api/time-slots/:id
 */
export const getTimeSlotById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const slot = await timeSlotService.getTimeSlotById(id);

    if (!slot) {
      return res.status(404).json({ error: 'Time slot not found' });
    }

    res.json(slot);
  } catch (error: any) {
    console.error('Error fetching time slot:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch time slot' });
  }
};

/**
 * Create time slot (Admin only)
 * POST /api/time-slots
 */
export const createTimeSlot = async (req: Request, res: Response) => {
  try {
    const { slot_name, start_time, end_time, duration_minutes, display_order } = req.body;

    if (!slot_name || !start_time || !end_time) {
      return res.status(400).json({ error: 'Slot name, start time, and end time are required' });
    }

    const slot = await timeSlotService.createTimeSlot({
      slot_name,
      start_time,
      end_time,
      duration_minutes,
      display_order,
    });

    res.status(201).json(slot);
  } catch (error: any) {
    console.error('Error creating time slot:', error);
    res.status(500).json({ error: error.message || 'Failed to create time slot' });
  }
};

/**
 * Update time slot (Admin only)
 * PUT /api/time-slots/:id
 */
export const updateTimeSlot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const slot = await timeSlotService.updateTimeSlot(id, updates);
    res.json(slot);
  } catch (error: any) {
    console.error('Error updating time slot:', error);
    res.status(500).json({ error: error.message || 'Failed to update time slot' });
  }
};

/**
 * Delete time slot (Admin only)
 * DELETE /api/time-slots/:id
 */
export const deleteTimeSlot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await timeSlotService.deleteTimeSlot(id);
    res.json({ message: 'Time slot deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting time slot:', error);
    res.status(500).json({ error: error.message || 'Failed to delete time slot' });
  }
};

/**
 * Toggle time slot status (Admin only)
 * PUT /api/time-slots/:id/toggle
 */
export const toggleTimeSlotStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const slot = await timeSlotService.toggleTimeSlotStatus(id, is_active);
    res.json(slot);
  } catch (error: any) {
    console.error('Error toggling time slot status:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle time slot status' });
  }
};

// ============================================
// BLOCKED DATES
// ============================================

/**
 * Get all blocked dates
 * GET /api/blocked-dates
 */
export const getAllBlockedDates = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (start_date && end_date) {
      const dates = await timeSlotService.getBlockedDatesInRange(
        start_date as string,
        end_date as string
      );
      return res.json(dates);
    }

    const dates = await timeSlotService.getAllBlockedDates();
    res.json(dates);
  } catch (error: any) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch blocked dates' });
  }
};

/**
 * Create blocked date (Admin only)
 * POST /api/blocked-dates
 */
export const createBlockedDate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { blocked_date, reason, is_recurring, day_of_week } = req.body;

    if (!blocked_date && !is_recurring) {
      return res.status(400).json({ error: 'Either blocked_date or is_recurring must be provided' });
    }

    if (is_recurring && day_of_week === undefined) {
      return res.status(400).json({ error: 'day_of_week is required for recurring blocks' });
    }

    const blocked = await timeSlotService.createBlockedDate({
      blocked_date,
      reason,
      is_recurring,
      day_of_week,
      created_by: userId,
    });

    res.status(201).json(blocked);
  } catch (error: any) {
    console.error('Error creating blocked date:', error);
    res.status(500).json({ error: error.message || 'Failed to create blocked date' });
  }
};

/**
 * Delete blocked date (Admin only)
 * DELETE /api/blocked-dates/:id
 */
export const deleteBlockedDate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await timeSlotService.deleteBlockedDate(id);
    res.json({ message: 'Blocked date deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting blocked date:', error);
    res.status(500).json({ error: error.message || 'Failed to delete blocked date' });
  }
};

// ============================================
// BLOCKED TIME SLOTS
// ============================================

/**
 * Get all blocked time slots
 * GET /api/blocked-time-slots
 */
export const getAllBlockedTimeSlots = async (req: Request, res: Response) => {
  try {
    const slots = await timeSlotService.getAllBlockedTimeSlots();
    res.json(slots);
  } catch (error: any) {
    console.error('Error fetching blocked time slots:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch blocked time slots' });
  }
};

/**
 * Create blocked time slot (Admin only)
 * POST /api/blocked-time-slots
 */
export const createBlockedTimeSlot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { time_slot_id, blocked_date, is_recurring, day_of_week, reason } = req.body;

    if (!time_slot_id) {
      return res.status(400).json({ error: 'time_slot_id is required' });
    }

    if (!blocked_date && !is_recurring) {
      return res.status(400).json({ error: 'Either blocked_date or is_recurring must be provided' });
    }

    if (is_recurring && day_of_week === undefined) {
      return res.status(400).json({ error: 'day_of_week is required for recurring blocks' });
    }

    const blocked = await timeSlotService.createBlockedTimeSlot({
      time_slot_id,
      blocked_date,
      is_recurring,
      day_of_week,
      reason,
      created_by: userId,
    });

    res.status(201).json(blocked);
  } catch (error: any) {
    console.error('Error creating blocked time slot:', error);
    res.status(500).json({ error: error.message || 'Failed to create blocked time slot' });
  }
};

/**
 * Delete blocked time slot (Admin only)
 * DELETE /api/blocked-time-slots/:id
 */
export const deleteBlockedTimeSlot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await timeSlotService.deleteBlockedTimeSlot(id);
    res.json({ message: 'Blocked time slot deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting blocked time slot:', error);
    res.status(500).json({ error: error.message || 'Failed to delete blocked time slot' });
  }
};
