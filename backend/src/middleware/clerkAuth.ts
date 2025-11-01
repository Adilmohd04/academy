/**
 * Clerk Authentication Middleware
 * 
 * Verifies Clerk JWT tokens and attaches user information to request.
 * Supports role-based access control (Admin, Teacher, Student).
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import config from '../config/env';

// Extend Express Request type to include user info
export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    role?: string;
    email?: string;
  };
}

/**
 * Middleware to verify Clerk JWT token
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Clerk
    try {
      const sessionToken = await clerkClient.verifyToken(token, {
        secretKey: config.clerkSecretKey,
      });

      // Attach user info to request
      req.auth = {
        userId: sessionToken.sub,
        sessionId: sessionToken.sid || '',
      };

      // Get user details from Clerk to check role
      const user = await clerkClient.users.getUser(sessionToken.sub);
      
      // Extract role from user metadata
      req.auth.role = (user.publicMetadata as any)?.role || 'student';
      req.auth.email = user.emailAddresses[0]?.emailAddress;

      next();
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * Middleware to require specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.auth?.role || 'student';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        requiredRole: allowedRoles,
        yourRole: userRole,
      });
    }

    next();
  };
};

/**
 * Optional auth - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without auth
  }

  // If token exists, verify it
  return requireAuth(req, res, next);
};
