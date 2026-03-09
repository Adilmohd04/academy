import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as resourceController from '../modules/admin/controllers/resourceController';

const router = Router();

router.get('/resources', requireAuth, resourceController.getResources);
router.post('/resources', requireAuth, resourceController.createResource);
router.put('/resources/:id/status', requireAuth, resourceController.updateResourceStatus); // Admin only
router.delete('/resources/:id', requireAuth, resourceController.deleteResource);

export default router;
