import { supabase } from '../../../config/database';

const VALID_LANGUAGES = ['en', 'ta', 'ar'] as const;
type PreferredLanguage = (typeof VALID_LANGUAGES)[number];

const isPreferredLanguage = (language: unknown): language is PreferredLanguage =>
  typeof language === 'string' && VALID_LANGUAGES.includes(language as PreferredLanguage);

export class UserPreferenceService {
  static async getLanguagePreference(userId: string): Promise<PreferredLanguage | string> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      throw error;
    }

    return profile?.preferred_language || 'en';
  }

  static assertValidLanguage(language: unknown): asserts language is PreferredLanguage {
    if (!isPreferredLanguage(language)) {
      throw new Error('INVALID_LANGUAGE');
    }
  }

  static async updateLanguagePreference(userId: string, language: PreferredLanguage): Promise<PreferredLanguage | string> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ preferred_language: language })
      .eq('clerk_user_id', userId)
      .select('preferred_language')
      .single();

    if (error) {
      throw error;
    }

    return data.preferred_language;
  }
}
