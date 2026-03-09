import { Router } from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import * as userController from '../modules/user/controllers/userController';

const router = Router();

// Apply Clerk middleware
router.use(clerkMiddleware());

// Language preference routes
router.get(
  '/language-preference',
  requireAuth,
  userController.getLanguagePreference
);

router.patch(
  '/language-preference',
  requireAuth,
  userController.updateLanguagePreference
);

export default router;
