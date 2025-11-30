
import express from 'express';
import * as boxApprovalController from '../controllers/boxApprovalController';
import { requireAuth } from '../middleware/clerkAuth';

const router = express.Router();

/**
 * Get all pending boxes (Admin only)
 * GET /api/boxes/pending
 */
router.get('/pending', boxApprovalController.getPendingBoxes);

/**
 * Approve entire box (Admin only)
 * POST /api/boxes/:boxId/approve
 */
router.post('/:boxId/approve', requireAuth, boxApprovalController.approveBox);


/**
 * Close box manually (Admin only)
 * POST /api/boxes/:boxId/close
 */
router.post('/:boxId/close', requireAuth, boxApprovalController.closeBox);

/**
 * Auto-close expired boxes (Cron job)
 * POST /api/boxes/auto-close
 */
router.post('/auto-close', boxApprovalController.autoCloseExpiredBoxes);

export default router;
