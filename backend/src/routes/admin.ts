import { Router } from 'express';
import { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as courseController from '../modules/admin/controllers/courseController';
import * as teacherController from '../modules/admin/controllers/teacherController';
import * as courseArchivalController from '../modules/admin/controllers/courseArchivalController';
import * as teacherPricingService from '../modules/teacher/services/teacherPricingService';

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

// Course Archival System
router.post('/courses/:courseId/archive', courseArchivalController.archiveCourse);
router.post('/courses/:courseId/restore', courseArchivalController.restoreCourse);
router.get('/courses/archived', courseArchivalController.getArchivedCourses);
router.get('/courses/:courseId/archive-details', courseArchivalController.getCourseArchiveDetails);
router.delete('/courses/:courseId/permanent', courseArchivalController.permanentlyDeleteCourse);
router.get('/archive-statistics', courseArchivalController.getArchiveStatistics);
router.post('/courses/:courseId/convert-to-prerecorded', courseArchivalController.convertToPreRecorded);

export default router;
