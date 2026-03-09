'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Settings, DollarSign, Save, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminSettingsPage() {
  const { getToken } = useAuth();
  const [meetingPrice, setMeetingPrice] = useState<string>('100');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.settings.getMeetingPrice();
      setMeetingPrice(response.data.price.toString());
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const price = parseFloat(meetingPrice);
      
      if (isNaN(price) || price <= 0) {
        setMessage({ type: 'error', text: 'Please enter a valid price' });
        return;
      }

      setSaving(true);
      const token = await getToken();
      await api.settings.updateMeetingPrice(price, token);
      
      setMessage({ type: 'success', text: '✅ Meeting price updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-lg">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-500 mt-1">Configure platform settings and pricing</p>
              </div>
            </div>
            <button
              onClick={loadSettings}
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

        {/* Meeting Price Setting */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Meeting Price</h2>
              <p className="text-gray-600 mb-4">
                Set the default price for one-on-one meetings with teachers. This price will be shown to students when they schedule a meeting.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={meetingPrice}
                      onChange={(e) => setMeetingPrice(e.target.value)}
                      min="0"
                      step="10"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                      placeholder="100"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Current students will see: <span className="font-bold text-indigo-600">₹{meetingPrice || '0'}</span> when scheduling meetings
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">💡 How it works:</h3>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Students see this price when scheduling meetings</li>
                    <li>• Price is shown before payment is made</li>
                    <li>• Changes apply immediately to new bookings</li>
                    <li>• Existing bookings are not affected</li>
                  </ul>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-purple-900 mb-3">ℹ️ Important Information</h3>
          <div className="space-y-2 text-sm text-purple-800">
            <p>• <strong>Payment Processing:</strong> All payments are securely processed through Razorpay</p>
            <p>• <strong>Currency:</strong> All prices are in Indian Rupees (INR)</p>
            <p>• <strong>Refund Policy:</strong> No refunds are processed for booked meetings</p>
            <p>• <strong>Rescheduling:</strong> Meetings cannot be rescheduled once paid</p>
          </div>
        </div>
      </div>
    </div>
  );
}
