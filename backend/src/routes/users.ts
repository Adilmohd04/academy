/**
 * User Routes
 * 
 * RESTful API endpoints for user management.
 * 
 * Routes:
 * - GET    /api/users/profile     - Get current user profile
 * - PUT    /api/users/profile     - Update current user profile
 * - GET    /api/users             - Get all users (Admin only)
 * - PUT    /api/users/:id/role    - Update user role (Admin only)
 * - DELETE /api/users/:id         - Delete user (Admin only)
 */

import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/clerkAuth';
import { UserService } from '../services/userService';
import { UserRole } from '../types';

const router = Router();

/**
 * GET /api/users/profile
 * Get current authenticated user's profile
 */
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserService.getUserByClerkId(req.auth!.userId);

    if (!user) {
      // Create user if doesn't exist (first time login)
      const newUser = await UserService.upsertUser(req.auth!.userId, {
        email: req.auth!.email!,
        role: req.auth!.role as UserRole,
      });

      return res.json({
        success: true,
        data: newUser,
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName } = req.body;

    const user = await UserService.upsertUser(req.auth!.userId, {
      email: req.auth!.email!,
      firstName,
      lastName,
      role: req.auth!.role as UserRole,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
});

/**
 * GET /api/users
 * Get all users with filters (Admin only)
 */
router.get(
  '/',
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { role, limit, offset } = req.query;

      const result = await UserService.getAllUsers({
        role: role as UserRole,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result.users,
        pagination: {
          total: result.total,
          limit: limit || 50,
          offset: offset || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/users/:id/role
 * Update user role (Admin only)
 */
router.put(
  '/:id/role',
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role',
          validRoles: Object.values(UserRole),
        });
      }

      const user = await UserService.updateUserRole(id, role);

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: user,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user role',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/users/teachers
 * Get all teachers for admin to assign to meetings
 */
router.get('/teachers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await UserService.getAllUsers({ role: UserRole.TEACHER });

    res.json({
      success: true,
      data: result.users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await UserService.deleteUser(id);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message,
      });
    }
  }
);

export default router;
