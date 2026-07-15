import { UserRole } from './index';

export interface ProfileRecord {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertUserInput {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export interface GetAllUsersFilters {
  role?: UserRole;
  limit?: number;
  offset?: number;
}

export interface GetAllUsersResult {
  users: ProfileRecord[];
  total: number;
}