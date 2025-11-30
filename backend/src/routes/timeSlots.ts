/**
 * Time Slot Routes
 * 
 * Handles all time slot and availability-related API endpoints
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as timeSlotController from '../controllers/timeSlotController';

const router = Router();

// ============================================
// TIME SLOTS (Public & Protected)
// ============================================

// Get all time slots (Public - can filter by active_only)
router.get('/time-slots', timeSlotController.getAllTimeSlots);

// Get available time slots (Public)
router.get('/time-slots/available', timeSlotController.getAvailableTimeSlots);

// Get available slots for specific date (Public)
router.get('/time-slots/available/:date', timeSlotController.getAvailableSlotsForDate);

// Check if date is available (Public)
router.get('/time-slots/check-date/:date', timeSlotController.checkDateAvailability);

// Check if time slot is available on date (Public)
router.get('/time-slots/check-availability', timeSlotController.checkTimeSlotAvailability);

// Get time slot by ID (Public)
router.get('/time-slots/:id', timeSlotController.getTimeSlotById);

// Create time slot (Admin only)
router.post('/time-slots', requireAuth, timeSlotController.createTimeSlot);

// Update time slot (Admin only)
router.put('/time-slots/:id', requireAuth, timeSlotController.updateTimeSlot);

// Delete time slot (Admin only)
router.delete('/time-slots/:id', requireAuth, timeSlotController.deleteTimeSlot);

// Toggle time slot status (Admin only)
router.put('/time-slots/:id/toggle', requireAuth, timeSlotController.toggleTimeSlotStatus);

// ============================================
// BLOCKED DATES (Admin only)
// ============================================

// Get all blocked dates
router.get('/blocked-dates', requireAuth, timeSlotController.getAllBlockedDates);

// Create blocked date
router.post('/blocked-dates', requireAuth, timeSlotController.createBlockedDate);

// Delete blocked date
router.delete('/blocked-dates/:id', requireAuth, timeSlotController.deleteBlockedDate);

// ============================================
// BLOCKED TIME SLOTS (Admin only)
// ============================================

// Get all blocked time slots
router.get('/blocked-time-slots', requireAuth, timeSlotController.getAllBlockedTimeSlots);

// Create blocked time slot
router.post('/blocked-time-slots', requireAuth, timeSlotController.createBlockedTimeSlot);

// Delete blocked time slot
router.delete('/blocked-time-slots/:id', requireAuth, timeSlotController.deleteBlockedTimeSlot);

export default router;
