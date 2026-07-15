'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, Edit2, Trash2, UserCog } from 'lucide-react';
import { adminUsersApi, type AdminUserRow } from '@/lib/adminUsersApi';

export default function UsersManagementPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const data = await adminUsersApi.getUsers(token);
      setUsers(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (user: AdminUserRow, newRole: string) => {
    try {
      const token = await getToken();
      const success = await adminUsersApi.updateRole(user.id || user.clerk_user_id, newRole, token);

      if (success) {
        setUsers(users.map(u => u.clerk_user_id === user.clerk_user_id ? { ...u, role: newRole } : u));
        setEditingUser(null);
        setEditRole('');
      }
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const token = await getToken();
      const success = await adminUsersApi.deleteUser(userId, token);

      if (success) {
        setUsers(users.filter(u => u.clerk_user_id !== userId));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-emerald-700" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-emerald-900">User Management</h1>
              <p className="text-emerald-600 mt-1">Manage users, roles, and permissions</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-400" />
            <input
              type="text"
              placeholder="Search by email, name, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-emerald-200 bg-white focus:border-emerald-400 focus:outline-none text-emerald-900"
            />
          </div>
        </div>

        {/* Role Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              roleFilter === 'all'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-white text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setRoleFilter('student')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              roleFilter === 'student'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-blue-700 border-2 border-blue-200 hover:bg-blue-50'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setRoleFilter('teacher')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              roleFilter === 'teacher'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white text-purple-700 border-2 border-purple-200 hover:bg-purple-50'
            }`}
          >
            Teachers
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              roleFilter === 'admin'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white text-orange-700 border-2 border-orange-200 hover:bg-orange-50'
            }`}
          >
            Admins
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border-2 border-emerald-100 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                  <th className="px-6 py-4 text-left font-semibold">Email</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Role</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-emerald-600">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr
                      key={user.clerk_user_id}
                      className={`${
                        index % 2 === 0 ? 'bg-emerald-50/30' : 'bg-white'
                      } border-b border-emerald-100 hover:bg-emerald-100/50 transition-colors`}
                    >
                      <td className="px-6 py-4 text-emerald-900">{user.email}</td>
                      <td className="px-6 py-4 text-emerald-900">{user.full_name}</td>
                      <td className="px-6 py-4">
                        {editingUser === user.clerk_user_id ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="px-3 py-1 rounded-lg border-2 border-emerald-300 focus:border-emerald-500 focus:outline-none text-sm text-gray-900 bg-white"
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRoleChange(user, editRole)}
                              className="px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setEditRole('');
                              }}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : user.role === 'teacher'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {(user.role || 'Unknown').charAt(0).toUpperCase() + (user.role || 'unknown').slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          {editingUser === user.clerk_user_id ? null : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingUser(user.clerk_user_id);
                                  setEditRole(user.role);
                                }}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                title="Update Role"
                              >
                                <UserCog className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(user.clerk_user_id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Delete Confirmation Modal */}
                        {deleteConfirm === user.clerk_user_id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                              <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Confirm Delete
                              </h3>
                              <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <strong>{user.full_name}</strong>?
                                This action cannot be undone.
                              </p>
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => handleDeleteUser(user.clerk_user_id)}
                                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border-2 border-emerald-100 p-4 text-center">
            <p className="text-emerald-600 text-sm font-semibold">Total Users</p>
            <p className="text-3xl font-bold text-emerald-900">{Array.isArray(users) ? users.length : 0}</p>
          </div>
          <div className="bg-white rounded-xl border-2 border-blue-100 p-4 text-center">
            <p className="text-blue-600 text-sm font-semibold">Teachers</p>
            <p className="text-3xl font-bold text-blue-900">
              {Array.isArray(users) ? users.filter(u => u.role === 'teacher').length : 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border-2 border-purple-100 p-4 text-center">
            <p className="text-purple-600 text-sm font-semibold">Students</p>
            <p className="text-3xl font-bold text-purple-900">
              {Array.isArray(users) ? users.filter(u => u.role === 'student').length : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
