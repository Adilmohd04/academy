'use client';

import { UserButton, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, UserCheck, GraduationCap, Shield, 
  Search, Filter, Download, RefreshCw,
  Calendar, Clock, TrendingUp, Activity,
  Settings, Bell, Mail, BarChart3, Package, DollarSign
} from 'lucide-react';

interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  created_at: string;
}

export default function AdminDashboardClient() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalTeachers: 0,
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [saveMessage, setSaveMessage] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // CSV Export function
  const exportUsersToCSV = () => {
    const csvHeaders = ['Name', 'Email', 'Role', 'Joined Date'];
    const csvRows = filteredUsers.map(user => [
      user.full_name || 'N/A',
      user.email,
      user.role,
      new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      if (!token) {
        console.warn('No auth token available, retrying...');
        // Retry after a short delay
        setTimeout(fetchAllData, 1000);
        return;
      }

      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const usersList = usersData.data || [];
        setUsers(usersList);

        // Calculate stats
        setStats({
          totalUsers: usersList.length,
          totalAdmins: usersList.filter((u: User) => u.role === 'admin').length,
          totalTeachers: usersList.filter((u: User) => u.role === 'teacher').length,
          totalStudents: usersList.filter((u: User) => u.role === 'student').length,
        });
      } else if (usersRes.status === 401) {
        console.warn('Unauthorized, token may be invalid');
        // Retry once
        setTimeout(fetchAllData, 1000);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(userId, newRole);
    setPendingChanges(newChanges);
  };

  const savePendingChanges = async () => {
    try {
      setSaveMessage('Saving changes...');
      const token = await getToken();
      
      for (const [userId, newRole] of pendingChanges) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ role: newRole })
        });
      }

      setSaveMessage('✅ Changes saved successfully!');
      setPendingChanges(new Map());
      await fetchAllData();
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ Error saving changes');
      console.error('Error saving changes:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setDeletingUserId(userToDelete.id);
      const token = await getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSaveMessage('✅ User deleted successfully!');
        await fetchAllData();
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`❌ Failed to delete user: ${errorData.message || 'Unknown error'}`);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setSaveMessage('❌ Failed to delete user');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setDeletingUserId(null);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'teacher': return <GraduationCap className="h-4 w-4" />;
      case 'student': return <UserCheck className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'teacher': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'student': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg font-medium">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-sm text-gray-500">Manage users, roles & system settings</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active platform
                </p>
              </div>
              <div className="bg-indigo-100 p-4 rounded-full">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Admins */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administrators</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAdmins}</p>
                <p className="text-xs text-gray-500 mt-1">System admins</p>
              </div>
              <div className="bg-red-100 p-4 rounded-full">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Teachers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Teachers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTeachers}</p>
                <p className="text-xs text-gray-500 mt-1">Instructors</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <GraduationCap className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">Learners</p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Meeting Approvals - CONSOLIDATED BOX + MEETING */}
          <Link
            href="/admin/meetings/approval"
            className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-bold mb-2">✅ Meeting Approval</h3>
                <p className="text-purple-100 text-sm">Approve students & send meeting links</p>
              </div>
              <Calendar className="h-10 w-10 opacity-80" />
            </div>
          </Link>

          {/* Teacher Pricing */}
          <Link
            href="/admin/teacher-pricing"
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-bold mb-2">💰 Teacher Pricing</h3>
                <p className="text-emerald-100 text-sm">Set custom price per teacher</p>
              </div>
              <DollarSign className="h-10 w-10 opacity-80" />
            </div>
          </Link>

          {/* View All Meetings */}
          <Link
            href="/admin/meetings/all"
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-bold mb-2">📋 All Meetings</h3>
                <p className="text-blue-100 text-sm">View all scheduled meetings</p>
              </div>
              <Clock className="h-10 w-10 opacity-80" />
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>User Management</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="mt-8">
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admins</option>
                    <option value="teacher">Teachers</option>
                    <option value="student">Students</option>
                  </select>
                  <button
                    onClick={fetchAllData}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    title="Refresh data"
                  >
                    <RefreshCw className="h-5 w-5 text-gray-600" />
                  </button>
                  <button 
                    onClick={exportUsersToCSV}
                    className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium"
                    title="Export to CSV"
                  >
                    <Download className="h-5 w-5" />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* User List */}
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-500">
                  {searchQuery || roleFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No users have been registered yet'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Change Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition">
                          {/* User Info with Avatar */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.full_name || 'No Name'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>

                          {/* Current Role Badge */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                              {getRoleIcon(user.role)}
                              <span className="capitalize">{user.role}</span>
                            </span>
                          </td>

                          {/* Join Date */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>

                          {/* Change Role Dropdown */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <select
                                value={pendingChanges.get(user.id) || user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                className={`text-sm text-gray-900 font-medium border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white ${
                                  pendingChanges.has(user.id)
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-300'
                                }`}
                              >
                                <option value="student" className="text-gray-900 bg-white">👨‍🎓 Student</option>
                                <option value="teacher" className="text-gray-900 bg-white">👨‍🏫 Teacher</option>
                                <option value="admin" className="text-gray-900 bg-white">🛡️ Admin</option>
                              </select>
                              {pendingChanges.has(user.id) && (
                                <span className="text-orange-500 text-xs font-medium">●</span>
                              )}
                            </div>
                          </td>

                          {/* Delete Action */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => confirmDeleteUser(user)}
                              disabled={deletingUserId === user.id}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                deletingUserId === user.id
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                              }`}
                              title="Delete User"
                            >
                              {deletingUserId === user.id ? (
                                <span className="flex items-center gap-2">
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Deleting...
                                </span>
                              ) : (
                                '🗑️ Delete'
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Save Changes Button */}
            {pendingChanges.size > 0 && (
              <div className="fixed bottom-8 right-8 z-50">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900">{pendingChanges.size} pending change{pendingChanges.size > 1 ? 's' : ''}</p>
                      <p className="text-gray-500">Click to save</p>
                    </div>
                    <button
                      onClick={savePendingChanges}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Message */}
            {saveMessage && (
              <div className="fixed top-24 right-8 z-50">
                <div className={`px-6 py-4 rounded-lg shadow-lg ${
                  saveMessage.includes('✅') ? 'bg-green-500' : 'bg-red-500'
                } text-white font-medium`}>
                  {saveMessage}
                </div>
              </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && userToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                      <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User</h3>
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to delete <strong>{userToDelete.full_name || userToDelete.email}</strong>?
                    </p>
                    <p className="text-sm text-red-600 mb-6">
                      ⚠️ This action cannot be undone. All user data will be permanently deleted.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={cancelDelete}
                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteUser}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                      >
                        Delete User
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BarChart3 className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-500 mb-6">Advanced metrics and insights coming soon</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 text-left">
              <div className="border border-gray-200 rounded-lg p-6">
                <Activity className="h-8 w-8 text-indigo-600 mb-3" />
                <p className="font-semibold text-gray-900">User Activity</p>
                <p className="text-sm text-gray-500 mt-2">Track engagement and active users</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <Calendar className="h-8 w-8 text-indigo-600 mb-3" />
                <p className="font-semibold text-gray-900">Meeting Analytics</p>
                <p className="text-sm text-gray-500 mt-2">Monitor scheduled meetings and trends</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <TrendingUp className="h-8 w-8 text-indigo-600 mb-3" />
                <p className="font-semibold text-gray-900">Revenue Reports</p>
                <p className="text-sm text-gray-500 mt-2">Payment analytics and insights</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Settings className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">System Settings</h3>
            <p className="text-gray-500">Configure platform settings and preferences</p>
          </div>
        )}
      </div>
    </div>
  );
}
