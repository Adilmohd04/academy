/**
 * Little Muslima Academy - Simple Teachers Page
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Search, Mail, ArrowLeft, Star
} from 'lucide-react';

interface Teacher {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export default function SimpleTeachersPage() {
  const { getToken } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      const teachersList = data?.filter((u: any) => u.role === 'teacher') || [];
      setTeachers(teachersList);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Little Muslima</h1>
          <p className="text-sm text-gray-500">Admin Portal</p>
        </div>

        <nav className="space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <Link href="/admin/teachers" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium">
            <Users className="w-5 h-5" />
            Teachers
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600 mt-1">Manage all teachers</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="text-sm text-gray-600">
            Total Teachers: <span className="font-bold text-gray-900">{teachers.length}</span>
          </div>
        </div>

        {/* Teachers List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-900">Name</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-900">Email</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-900">Joined</th>
                <th className="text-center p-4 text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                        {teacher.full_name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{teacher.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      {teacher.email}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    {new Date(teacher.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTeachers.length === 0 && (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No teachers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
