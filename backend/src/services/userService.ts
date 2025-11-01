/**
 * User Service
 * 
 * Business logic for user management.
 * Handles CRUD operations and user-related functionality.
 */

import { query } from '../config/database';
import { User, UserRole } from '../types';

export class UserService {
  /**
   * Create or update user in database after Clerk authentication
   */
  static async upsertUser(clerkId: string, userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  }): Promise<User> {
    const { email, firstName, lastName, role = UserRole.STUDENT } = userData;

    const result = await query(
      `INSERT INTO users (clerk_id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (clerk_id)
       DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [clerkId, email, firstName, lastName, role]
    );

    return result.rows[0];
  }

  /**
   * Get user by Clerk ID
   */
  static async getUserByClerkId(clerkId: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE clerk_id = $1',
      [clerkId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get user by database ID
   */
  static async getUserById(id: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Update user role (Admin only)
   */
  static async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const result = await query(
      `UPDATE users 
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  /**
   * Get all users (Admin only)
   */
  static async getAllUsers(filters?: {
    role?: UserRole;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const { role, limit = 50, offset = 0 } = filters || {};

    let queryText = 'SELECT * FROM users';
    const params: any[] = [];

    if (role) {
      queryText += ' WHERE role = $1';
      params.push(role);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    const countResult = await query(
      role ? 'SELECT COUNT(*) FROM users WHERE role = $1' : 'SELECT COUNT(*) FROM users',
      role ? [role] : []
    );

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(userId: string): Promise<void> {
    await query(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }
}
