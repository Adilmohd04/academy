/**
 * Settings Service
 * 
 * Manages system-wide settings and configuration
 */

import { supabase } from '../config/database';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get a setting value by key
 */
export const getSettingValue = async (key: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .single();

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }

  return data?.setting_value || null;
};

/**
 * Get meeting price (with fallback to default)
 */
export const getMeetingPrice = async (): Promise<number> => {
  const price = await getSettingValue('meeting_price');
  return price ? parseFloat(price) : 100; // Default to 100 if not set
};

/**
 * Update a setting value
 */
export const updateSetting = async (
  key: string,
  value: string,
  updatedBy?: string
): Promise<SystemSetting> => {
  const { data, error } = await supabase
    .from('system_settings')
    .update({
      setting_value: value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    })
    .eq('setting_key', key)
    .select()
    .single();

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Update meeting price
 */
export const updateMeetingPrice = async (
  price: number,
  updatedBy?: string
): Promise<SystemSetting> => {
  return updateSetting('meeting_price', price.toString(), updatedBy);
};

/**
 * Get all settings
 */
export const getAllSettings = async (): Promise<SystemSetting[]> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_key');

  if (error) {
    console.error('Error fetching all settings:', error);
    return [];
  }

  return data || [];
};

/**
 * Create or update a setting
 */
export const upsertSetting = async (
  key: string,
  value: string,
  description?: string,
  updatedBy?: string
): Promise<SystemSetting> => {
  const { data, error } = await supabase
    .from('system_settings')
    .upsert({
      setting_key: key,
      setting_value: value,
      description,
      updated_by: updatedBy,
    })
    .select()
    .single();

  if (error) {
    console.error(`Error upserting setting ${key}:`, error);
    throw new Error(error.message);
  }

  return data;
};
