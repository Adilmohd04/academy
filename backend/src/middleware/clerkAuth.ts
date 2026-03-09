/**
 * Clerk Authentication Middleware
 * 
 * Verifies Clerk JWT tokens and attaches user information to request.
 * Supports role-based access control (Admin, Teacher, Student).
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import config from '../config/env';

// Note: Express Request type is augmented in types/express.d.ts
// All requests now have req.auth property

/**
 * Middleware to verify Clerk JWT token
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for x-clerk-user-id header first (from Next.js API routes)
    const clerkUserId = req.headers['x-clerk-user-id'] as string;
    
    if (clerkUserId) {
      console.log('[Auth Middleware] Using x-clerk-user-id:', clerkUserId);
      
      try {
        // Get user details from Clerk
        const user = await clerkClient.users.getUser(clerkUserId);
        
        // Attach user info to request
        req.auth = {
          userId: clerkUserId,
          sessionId: '',
          role: (user.publicMetadata as any)?.role || 'student',
          email: user.emailAddresses[0]?.emailAddress,
        };
        
        console.log('[Auth Middleware] User authenticated:', req.auth.email, 'Role:', req.auth.role);
        return next();
      } catch (error) {
        console.error('[Auth Middleware] Failed to get user from Clerk:', error);
        return res.status(401).json({
          success: false,
          message: 'Invalid user ID',
        });
      }
    }
    
    // Fallback to Bearer token method
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth Middleware] No authorization provided');
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
  return (req: Request, res: Response, next: NextFunction) => {
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
  req: Request,
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
