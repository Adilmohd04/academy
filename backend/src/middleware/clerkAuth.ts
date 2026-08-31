/**
 * Clerk Authentication Middleware
 * 
 * Verifies Clerk JWT tokens and attaches user information to request.
 * Supports role-based access control (Admin, Teacher, Student).
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { timingSafeEqual } from 'crypto';
import config from '../config/env';

// Note: Express Request type is augmented in types/express.d.ts
// All requests now have req.auth property

const getSingleHeader = (value: string | string[] | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const secretsMatch = (providedSecret: string, configuredSecret: string): boolean => {
  const provided = Buffer.from(providedSecret);
  const configured = Buffer.from(configuredSecret);

  return provided.length === configured.length && timingSafeEqual(provided, configured);
};

const setAuthenticatedUser = async (
  req: Request,
  userId: string,
  sessionId = ''
) => {
  const user = await clerkClient.users.getUser(userId);

  req.auth = {
    userId,
    sessionId,
    role: (user.publicMetadata as any)?.role || 'student',
    email: user.emailAddresses[0]?.emailAddress,
  };
};

/**
 * Middleware to verify Clerk JWT tokens.
 *
 * `x-clerk-user-id` is deliberately not an authentication credential. A
 * browser can forge it, so protected API routes only accept a verified Clerk
 * bearer token. Server-side Next.js proxies may use the optional internal
 * bridge below, but only when they supply a separately configured shared
 * secret that is never exposed to the browser.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const e2eBypassEnabled =
      config.nodeEnv === 'development' &&
      process.env.E2E_AUTH_BYPASS === 'true' &&
      process.env.NODE_ENV !== 'production';

    const e2eRole = req.headers['x-e2e-role'] as string;
    const e2eUserId = req.headers['x-e2e-user-id'] as string;
    const e2eEmail = req.headers['x-e2e-email'] as string;

    if (e2eBypassEnabled && e2eRole && e2eUserId) {
      req.auth = {
        userId: e2eUserId,
        sessionId: 'e2e-bypass',
        role: e2eRole,
        email: e2eEmail || `${e2eUserId}@e2e.local`,
      };

      console.log('[Auth Middleware] Using E2E auth bypass:', req.auth.userId, 'Role:', req.auth.role);
      return next();
    }

    const authHeader = getSingleHeader(req.headers.authorization);

    // A supplied Authorization header is always authoritative. Do not fall
    // back to a user-id header if it is malformed or fails verification.
    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authorization header',
        });
      }

      const token = authHeader.slice('Bearer '.length).trim();
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authorization header',
        });
      }

      try {
        const sessionToken = await clerkClient.verifyToken(token, {
          secretKey: config.clerkSecretKey,
        });

        if (!sessionToken.sub) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
          });
        }

        await setAuthenticatedUser(req, sessionToken.sub, sessionToken.sid || '');
        return next();
      } catch (verifyError) {
        console.error('[Auth Middleware] Clerk token verification failed');
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }
    }

    // This bridge is intentionally opt-in and fail-closed. It supports a
    // same-team server proxy when forwarding a Clerk bearer token is not
    // possible. Never put INTERNAL_AUTH_SHARED_SECRET in a browser-visible
    // environment variable, and never treat x-clerk-user-id as sufficient.
    const internalUserId = getSingleHeader(req.headers['x-internal-auth-user-id']);
    const internalSecret = getSingleHeader(req.headers['x-internal-auth-secret']);

    if (internalUserId || internalSecret) {
      if (
        !internalUserId ||
        !internalSecret ||
        !config.internalAuthSharedSecret ||
        !secretsMatch(internalSecret, config.internalAuthSharedSecret)
      ) {
        console.warn('[Auth Middleware] Rejected an untrusted internal auth bridge request');
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication credentials',
        });
      }

      try {
        await setAuthenticatedUser(req, internalUserId, 'internal-auth-bridge');
        return next();
      } catch (error) {
        console.error('[Auth Middleware] Failed to resolve trusted bridge user');
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication credentials',
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: 'No authorization token provided',
    });
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
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without auth
  }

  // If token exists, verify it
  return requireAuth(req, res, next);
};
