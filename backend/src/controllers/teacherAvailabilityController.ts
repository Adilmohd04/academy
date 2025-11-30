import { Response } from 'express';
import teacherAvailabilityService from '../services/teacherAvailabilityService';
import { ClerkRequest } from '../types';

export class TeacherAvailabilityController {
  /**
   * POST /api/teacher/availability/weekly
   * Save teacher's weekly availability
   */
  async saveWeeklyAvailability(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const teacherId = req.auth!.userId;
      const { weekStartDate, availability } = req.body;

      if (!weekStartDate || !availability || !Array.isArray(availability)) {
        res.status(400).json({ 
          error: 'weekStartDate and availability array are required' 
        });
        return;
      }

      const result = await teacherAvailabilityService.saveWeeklyAvailability(
        teacherId,
        weekStartDate,
        availability
      );

      res.status(200).json({
        message: 'Weekly availability saved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error saving weekly availability:', error);
      res.status(500).json({ 
        error: 'Failed to save weekly availability' 
      });
    }
  }

  /**
   * POST /api/teacher/availability/slots
   * Save teacher's slot availability with capacity
   */
  async saveSlotAvailability(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const teacherId = req.auth!.userId;
      const { slots } = req.body;

      if (!slots || !Array.isArray(slots)) {
        res.status(400).json({ 
          error: 'slots array is required' 
        });
        return;
      }

      const result = await teacherAvailabilityService.saveSlotAvailability(
        teacherId,
        slots
      );

      res.status(200).json({
        message: 'Slot availability saved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error saving slot availability:', error);
      res.status(500).json({ 
        error: 'Failed to save slot availability' 
      });
    }
  }

  /**
   * GET /api/teacher/availability/weekly/:weekStartDate
   * Get teacher's weekly availability
   */
  async getWeeklyAvailability(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const teacherId = req.auth!.userId;
      const { weekStartDate } = req.params;

      const result = await teacherAvailabilityService.getWeeklyAvailability(
        teacherId,
        weekStartDate
      );

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('Error getting weekly availability:', error);
      res.status(500).json({ 
        error: 'Failed to get weekly availability' 
      });
    }
  }

  /**
   * GET /api/teacher/availability/slots?startDate=xxx&endDate=xxx
   * Get teacher's slot availability
   */
  async getSlotAvailability(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const teacherId = req.auth!.userId;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'startDate and endDate are required' 
        });
        return;
      }

      const result = await teacherAvailabilityService.getSlotAvailability(
        teacherId,
        startDate as string,
        endDate as string
      );

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('Error getting slot availability:', error);
      res.status(500).json({ 
        error: 'Failed to get slot availability' 
      });
    }
  }

  /**
   * GET /api/teacher/:teacherId/available-slots?startDate=xxx&endDate=xxx
   * Get available slots for students (public)
   */
  async getAvailableSlotsForStudent(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const { teacherId } = req.params;
      const { startDate, endDate, studentId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'startDate and endDate are required' 
        });
        return;
      }

      // Use authenticated user if available, else allow explicit studentId
      let resolvedStudentId = studentId;
      if (!resolvedStudentId && req.auth && req.auth.userId) {
        resolvedStudentId = req.auth.userId;
      }

      const result = await teacherAvailabilityService.getAvailableSlotsForStudent(
        teacherId,
        startDate as string,
        endDate as string,
        resolvedStudentId as string
      );

      // Log to verify is_free field is present
      console.log('Available slots for student:', result.map(s => ({ id: s.id, date: s.date, is_free: s.is_free, topic: s.topic })));

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('Error getting available slots:', error);
      res.status(500).json({ 
        error: 'Failed to get available slots' 
      });
    }
  }

  /**
   * GET /api/teacher/:teacherId/available-dates?month=YYYY-MM
   * Get available dates for a teacher (for date picker)
   */
  async getAvailableDates(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const { teacherId } = req.params;
      const { month } = req.query;

      if (!month) {
        res.status(400).json({ 
          error: 'month (YYYY-MM) is required' 
        });
        return;
      }

      const result = await teacherAvailabilityService.getAvailableDates(
        teacherId,
        month as string
      );

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('Error getting available dates:', error);
      res.status(500).json({ 
        error: 'Failed to get available dates' 
      });
    }
  }

  /**
   * GET /api/teacher/availability/slot/:slotId/capacity
   * Check slot capacity
   */
  async checkSlotCapacity(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const { slotId } = req.params;

      const result = await teacherAvailabilityService.checkSlotCapacity(slotId);

      res.status(200).json({ data: result });
    } catch (error) {
      console.error('Error checking slot capacity:', error);
      res.status(500).json({ 
        error: 'Failed to check slot capacity' 
      });
    }
  }

  /**
   * GET /api/teachers/with-availability
   * Get all teachers who have availability
   */
  async getTeachersWithAvailability(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const result = await teacherAvailabilityService.getTeachersWithAvailability();
      res.status(200).json({ data: result });
    } catch (error) {
      console.error('Error getting teachers with availability:', error);
      res.status(500).json({ 
        error: 'Failed to get teachers' 
      });
    }
  }

  /**
   * DELETE /api/teacher/availability/slot/:slotId
   * Delete slot availability
   */
  async deleteSlotAvailability(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const teacherId = req.auth!.userId;
      const { slotId } = req.params;

      await teacherAvailabilityService.deleteSlotAvailability(teacherId, slotId);

      res.status(200).json({
        message: 'Slot availability deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting slot availability:', error);
      res.status(400).json({ 
        error: error.message || 'Failed to delete slot availability' 
      });
    }
  }

  /**
   * GET /api/teacher-availability/slots/:teacherId/available
   * Get all available slots for a specific teacher (for students to book)
   */
  async getAvailableSlotsForTeacher(req: ClerkRequest, res: Response): Promise<void> {
    try {
      const { teacherId } = req.params;

      if (!teacherId) {
        res.status(400).json({ error: 'Teacher ID is required' });
        return;
      }

      // Use the available_teacher_slots view to get slots with capacity info
      const result = await teacherAvailabilityService.getAvailableSlotsForTeacher(teacherId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting teacher available slots:', error);
      res.status(500).json({ 
        error: 'Failed to get available slots' 
      });
    }
  }
}

export default new TeacherAvailabilityController();
