/**
 * Express Type Augmentation (Runtime Import)
 * 
 * This file can be imported to ensure the Express type augmentation is loaded.
 * It augments Express.Request to include the Clerk auth property.
 */

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId?: string;
        sessionId?: string;
        orgId?: string;
        role?: string;
        email?: string;
        [key: string]: unknown;
      };
    }
  }
}

export {};
