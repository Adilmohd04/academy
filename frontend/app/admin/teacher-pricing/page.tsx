'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, Gift, Trash2, Users, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface TeacherPricing {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  profileImage?: string;
  price: number;
  isFree: boolean;
  notes?: string;
  updatedAt: string;
}

export default function TeacherPricingPage() {
  const { getToken } = useAuth();
  const [teachers, setTeachers] = useState<TeacherPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setTeachers(result.data);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
      setMessage({ type: 'error', text: 'Failed to load teachers' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (teacher: TeacherPricing) => {
    setEditingTeacher(teacher.teacherId);
    setEditPrice(teacher.price.toString());
    setEditNotes(teacher.notes || '');
  };

  const handleCancel = () => {
    setEditingTeacher(null);
    setEditPrice('');
    setEditNotes('');
  };

  const handleSave = async (teacherId: string) => {
    try {
      const price = parseFloat(editPrice);
      
      if (isNaN(price) || price < 0) {
        setMessage({ type: 'error', text: 'Please enter a valid price (0 or greater)' });
        return;
      }

      setSaving(teacherId);
      const token = await getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing/${teacherId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ price, notes: editNotes })
        }
      );

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Price updated successfully!' });
        setEditingTeacher(null);
        loadTeachers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to update price');
      }
    } catch (error) {
      console.error('Error saving price:', error);
      setMessage({ type: 'error', text: 'Failed to save price' });
    } finally {
      setSaving(null);
    }
  };

  const handleSetFree = async (teacherId: string) => {
    try {
      setSaving(teacherId);
      const token = await getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing/${teacherId}/free`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ notes: 'FREE meeting offer' })
        }
      );

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Teacher set to FREE!' });
        loadTeachers();
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to set FREE');
      }
    } catch (error) {
      console.error('Error setting FREE:', error);
      setMessage({ type: 'error', text: 'Failed to set FREE' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4 transition"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Teacher Pricing</h1>
                <p className="text-gray-500 mt-1">Set custom prices for each teacher</p>
              </div>
            </div>
            <button
              onClick={loadTeachers}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 How Teacher Pricing Works:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Custom Price:</strong> Set any price for each teacher (₹50, ₹100, ₹500, etc.)</li>
            <li>• <strong>FREE Meetings:</strong> Set price to ₹0 for promotional offers</li>
            <li>• <strong>Student View:</strong> Students see the teacher-specific price when booking</li>
            <li>• <strong>Instant Updates:</strong> Changes apply immediately to new bookings</li>
          </ul>
        </div>

        {/* Teachers List */}
        <div className="grid gap-6">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                {/* Teacher Info */}
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    {teacher.teacherName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{teacher.teacherName}</h3>
                    <p className="text-sm text-gray-500">{teacher.teacherEmail}</p>
                    
                    {editingTeacher === teacher.teacherId ? (
                      /* Edit Mode */
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price (INR)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              min="0"
                              step="10"
                              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                              placeholder="100"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Set to 0 for FREE meetings</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                            placeholder="e.g., Senior teacher, Expert in Math"
                          />
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleSave(teacher.teacherId)}
                            disabled={saving === teacher.teacherId}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            {saving === teacher.teacherId ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                <span>Save</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="mt-4">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className={`text-2xl font-bold ${teacher.isFree ? 'text-green-600' : 'text-indigo-600'}`}>
                            {teacher.isFree ? (
                              <span className="flex items-center">
                                <Gift className="h-6 w-6 mr-2" />
                                FREE
                              </span>
                            ) : (
                              `₹${teacher.price}`
                            )}
                          </div>
                          {teacher.notes && (
                            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                              {teacher.notes}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Last updated: {new Date(teacher.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {editingTeacher !== teacher.teacherId && (
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm"
                    >
                      Edit Price
                    </button>
                    {!teacher.isFree && (
                      <button
                        onClick={() => handleSetFree(teacher.teacherId)}
                        disabled={saving === teacher.teacherId}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm flex items-center justify-center disabled:opacity-50"
                      >
                        {saving === teacher.teacherId ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Gift className="h-4 w-4 mr-1" />
                            Set FREE
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
