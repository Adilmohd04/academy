/**
 * Little Muslima Academy - Simple Students Page
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap, Search, Mail, ArrowLeft, TrendingUp
} from 'lucide-react';

interface Student {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export default function SimpleStudentsPage() {
  const { getToken } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      const studentsList = data?.filter((u: any) => u.role === 'student') || [];
      setStudents(studentsList);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
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
          <Link href="/admin/students" className="flex items-center gap-3 px-4 py-3 bg-green-50 text-green-600 rounded-lg font-medium">
            <GraduationCap className="w-5 h-5" />
            Students
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">Manage all students</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="text-sm text-gray-600">
            Total Students: <span className="font-bold text-gray-900">{students.length}</span>
          </div>
        </div>

        {/* Students List */}
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
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600">
                        {(student.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{student.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      {student.email}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No students found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
