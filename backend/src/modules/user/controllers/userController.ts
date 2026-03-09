import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

/**
 * Get user language preference
 * GET /api/user/language-preference
 */
export const getLanguagePreference = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      preferred_language: profile?.preferred_language || 'en'
    });
  } catch (error: any) {
    console.error('Error fetching language preference:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch language preference' });
  }
};

/**
 * Update user language preference
 * PATCH /api/user/language-preference
 */
export const updateLanguagePreference = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { language } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate language
    const validLanguages = ['en', 'ta', 'ar'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ 
        error: 'Invalid language',
        message: 'Language must be one of: en (English), ta (Tamil), ar (Arabic)'
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ preferred_language: language })
      .eq('clerk_user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Language preference updated',
      preferred_language: data.preferred_language
    });
  } catch (error: any) {
    console.error('Error updating language preference:', error);
    res.status(500).json({ error: error.message || 'Failed to update language preference' });
  }
};
