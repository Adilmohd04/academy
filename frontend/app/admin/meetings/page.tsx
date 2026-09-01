'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Filter, Calendar, Clock,
  Loader2, DollarSign, Sparkles, CheckCircle, AlertCircle, XCircle,
  MoreHorizontal
} from 'lucide-react';

interface Meeting {
  id: string;
  student_id: string;
  teacher_id: string;
  student_name: string;
  student_email: string;
  teacher_name: string;
  teacher_email: string;
  status: string;
  meeting_date?: string;
  meeting_time?: string;
  payment_status?: string;
  amount?: number;
  created_at: string;
  notes?: string;
  topic?: string;
}

export default function AllMeetingsPage() {
  const { getToken } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllMeetings();
  }, []);

  useEffect(() => {
    filterMeetings();
  }, [meetings, searchTerm, statusFilter]);

  const fetchAllMeetings = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');

      // Keep this on the protected same-origin route. It has the admin
      // authorization check and returns the display shape used below.
      const response = await fetch('/api/meetings/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load meetings.');
      }

      setMeetings(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setLoading(false);
    }
  };

  const filterMeetings = () => {
    let filtered = meetings;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.topic?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMeetings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const stats = {
    total: meetings.length,
    pending: meetings.filter(m => m.status === 'pending').length,
    approved: meetings.filter(m => m.status === 'approved').length,
    completed: meetings.filter(m => m.status === 'completed').length,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 12 }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-20"
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <motion.div 
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-white rounded-2xl shadow-sm border border-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </motion.div>
            </Link>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                All Meetings <Sparkles className="h-8 w-8 text-amber-400 fill-amber-400 animate-pulse" />
              </h1>
              <p className="text-gray-600 mt-1 text-lg font-medium">Manage and track all session activities</p>
            </div>
          </div>
          <Link href="/admin/meetings/pending-approval">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 flex items-center gap-2"
            >
              <Clock className="w-5 h-5" />
              Pending Approvals
              {stats.pending > 0 && (
                <span className="bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs font-black">
                  {stats.pending}
                </span>
              )}
            </motion.button>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Meetings', count: stats.total, icon: Calendar, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
            { label: 'Pending', count: stats.pending, icon: Clock, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
            { label: 'Approved', count: stats.approved, icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'Completed', count: stats.completed, icon: CheckCircle, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 ${stat.bg} rounded-2xl`}>
                  <stat.icon className={`h-6 w-6 ${stat.text}`} />
                </div>
                <span className={`text-4xl font-black ${stat.text}`}>{stat.count}</span>
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/50 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by student, teacher, or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium"
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Meetings Table */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-20 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Loading meetings...</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No meetings found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Topic</th>
                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {filteredMeetings.map((meeting, index) => (
                      <motion.tr 
                        key={meeting.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-blue-50/50 transition-colors group"
                      >
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{meeting.student_name}</p>
                            <p className="text-xs text-gray-500 font-medium">{meeting.student_email}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{meeting.teacher_name}</p>
                            <p className="text-xs text-gray-500 font-medium">{meeting.teacher_email}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center space-x-2 mb-1">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString() : 'Not set'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-purple-500" />
                              <span className="font-medium text-gray-500">{meeting.meeting_time || 'Not set'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-gray-700">{meeting.topic || 'No topic'}</p>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`px-4 py-1.5 text-xs font-bold rounded-full border ${getStatusColor(meeting.status)}`}>
                            {meeting.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 text-sm">
                            <div className={`p-1.5 rounded-full ${meeting.payment_status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                              <DollarSign className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-gray-900">{meeting.amount || 0}</span>
                            <span className={`text-xs font-medium ${meeting.payment_status === 'paid' ? 'text-green-600' : 'text-gray-400'}`}>
                              ({meeting.payment_status || 'pending'})
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
