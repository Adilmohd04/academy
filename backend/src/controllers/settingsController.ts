/**
 * Settings Controller
 * 
 * Handles HTTP requests for system settings
 */

import { Request, Response } from 'express';
import * as settingsService from '../services/settingsService';

/**
 * Get meeting price
 * GET /api/settings/meeting-price
 */
export const getMeetingPrice = async (req: Request, res: Response) => {
  try {
    const price = await settingsService.getMeetingPrice();
    res.json({ price });
  } catch (error: any) {
    console.error('Error fetching meeting price:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meeting price' });
  }
};

/**
 * Update meeting price (admin only)
 * PUT /api/settings/meeting-price
 */
export const updateMeetingPrice = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { price } = req.body;

    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    const setting = await settingsService.updateMeetingPrice(parseFloat(price), userId);
    
    res.json({
      success: true,
      message: 'Meeting price updated successfully',
      setting
    });
  } catch (error: any) {
    console.error('Error updating meeting price:', error);
    res.status(500).json({ error: error.message || 'Failed to update meeting price' });
  }
};

/**
 * Get all settings (admin only)
 * GET /api/settings
 */
export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
};

/**
 * Update a setting (admin only)
 * PUT /api/settings/:key
 */
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await settingsService.updateSetting(key, value, userId);
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
};
