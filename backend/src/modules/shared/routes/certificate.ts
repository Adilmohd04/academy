/**
 * Certificate Routes
 * 
 * Routes for certificate management and verification
 */

import { Router } from 'express';
import * as certificateController from '../controllers/certificateController';
import { requireAuth as authenticate, requireRole } from '../../../middleware/clerkAuth';

// Helper to match existing route pattern
const authorizeRole = (roles: string[]) => requireRole(roles);

const router = Router();

// ============================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================

/**
 * Verify certificate by code
 * GET /api/certificates/verify/:code
 * 
 * Anyone can verify a certificate by scanning QR code
 */
router.get('/verify/:code', certificateController.verifyCertificate);

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * Get my certificates (student)
 * GET /api/certificates/my
 */
router.get('/my', authenticate, certificateController.getMyCertificates);

/**
 * Get certificate by ID
 * GET /api/certificates/:certificateId
 */
router.get('/:certificateId', authenticate, certificateController.getCertificate);

/**
 * Get certificate HTML for preview/print
 * GET /api/certificates/:certificateId/html
 */
router.get('/:certificateId/html', authenticate, certificateController.getCertificateHTML);

/**
 * Download certificate as PDF
 * GET /api/certificates/:certificateId/pdf
 */
router.get('/:certificateId/pdf', authenticate, certificateController.downloadCertificatePDF);

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all certificates (admin view)
 * GET /api/certificates
 * 
 * Query params:
 *   - courseId: Filter by course
 *   - status: Filter by status (valid, revoked)
 *   - limit: Pagination limit
 *   - offset: Pagination offset
 */
router.get('/', authenticate, authorizeRole(['admin']), certificateController.getAllCertificates);

/**
 * Issue certificate to student
 * POST /api/certificates/courses/:courseId/students/:studentId
 * 
 * Body: { final_grade, is_manual_override?, override_reason? }
 */
router.post(
  '/courses/:courseId/students/:studentId',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  certificateController.issueCertificate
);

/**
 * Revoke certificate
 * POST /api/certificates/:certificateId/revoke
 * 
 * Body: { reason }
 */
router.post(
  '/:certificateId/revoke',
  authenticate,
  authorizeRole(['admin']),
  certificateController.revokeCertificate
);

/**
 * Reinstate revoked certificate
 * POST /api/certificates/:certificateId/reinstate
 */
router.post(
  '/:certificateId/reinstate',
  authenticate,
  authorizeRole(['admin']),
  certificateController.reinstateCertificate
);

/**
 * Get verification stats for certificate
 * GET /api/certificates/:certificateId/verification-stats
 */
router.get(
  '/:certificateId/verification-stats',
  authenticate,
  authorizeRole(['admin']),
  certificateController.getVerificationStats
);

export default router;
