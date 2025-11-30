/**
 * Settings Routes
 * 
 * API endpoints for system settings management
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as settingsController from '../controllers/settingsController';

const router = Router();

// Public routes
router.get('/meeting-price', settingsController.getMeetingPrice);

// Admin-only routes (add role check middleware if needed)
router.use(requireAuth); // Require authentication for all routes below

router.get('/', settingsController.getAllSettings);
router.put('/meeting-price', settingsController.updateMeetingPrice);
router.put('/:key', settingsController.updateSetting);

export default router;
