/**
 * Teacher Analytics Routes
 * 
 * Provides teacher analytics data including profile, pricing, and meetings
 */

import express, { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { UserRole } from '../types';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * GET /api/teacher/analytics
 * Get teacher's profile, pricing, and meetings data
 */
router.get(
  '/analytics',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.ADMIN]),
  async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get teacher profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, clerk_user_id, full_name, email, role')
        .eq('clerk_user_id', userId)
        .single();

      if (profileError || !profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Get teacher pricing information (teacher_pricing.teacher_id is clerk_user_id, not UUID)
      const { data: pricingData, error: pricingError } = await supabase
        .from('teacher_pricing')
        .select('price_per_meeting, is_free')
        .eq('teacher_id', profile.clerk_user_id)
        .single();

      // If no pricing record exists, return default values
      const pricing = pricingData || {
        price_per_meeting: 0,
        is_free: true,
      };

      // Get teacher's meeting bookings with payment information
      const { data: meetings, error: meetingsError } = await supabase
        .from('meeting_bookings')
        .select(`
          id,
          student_id,
          payment_status,
          payment_amount,
          attendance,
          approval_status,
          created_at,
          teacher_slot_availability!teacher_slot_id (
            id,
            date,
            is_free,
            meeting_price,
            teacher_id
          )
        `)
        .eq('teacher_slot_availability.teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (meetingsError) {
        console.error('Error fetching meetings:', meetingsError);
        return res.status(500).json({ error: 'Failed to fetch meetings data' });
      }

      // Combine profile with pricing
      const profileWithPricing = {
        ...profile,
        teacher_price: pricing.price_per_meeting,
        hourly_price: pricing.price_per_meeting,
        is_free: pricing.is_free,
      };

      res.json({
        profile: profileWithPricing,
        meetings: meetings || [],
      });
    } catch (error: any) {
      console.error('Error fetching teacher analytics:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch teacher analytics' 
      });
    }
  }
);

export default router;
