import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { AutosaveController } from '../modules/teacher/controllers/autosaveController';

const router = express.Router();
const autosaveController = new AutosaveController();

/**
 * Auto-save routes for preventing data loss
 * All routes require authentication and teacher role
 */

const teacherAuth = [requireAuth, requireRole(['teacher', 'admin'])];
const adminAuth = [requireAuth, requireRole(['admin'])];

/**
 * @route POST /api/teacher/autosave
 * @desc Save or update draft content
 * @access Teacher only
 */
router.post('/autosave', teacherAuth, autosaveController.saveDraft);

/**
 * @route GET /api/teacher/autosave
 * @desc Get latest draft for entity
 * @access Teacher only
 */
router.get('/autosave', teacherAuth, autosaveController.getDraft);

/**
 * @route DELETE /api/teacher/autosave/:id
 * @desc Delete a specific draft
 * @access Teacher only
 */
router.delete('/autosave/:id', teacherAuth, autosaveController.deleteDraft);

/**
 * @route DELETE /api/teacher/autosave/cleanup
 * @desc Clean up expired drafts (admin/cron)
 * @access Admin only
 */
router.delete('/autosave/cleanup', adminAuth, autosaveController.cleanupExpiredDrafts);

export default router;
