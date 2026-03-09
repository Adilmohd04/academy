/**
 * Profile Repository
 * 
 * Database access layer for profiles (users) table.
 */

import { BaseRepository } from './BaseRepository';

export interface ProfileRecord {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar_url?: string;
  bio?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

class ProfileRepository extends BaseRepository<ProfileRecord> {
  constructor() {
    super('profiles');
  }

  /**
   * Find profile by Clerk user ID.
   */
  async findByClerkId(clerkUserId: string): Promise<ProfileRecord | null> {
    return this.findOne({ clerk_user_id: clerkUserId });
  }

  /**
   * Find all profiles with a specific role.
   */
  async findByRole(role: string): Promise<ProfileRecord[]> {
    return this.findMany({ role }, {
      orderBy: { column: 'full_name', ascending: true },
    });
  }

  /**
   * Find all teachers.
   */
  async findTeachers(): Promise<ProfileRecord[]> {
    return this.findByRole('teacher');
  }

  /**
   * Upsert a profile (used by Clerk webhook).
   */
  async upsertByClerkId(
    clerkUserId: string,
    payload: Partial<ProfileRecord>,
  ): Promise<ProfileRecord> {
    const { data, error } = await this.client
      .from(this.table)
      .upsert(
        { ...payload, clerk_user_id: clerkUserId, updated_at: new Date().toISOString() },
        { onConflict: 'clerk_user_id' },
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
    return data as ProfileRecord;
  }
}

export const profileRepository = new ProfileRepository();
export default ProfileRepository;
