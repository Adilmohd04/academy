'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Settings, DollarSign, Save, RefreshCw, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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

      setMessage({ type: 'success', text: 'Meeting price updated successfully.' });
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#587067]">
          <div className="h-12 w-12 rounded-full border-2 border-[#1f5b4b] border-t-transparent animate-spin" />
          <p className="text-sm font-medium">Loading settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-wrap space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(230,225,213,0.95)] bg-[#20342d] p-8 text-white shadow-[0_20px_55px_rgba(18,30,24,0.18)]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(199,169,107,0.32) 0, transparent 30%), radial-gradient(circle at 85% 0%, rgba(255,255,255,0.10) 0, transparent 24%), radial-gradient(circle at 100% 100%, rgba(31,91,75,0.34) 0, transparent 30%)' }} />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="admin-kicker !bg-white/10 !text-white !border-white/10 mb-3">Platform settings</p>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">System settings</h1>
            <p className="mt-3 max-w-2xl text-white/75 leading-7">Control the meeting price from a cleaner settings workspace with stronger hierarchy and fewer distractions.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <MiniStat label="Current price" value={`₹${meetingPrice || '0'}`} icon={<DollarSign className="h-4 w-4" />} />
            <MiniStat label="Safe state" value={message?.type === 'success' ? 'Saved' : 'Ready'} icon={<ShieldCheck className="h-4 w-4" />} />
            <MiniStat label="Theme" value="Premium" icon={<Sparkles className="h-4 w-4" />} />
            <MiniStat label="Refresh" value="Live" icon={<RefreshCw className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      {message && (
        <div className={`admin-panel px-4 py-3 ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="admin-panel p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#f4f1ea] p-3 text-[#1f5b4b] border border-[#e6e1d5] shadow-sm">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <h2 className="admin-section-title">Meeting price</h2>
                <p className="text-sm text-[#6f7a72]">Sets the default price for one-on-one meetings.</p>
              </div>
            </div>
            <button onClick={loadSettings} className="admin-btn-muted rounded-full p-3" title="Refresh settings">
              <RefreshCw className="h-5 w-5 text-[#1f5b4b]" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#4a554e] mb-2">Price (INR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7b857d] text-lg">₹</span>
                <input
                  type="number"
                  value={meetingPrice}
                  onChange={(e) => setMeetingPrice(e.target.value)}
                  min="0"
                  step="10"
                  className="admin-panel w-full pl-9 pr-4 py-3 text-lg font-semibold"
                  placeholder="100"
                />
              </div>
              <p className="mt-2 text-sm text-[#6f7a72]">
                Students will see <span className="font-bold text-[#1f5b4b]">₹{meetingPrice || '0'}</span> when scheduling meetings.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6e1d5] bg-[#fbfaf7] p-4">
              <h3 className="font-semibold text-[#1f2a24] mb-2">How it works</h3>
              <ul className="space-y-2 text-sm text-[#6f7a72]">
                <li>• Students see this price before payment.</li>
                <li>• Changes apply immediately to new bookings.</li>
                <li>• Existing bookings are not affected.</li>
              </ul>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="admin-btn-primary w-full rounded-2xl py-3 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </section>

        <aside className="admin-panel p-6 space-y-5">
          <div>
            <p className="admin-kicker mb-2">Policy note</p>
            <h3 className="admin-section-title">Pricing guidance</h3>
          </div>
          <div className="space-y-3 text-sm text-[#6f7a72] leading-6">
            <p>All amounts remain in Indian Rupees (INR).</p>
            <p>Meeting price changes affect future bookings only.</p>
            <p>Use a consistent fee to keep the booking flow predictable.</p>
          </div>
          <div className="rounded-2xl border border-[#e6e1d5] bg-[#fbfaf7] p-4">
            <h4 className="font-semibold text-[#1f2a24] mb-2">Operational note</h4>
            <p className="text-sm text-[#6f7a72]">Keep the default pricing simple so teachers and parents can understand the booking flow at a glance.</p>
          </div>
        </aside>
      </div>

      <div className="admin-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f5b4b] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4">
      <div className="flex items-center justify-between gap-3 text-white/80 mb-3">
        <span className="text-xs uppercase tracking-[0.18em] font-semibold">{label}</span>
        <span className="rounded-full bg-white/10 p-2">{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-white truncate">{value}</p>
    </div>
  )
}
