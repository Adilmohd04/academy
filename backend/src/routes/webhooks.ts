/**
 * Webhook Routes
 * 
 * Handles incoming webhooks from external services like Clerk.
 * Webhooks bypass authentication middleware as they use webhook secrets.
 */

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { UserService } from '../services/userService';
import { UserRole } from '../types';

const router = Router();

// Webhook secret from Clerk dashboard
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    public_metadata?: {
      role?: UserRole;
    };
  };
}

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events for user synchronization
 * 
 * Events handled:
 * - user.created: Create new user in database
 * - user.updated: Update existing user
 * - user.deleted: Soft delete user
 */
router.post('/clerk', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const payload = JSON.stringify(req.body);
    const headers = req.headers;

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: ClerkWebhookEvent;

    try {
      evt = wh.verify(payload, {
        'svix-id': headers['svix-id'] as string,
        'svix-timestamp': headers['svix-timestamp'] as string,
        'svix-signature': headers['svix-signature'] as string,
      }) as ClerkWebhookEvent;
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Handle different event types
    const { type, data } = evt;

    switch (type) {
      case 'user.created':
        // Create new user in database
        await UserService.upsertUser(data.id, {
          email: data.email_addresses?.[0]?.email_address || '',
          firstName: data.first_name,
          lastName: data.last_name,
          role: (data.public_metadata?.role as UserRole) || 'student',
        });
        console.log(`✅ User created: ${data.id}`);
        break;

      case 'user.updated':
        // Update existing user
        await UserService.upsertUser(data.id, {
          email: data.email_addresses?.[0]?.email_address || '',
          firstName: data.first_name,
          lastName: data.last_name,
          role: (data.public_metadata?.role as UserRole) || 'student',
        });
        console.log(`✅ User updated: ${data.id}`);
        break;

      case 'user.deleted':
        // Soft delete user (mark as inactive)
        await UserService.deleteUser(data.id);
        console.log(`✅ User deleted: ${data.id}`);
        break;

      default:
        console.log(`⚠️ Unhandled webhook event: ${type}`);
    }

    // Acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message,
    });
  }
});

export default router;
