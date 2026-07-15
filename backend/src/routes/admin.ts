import { Router } from 'express';
import { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as courseController from '../modules/admin/controllers/courseController';
import * as teacherController from '../modules/admin/controllers/teacherController';
import * as courseArchivalController from '../modules/admin/controllers/courseArchivalController';
import * as teacherPricingService from '../modules/teacher/services/teacherPricingService';
import { UserService } from '../modules/shared/services/userService';
import { UserRole } from '../types';

const router = Router();

// Apply admin middleware to all routes
router.use(requireAuth, requireRole(['admin']));

// Course Management
router.get('/courses', courseController.getAllCourses);
router.get('/courses/pending', courseController.getPendingCourses);
router.put('/courses/:id/approve', courseController.approveCourse);
router.put('/courses/:id/reject', courseController.rejectCourse);
router.put('/courses/:id/price', courseController.updateCoursePrice);
router.delete('/courses/:id', courseController.deleteCourse);
router.post('/courses/:id/co-teachers', courseController.addCoTeacher);
router.delete('/courses/:id/co-teachers/:teacherId', courseController.removeCoTeacher);

// Teacher Management
router.get('/teachers', teacherController.getAllTeachers);

// Teacher Pricing
router.post('/teacher-price', async (req: Request, res: Response) => {
  try {
    const { clerk_user_id, price } = req.body;
    await teacherPricingService.setTeacherPrice(clerk_user_id, price);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating teacher price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

router.post('/teacher-free', async (req: Request, res: Response) => {
  try {
    const { teacher_id, is_free } = req.body;
    if (is_free) {
      await teacherPricingService.setTeacherPrice(teacher_id, 0);
    } else {
      // Get global price and set teacher to paid
      const globalPriceResult = await teacherPricingService.getTeacherPrice(teacher_id);
      await teacherPricingService.setTeacherPrice(teacher_id, globalPriceResult || 100);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling teacher free status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

  // Admin: change user role via clerk_user_id (used by frontend admin UI)
  router.post('/change-role', async (req: Request, res: Response) => {
    try {
      const { clerk_user_id, role } = req.body;

      if (!clerk_user_id || !role) {
        return res.status(400).json({ success: false, message: 'Missing clerk_user_id or role' });
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role', validRoles: Object.values(UserRole) });
      }

      const profile = await UserService.getUserByClerkId(clerk_user_id);
      if (!profile) return res.status(404).json({ success: false, message: 'User profile not found' });

      await UserService.updateUserRole(profile.id, role);

      res.json({ success: true });
    } catch (error) {
      console.error('Error changing role:', error);
      res.status(500).json({ success: false, message: 'Failed to change role' });
    }
  });

  // Admin: delete user by clerk_user_id (used by frontend admin UI)
  router.delete('/delete-user', async (req: Request, res: Response) => {
    try {
      const { clerk_user_id } = req.body;
      if (!clerk_user_id) return res.status(400).json({ success: false, message: 'Missing clerk_user_id' });

      const profile = await UserService.getUserByClerkId(clerk_user_id);
      if (!profile) return res.status(404).json({ success: false, message: 'User profile not found' });

      await UserService.deleteUser(profile.id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
  });

// Course Archival System
router.post('/courses/:courseId/archive', courseArchivalController.archiveCourse);
router.post('/courses/:courseId/restore', courseArchivalController.restoreCourse);
router.get('/courses/archived', courseArchivalController.getArchivedCourses);
router.get('/courses/:courseId/archive-details', courseArchivalController.getCourseArchiveDetails);
router.delete('/courses/:courseId/permanent', courseArchivalController.permanentlyDeleteCourse);
router.get('/archive-statistics', courseArchivalController.getArchiveStatistics);
router.post('/courses/:courseId/convert-to-prerecorded', courseArchivalController.convertToPreRecorded);

export default router;
