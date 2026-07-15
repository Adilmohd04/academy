export interface AdminUserRow {
  id?: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

const jsonHeaders = (token?: string | null) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const adminUsersApi = {
  async getUsers(token?: string | null): Promise<AdminUserRow[]> {
    const response = await fetch('/api/users', {
      headers: jsonHeaders(token),
    });

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async updateRole(userId: string, role: string, token?: string | null): Promise<boolean> {
    const response = await fetch('/api/admin/change-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...jsonHeaders(token),
      },
      body: JSON.stringify({ clerk_user_id: userId, role }),
    });

    return response.ok;
  },

  async deleteUser(userId: string, token?: string | null): Promise<boolean> {
    const response = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...jsonHeaders(token),
      },
      body: JSON.stringify({ clerk_user_id: userId }),
    });

    return response.ok;
  },
};