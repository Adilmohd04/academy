'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Filter, Loader2, User, Mail,
  Calendar, Clock, DollarSign, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

interface Meeting {
  id: string;
  student_name: string;
  student_email: string;
  teacher_name: string;
  teacher_email: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  topic?: string;
  payment_amount: number;
  payment_status: string;
  approval_status: string;
  created_at: string;
}

export default function AllMeetingsPage() {
  const { getToken } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, approved, pending

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    filterMeetings();
  }, [meetings, searchTerm, statusFilter]);

  const fetchMeetings = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/all-meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMeetings(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
      setLoading(false);
    }
  };

  const filterMeetings = () => {
    let filtered = meetings;

    // Filter by approval status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.approval_status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.topic?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMeetings(filtered);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
              <h1 className="text-3xl font-bold text-emerald-900">All Meetings</h1>
              <p className="text-emerald-600 mt-1">
                View all meetings with payment and approval status
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-400" />
            <input
              type="text"
              placeholder="Search by student, teacher, or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-emerald-200 bg-white focus:border-emerald-400 focus:outline-none text-emerald-900"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-emerald-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-emerald-200 bg-white focus:border-emerald-400 focus:outline-none text-emerald-900"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border-2 border-emerald-100 p-4 text-center">
            <p className="text-emerald-600 text-sm font-semibold">Total Meetings</p>
            <p className="text-3xl font-bold text-emerald-900">{meetings.length}</p>
          </div>
          <div className="bg-white rounded-xl border-2 border-green-100 p-4 text-center">
            <p className="text-green-600 text-sm font-semibold">Approved</p>
            <p className="text-3xl font-bold text-green-900">
              {meetings.filter(m => m.approval_status === 'approved').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border-2 border-yellow-100 p-4 text-center">
            <p className="text-yellow-600 text-sm font-semibold">Pending</p>
            <p className="text-3xl font-bold text-yellow-900">
              {meetings.filter(m => m.approval_status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border-2 border-blue-100 p-4 text-center">
            <p className="text-blue-600 text-sm font-semibold">Total Revenue</p>
            <p className="text-3xl font-bold text-blue-900">
              ₹{meetings.reduce((sum, m) => sum + (m.payment_amount || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Meetings List */}
        <div className="bg-white rounded-xl border-2 border-emerald-100 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                  <th className="px-4 py-4 text-left font-semibold">Student</th>
                  <th className="px-4 py-4 text-left font-semibold">Teacher</th>
                  <th className="px-4 py-4 text-left font-semibold">Date & Time</th>
                  <th className="px-4 py-4 text-left font-semibold">Topic</th>
                  <th className="px-4 py-4 text-left font-semibold">Amount</th>
                  <th className="px-4 py-4 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-emerald-600">
                      <AlertCircle className="h-16 w-16 text-emerald-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-emerald-900 mb-2">No Meetings Found</h3>
                      <p>
                        {searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'No meetings have been scheduled yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMeetings.map((meeting, index) => (
                    <tr
                      key={meeting.id}
                      className={`${
                        index % 2 === 0 ? 'bg-emerald-50/30' : 'bg-white'
                      } border-b border-emerald-100 hover:bg-emerald-100/50 transition-colors`}
                    >
                      {/* Student */}
                      <td className="px-4 py-4">
                        <div className="text-emerald-900 font-semibold">{meeting.student_name}</div>
                        <div className="text-sm text-emerald-600">{meeting.student_email}</div>
                      </td>
                      
                      {/* Teacher */}
                      <td className="px-4 py-4">
                        <div className="text-emerald-900 font-semibold">{meeting.teacher_name}</div>
                        <div className="text-sm text-emerald-600">{meeting.teacher_email}</div>
                      </td>
                      
                      {/* Date & Time */}
                      <td className="px-4 py-4">
                        <div className="text-emerald-900 font-semibold">
                          {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-emerald-600">
                          {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                        </div>
                      </td>
                      
                      {/* Topic */}
                      <td className="px-4 py-4 text-emerald-900">
                        {meeting.topic || <span className="text-emerald-400 italic">No topic</span>}
                      </td>
                      
                      {/* Amount */}
                      <td className="px-4 py-4">
                        <div className="text-emerald-900 font-bold">
                          ₹{meeting.payment_amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600 font-semibold">PAID</div>
                      </td>
                      
                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          meeting.approval_status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {meeting.approval_status === 'approved' ? (
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4" />
                              <span>Pending</span>
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
