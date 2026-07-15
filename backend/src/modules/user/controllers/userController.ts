import { Request, Response } from 'express';
import { getErrorMessage } from '../../../utils/errors';
import { UserPreferenceService } from '../services/userPreferenceService';

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

    const preferredLanguage = await UserPreferenceService.getLanguagePreference(userId);

    res.json({
      preferred_language: preferredLanguage,
    });
  } catch (error: unknown) {
    console.error('Error fetching language preference:', error);
    res.status(500).json({ error: getErrorMessage(error, 'Failed to fetch language preference') });
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

    try {
      UserPreferenceService.assertValidLanguage(language);
    } catch {
      return res.status(400).json({ 
        error: 'Invalid language',
        message: 'Language must be one of: en (English), ta (Tamil), ar (Arabic)',
      });
    }

    const preferredLanguage = await UserPreferenceService.updateLanguagePreference(userId, language);

    res.json({
      success: true,
      message: 'Language preference updated',
      preferred_language: preferredLanguage,
    });
  } catch (error: unknown) {
    console.error('Error updating language preference:', error);
    res.status(500).json({ error: getErrorMessage(error, 'Failed to update language preference') });
  }
};
