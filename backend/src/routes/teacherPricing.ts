import express from 'express';
import * as teacherPricingController from '../controllers/teacherPricingController';

const router = express.Router();

/**
 * Get price for specific teacher (Public - used by students)
 * GET /api/teacher-pricing/:teacherId
 */
router.get('/:teacherId', teacherPricingController.getTeacherPrice);

/**
 * Get all teachers with pricing (Admin only)
 * GET /api/teacher-pricing
 */
router.get('/', teacherPricingController.getAllTeacherPricing);

/**
 * Update teacher price (Admin only)
 * PUT /api/teacher-pricing/:teacherId
 */
router.put('/:teacherId', teacherPricingController.updateTeacherPrice);

/**
 * Set teacher to FREE (Admin only)
 * POST /api/teacher-pricing/:teacherId/free
 */
router.post('/:teacherId/free', teacherPricingController.setTeacherFree);

/**
 * Reset teacher to global price (Admin only)
 * DELETE /api/teacher-pricing/:teacherId
 */
router.delete('/:teacherId', teacherPricingController.resetTeacherPrice);

export default router;
