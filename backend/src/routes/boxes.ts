
import express from 'express';
import * as boxApprovalController from '../modules/admin/controllers/boxApprovalController';
import { requireAuth, requireRole } from '../middleware/clerkAuth';

const router = express.Router();

// Box contents contain student contact and booking information. Every box
// operation, including the read-only queue and cron-triggerable close action,
// must be performed by an authenticated academy administrator.
router.use(requireAuth, requireRole(['admin']));

/**
 * Get all pending boxes (Admin only)
 * GET /api/boxes/pending
 */
router.get('/pending', boxApprovalController.getPendingBoxes);

/**
 * Auto-close expired boxes (Cron job)
 * POST /api/boxes/auto-close
 * NOTE: This MUST come before /:boxId routes to avoid matching "auto-close" as a boxId
 */
router.post('/auto-close', boxApprovalController.autoCloseExpiredBoxes);

/**
 * Approve entire box (Admin only)
 * POST /api/boxes/:boxId/approve
 */
router.post('/:boxId/approve', boxApprovalController.approveBox);

/**
 * Generate Google Meet link and approve box (Admin only)
 * POST /api/boxes/:boxId/generate-meeting
 */
router.post('/:boxId/generate-meeting', boxApprovalController.generateMeetingAndApprove);

/**
 * Close box manually (Admin only)
 * POST /api/boxes/:boxId/close
 */
router.post('/:boxId/close', boxApprovalController.closeBox);

export default router;
