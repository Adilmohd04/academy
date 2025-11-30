/**
 * User Service
 * 
 * Business logic for user management using Supabase.
 * Handles CRUD operations and user-related functionality.
 */

import { supabase } from '../config/database';
import { User, UserRole } from '../types';

export class UserService {
  /**
   * Create or update user in database
   */
  static async upsertUser(clerkId: string, userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  }): Promise<any> {
    const { email, firstName, lastName, role = UserRole.STUDENT } = userData;
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        clerk_user_id: clerkId,
        email,
        full_name: fullName,
        role,
      }, {
        onConflict: 'clerk_user_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user by Clerk ID
   */
  static async getUserByClerkId(clerkId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  /**
   * Get all users with optional filtering
   */
  static async getAllUsers(filters?: {
    role?: UserRole;
    limit?: number;
    offset?: number;
  }): Promise<{ users: any[]; total: number }> {
    const { role, limit = 50, offset = 0 } = filters || {};

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      users: data || [],
      total: count || 0,
    };
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId: string, role: UserRole): Promise<any> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete user
   */
  static async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
}
