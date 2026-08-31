import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as announcementController from '../modules/admin/controllers/announcementController';

const router = Router();

// Public/Student routes
router.get('/announcements', announcementController.getAnnouncements);

// Admin routes
// Require a verified Clerk session and role for every operational mutation.
// `requireAuth` resolves the Clerk user server-side; it does not trust a role
// value supplied by the browser.
router.post('/admin/announcements', requireAuth, requireRole(['admin']), announcementController.createAnnouncement);
router.put('/admin/announcements/:id', requireAuth, requireRole(['admin']), announcementController.updateAnnouncement);
router.delete('/admin/announcements', requireAuth, requireRole(['admin']), announcementController.deleteAnnouncement);

export default router;
