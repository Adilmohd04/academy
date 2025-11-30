/**
 * Express Type Augmentation
 * 
 * Extends Express Request type to include Clerk auth property.
 * This matches Clerk's auth type structure and fixes TypeScript errors.
 */

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        orgId?: string;
        role?: string;
        email?: string;
        [key: string]: any;
      };
    }
  }
}

export {};
