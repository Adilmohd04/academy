import express from 'express';
import teacherAvailabilityController from '../controllers/teacherAvailabilityController';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { UserRole } from '../types';

const router = express.Router();

// Teacher routes (protected - teacher only)
router.post(
  '/availability/weekly',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.ADMIN]),
  teacherAvailabilityController.saveWeeklyAvailability.bind(teacherAvailabilityController)
);

router.post(
  '/availability/slots',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.ADMIN]),
  teacherAvailabilityController.saveSlotAvailability.bind(teacherAvailabilityController)
);

router.get(
  '/availability/weekly/:weekStartDate',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.ADMIN]),
  teacherAvailabilityController.getWeeklyAvailability.bind(teacherAvailabilityController)
);

router.get(
  '/availability/slots',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.ADMIN]),
  teacherAvailabilityController.getSlotAvailability.bind(teacherAvailabilityController)
);

router.delete(
  '/availability/slot/:slotId',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.ADMIN]),
  teacherAvailabilityController.deleteSlotAvailability.bind(teacherAvailabilityController)
);

// Public routes (for students to view teacher availability)
router.get(
  '/:teacherId/available-slots',
  teacherAvailabilityController.getAvailableSlotsForStudent.bind(teacherAvailabilityController)
);

router.get(
  '/:teacherId/available-dates',
  teacherAvailabilityController.getAvailableDates.bind(teacherAvailabilityController)
);

router.get(
  '/availability/slot/:slotId/capacity',
  teacherAvailabilityController.checkSlotCapacity.bind(teacherAvailabilityController)
);

router.get(
  's/with-availability',
  teacherAvailabilityController.getTeachersWithAvailability.bind(teacherAvailabilityController)
);

// Get available slots for a specific teacher (for students to book)
router.get(
  '/slots/:teacherId/available',
  requireAuth,
  teacherAvailabilityController.getAvailableSlotsForTeacher.bind(teacherAvailabilityController)
);

export default router;
