import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as resourceController from '../modules/admin/controllers/resourceController';

const router = Router();

// Resource visibility is further scoped in the controller from req.auth. The
// explicit role middleware keeps unknown Clerk roles from reaching it.
router.get('/resources', requireAuth, requireRole(['admin', 'teacher', 'student']), resourceController.getResources);
router.post('/resources', requireAuth, requireRole(['admin', 'teacher']), resourceController.createResource);
router.put('/resources/:id/status', requireAuth, requireRole(['admin']), resourceController.updateResourceStatus);
router.delete('/resources/:id', requireAuth, requireRole(['admin', 'teacher']), resourceController.deleteResource);

export default router;
