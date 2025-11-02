import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Clerk Webhook Handler
 * Receives user events from Clerk and syncs to your backend/database
 */
export async function POST(req: Request) {
  try {
    // Get webhook body
    const payload = await req.text();
    
    // Get Svix headers for verification
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // Check if we have all required headers
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing svix headers' },
        { status: 400 }
      );
    }

    // Get webhook secret from environment
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error('❌ CLERK_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify the webhook signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: any;

    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err: any) {
      console.error('❌ Webhook verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the webhook event
    const { type, data } = evt;

    console.log('✅ Clerk Webhook received:', type);

    switch (type) {
      case 'user.created':
        console.log('👤 New user created:', {
          id: data.id,
          email: data.email_addresses?.[0]?.email_address,
          firstName: data.first_name,
          lastName: data.last_name,
        });

        // TODO: Send to your backend API to store in Supabase
        // Example:
        // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/clerk`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ type, data }),
        // });

        break;

      case 'user.updated':
        console.log('✏️ User updated:', data.id);
        // TODO: Update user in your backend
        break;

      case 'user.deleted':
        console.log('🗑️ User deleted:', data.id);
        // TODO: Delete user in your backend
        break;

      default:
        console.log('⚠️ Unhandled event type:', type);
    }

    return NextResponse.json(
      { success: true, message: 'Webhook processed' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
