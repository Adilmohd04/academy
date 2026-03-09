import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as announcementController from '../modules/admin/controllers/announcementController';

const router = Router();

// Public/Student routes
router.get('/announcements', announcementController.getAnnouncements);

// Admin routes
router.post('/admin/announcements', requireAuth, announcementController.createAnnouncement);
router.put('/admin/announcements/:id', requireAuth, announcementController.updateAnnouncement);
router.delete('/admin/announcements', requireAuth, announcementController.deleteAnnouncement);

export default router;
