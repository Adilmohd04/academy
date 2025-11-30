'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TimeSlot {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
}

interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  notes: string;
}

interface SlotConfig {
  date: string;
  timeSlotId: string;
  slotName: string;
  maxCapacity: number;
  isUnlimited: boolean;
  bookingDeadlineDate: string;
  bookingDeadlineTime: string;
  notes: string;
  is_free: boolean;
  topic: string;
  description: string;
  resource_link: string;
  notes_link: string;
}

export default function TeacherAvailabilityPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date>(getMonday(new Date()));
  const [weeklyAvailability, setWeeklyAvailability] = useState<DayAvailability[]>(
    initializeWeeklyAvailability()
  );
  const [slotsToConfig, setSlotsToConfig] = useState<SlotConfig[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  // New: global loading overlay
  const [globalLoading, setGlobalLoading] = useState(false);

  // 🔒 SECURITY: Check if user is a teacher
  useEffect(() => {
    if (user) {
      const role = user.publicMetadata?.role as string;
      console.log('🔐 User role:', role);
      
      if (role !== 'teacher') {
        toast.error('Access Denied: Teachers only!');
        console.error('⛔ Unauthorized access attempt by:', role || 'unknown');
        router.replace('/dashboard'); // Use replace instead of push
        return;
      }
    }
  }, [user, router]);

  // Don't render anything if not a teacher
  if (user && user.publicMetadata?.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Access Denied</h1>
          <p className="text-gray-600">This page is for teachers only.</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Load time slots and existing availability
  useEffect(() => {
    loadData();
  }, [selectedWeek]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Load time slots with retry on 401 (token expired)
      let slotsResponse;
      try {
        slotsResponse = await api.timeSlots.getAll(true, token);
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.log('🔄 Token expired, refreshing...');
          // Wait a moment and get fresh token
          await new Promise(resolve => setTimeout(resolve, 500));
          const freshToken = await getToken();
          slotsResponse = await api.timeSlots.getAll(true, freshToken);
        } else {
          throw error;
        }
      }
      
      console.log('🔍 Loading time slots from API...');
      console.log('✅ Full API response:', slotsResponse);
      console.log('✅ Time slots data:', slotsResponse.data);
      
      // Backend returns data directly in response.data, not response.data.data
      const slots = Array.isArray(slotsResponse.data) ? slotsResponse.data : [];
      setTimeSlots(slots);
      console.log('✅ Set time slots state:', slots);
      
      if (slots.length === 0) {
        toast.error('⚠️ No time slots found. Please contact admin.', { duration: 5000 });
      }
      
      // Load existing weekly availability (optional - won't break if it fails)
      try {
        const weekStart = formatDate(selectedWeek);
        
        // Retry on 401
        let availResponse;
        try {
          availResponse = await api.teacherAvailability.getWeeklyAvailability(weekStart, token);
        } catch (error: any) {
          if (error.response?.status === 401) {
            const freshToken = await getToken();
            availResponse = await api.teacherAvailability.getWeeklyAvailability(weekStart, freshToken);
          } else {
            throw error;
          }
        }
        
        console.log('📅 Availability response:', availResponse.data);
        
        // Backend returns data directly, check if it's an array
        const availData = Array.isArray(availResponse.data) ? availResponse.data : 
                         (availResponse.data.data || []);
        
        // Always reset weeklyAvailability to unselected, then set only those returned by backend
        const baseAvailability = initializeWeeklyAvailability();
        if (availData.length > 0) {
          availData.forEach((item: any) => {
            const idx = baseAvailability.findIndex(d => d.dayOfWeek === item.day_of_week);
            if (idx !== -1) {
              baseAvailability[idx].isAvailable = !!item.is_available;
              baseAvailability[idx].notes = item.notes || '';
            }
          });
        }
        setWeeklyAvailability(baseAvailability);
        console.log('✅ Loaded availability:', baseAvailability);
        
        // 🆕 LOAD SLOT CONFIGURATIONS FOR THE WEEK
        console.log('📋 Loading slot configurations for week...');
        const weekEnd = new Date(selectedWeek);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const startDateStr = formatDate(selectedWeek);
        const endDateStr = formatDate(weekEnd);
        
        try {
          let slotsResponse;
          try {
            slotsResponse = await api.teacherAvailability.getSlotAvailability(startDateStr, endDateStr, token);
          } catch (error: any) {
            if (error.response?.status === 401) {
              const freshToken = await getToken();
              slotsResponse = await api.teacherAvailability.getSlotAvailability(startDateStr, endDateStr, freshToken);
            } else {
              throw error;
            }
          }
          
          console.log('🎰 Loaded slots response:', slotsResponse.data);
          
          const slotsData = Array.isArray(slotsResponse.data) ? slotsResponse.data : 
                           (slotsResponse.data.data || []);
          
          if (slotsData.length > 0) {
            const formattedSlots = slotsData.map((slot: any) => {
              // Find the time slot details
              const timeSlot = slots.find((ts: any) => ts.id === slot.time_slot_id);
              
              return {
                date: slot.date,
                timeSlotId: slot.time_slot_id,
                slotName: timeSlot?.slot_name || '',
                maxCapacity: slot.is_unlimited ? 999 : slot.max_capacity,
                isUnlimited: slot.is_unlimited,
                bookingDeadlineDate: slot.booking_deadline_date || '',
                bookingDeadlineTime: slot.booking_deadline_time || '',
                notes: slot.notes || '',
                is_free: slot.is_free || false,
                topic: slot.topic || '',
                description: slot.description || '',
                resource_link: slot.resource_link || '',
                notes_link: slot.notes_link || ''
              };
            });
            
            setSlotsToConfig(formattedSlots);
            console.log('✅ Loaded slot configurations:', formattedSlots);
          }
        } catch (error) {
          console.log('ℹ️ No existing slot configurations found (this is okay)');
        }
        
      } catch (error) {
        console.error('No existing availability found:', error);
        // This is okay - teacher might not have set availability yet
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('❌ Failed to load data. Please refresh the page.', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayOfWeek: number) => {
    // Get current state BEFORE updating
    const wasChecked = weeklyAvailability.find(d => d.dayOfWeek === dayOfWeek)?.isAvailable;
    
    // Update availability
    setWeeklyAvailability(prev =>
      prev.map(day =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, isAvailable: !day.isAvailable }
          : day
      )
    );
    
    // If unchecking a day (it WAS checked), remove its slot configurations
    if (wasChecked) {
      // dayOfWeek is 1-7 (Monday=1...Sunday=7)
      // getDateForDay expects the same 1-7 system
      const dayDate = getDateForDay(selectedWeek, dayOfWeek);
      const dateStr = formatDate(dayDate);
      console.log('🗑️ Unchecking day', dayOfWeek, 'removing slots for date:', dateStr);
      setSlotsToConfig(prev => {
        const filtered = prev.filter(slot => {
          const keep = slot.date !== dateStr;
          if (!keep) {
            console.log('  ❌ Removing slot:', slot.slotName, 'on', slot.date);
          }
          return keep;
        });
        console.log('✅ Remaining slots after removal:', filtered.length);
        return filtered;
      });
      if (activeDay === dayOfWeek) {
        setActiveDay(null);
      }
    }
  };  const handleConfigureSlots = (dayOfWeek: number) => {
    setActiveDay(dayOfWeek);
  };

  const handleAddSlot = (dayOfWeek: number) => {
    const date = getDateForDay(selectedWeek, dayOfWeek);
    const now = new Date();
    
    // Check if this slot is for today and calculate minimum time
    const isToday = formatDate(date) === formatDate(now);
    
    let defaultDeadlineDate: Date;
    let defaultDeadlineTime: string;
    
    if (isToday) {
      // For urgent slots today: deadline is 2 hours before slot time
      // But slot must be at least 3 hours from now
      const minSlotTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // now + 3 hours
      const deadlineTime = new Date(now.getTime() + 1 * 60 * 60 * 1000); // now + 1 hour (2 hrs before slot)
      
      defaultDeadlineDate = deadlineTime;
      defaultDeadlineTime = `${String(deadlineTime.getHours()).padStart(2, '0')}:${String(deadlineTime.getMinutes()).padStart(2, '0')}`;
    } else {
      // For future slots: default is 1 day before at same time, or teacher can adjust
      const oneDayBefore = new Date(date);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(18, 0, 0, 0); // 6 PM day before
      
      defaultDeadlineDate = oneDayBefore;
      defaultDeadlineTime = '18:00';
    }
    
    const newSlot: SlotConfig = {
      date: formatDate(date),
      timeSlotId: '',
      slotName: '',
      maxCapacity: 1,
      isUnlimited: false,
      bookingDeadlineDate: formatDate(defaultDeadlineDate),
      bookingDeadlineTime: defaultDeadlineTime,
      notes: '',
      is_free: false,
      topic: '',
      description: '',
      resource_link: '',
      notes_link: ''
    };
    setSlotsToConfig([...slotsToConfig, newSlot]);
  };

  const handleSlotChange = (index: number, field: string, value: any) => {
    console.log('📝 Slot change:', { index, field, value });
    setSlotsToConfig(prev => {
      const updated = prev.map((slot, i) => {
        if (i === index) {
          if (field === 'timeSlotId') {
            const selectedSlot = timeSlots.find(ts => ts.id === value);
            console.log('✅ Found time slot:', selectedSlot);
            return {
              ...slot,
              timeSlotId: value,
              slotName: selectedSlot?.slot_name || ''
            };
          }
          return { ...slot, [field]: value };
        }
        return slot;
      });
      console.log('✅ Updated slots:', updated);
      return updated;
    });
  };

  const handleRemoveSlot = (index: number) => {
    setSlotsToConfig(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      
      // ========================================
      // VALIDATION: Check if days are configured
      // ========================================
      const availableDays = weeklyAvailability
        .filter(day => day.isAvailable);
      
      if (availableDays.length === 0) {
        toast.error('⚠️ Please select at least one day as available.', { duration: 4000 });
        setSaving(false);
        return;
      }
      
      // Check if all selected days have slot configurations
      const daysNeedingSlots: string[] = [];
      for (const day of availableDays) {
        const dayDate = getDateForDay(selectedWeek, day.dayOfWeek); // Use dayOfWeek (1-7), not index
        const daySlots = slotsToConfig.filter(slot => {
          return formatDate(new Date(slot.date)) === formatDate(dayDate);
        });
        
        if (daySlots.length === 0) {
          daysNeedingSlots.push(dayNames[day.dayOfWeek - 1]); // dayOfWeek is 1-7, array is 0-6
        }
      }
      
      if (daysNeedingSlots.length > 0) {
        toast.error(
          `⚠️ Please configure time slots for: ${daysNeedingSlots.join(', ')}.\n\n` +
          `Click on each day to add time slots, capacity, and deadline.`,
          { 
            duration: 5000,
            style: { whiteSpace: 'pre-line' }
          }
        );
        setSaving(false);
        return;
      }
      
      // Clean up: Remove any slots for days that are NOT checked
      const checkedDays = weeklyAvailability.filter(d => d.isAvailable);
      const checkedDates = checkedDays.map(day => {
        const dayDate = getDateForDay(selectedWeek, day.dayOfWeek); // dayOfWeek is 1-7
        return formatDate(dayDate);
      });
      
      console.log('✅ Checked days dates:', checkedDates);
      
      // Filter slots to only include those for checked days
      const validSlotsOnly = slotsToConfig.filter(slot => checkedDates.includes(slot.date));
      
      console.log('📋 All slots to config:', JSON.stringify(slotsToConfig, null, 2));
      console.log('📊 Total slots before cleanup:', slotsToConfig.length);
      console.log('✨ Valid slots after cleanup:', validSlotsOnly.length);
      
      // Update state to remove orphaned slots
      if (validSlotsOnly.length !== slotsToConfig.length) {
        console.log('🧹 Cleaning up orphaned slots...');
        setSlotsToConfig(validSlotsOnly);
      }
      
      // Validate that all slots have a time slot selected
      const slotsWithoutTimeSlot = validSlotsOnly.filter(slot => !slot.timeSlotId || slot.timeSlotId === '');
      console.log('⚠️ Slots without time slot ID:', slotsWithoutTimeSlot);
      
      if (slotsWithoutTimeSlot.length > 0) {
        toast.error(
          `⚠️ Please select a time slot for all configurations.\n\n` +
          `${slotsWithoutTimeSlot.length} slot(s) missing time slot selection.`,
          { 
            duration: 5000,
            style: { whiteSpace: 'pre-line' }
          }
        );
        setSaving(false);
        return;
      }
      
      // Validate capacity
      const slotsWithInvalidCapacity = validSlotsOnly.filter(slot => !slot.isUnlimited && slot.maxCapacity < 1);
      if (slotsWithInvalidCapacity.length > 0) {
        toast.error('⚠️ Capacity must be at least 1 for non-unlimited slots.', { duration: 4000 });
        setSaving(false);
        return;
      }
      
      // Filter out past slots and validate future slots
      const now = new Date();
      console.log('🕐 Current time:', now.toLocaleString('en-IN'));
      
      // Separate future and past slots
      const futureSlots = [];
      const pastSlots = [];
      
      for (const slot of validSlotsOnly) {
        const selectedSlot = timeSlots.find(ts => ts.id === slot.timeSlotId);
        if (!selectedSlot) continue;
        
        // Parse slot start time (create a proper date object)
        const [slotHour, slotMinute] = selectedSlot.start_time.split(':').map(Number);
        const slotDateTime = new Date(slot.date + 'T00:00:00'); // Parse as local date
        slotDateTime.setHours(slotHour, slotMinute, 0, 0);
        
        console.log('📅 Slot details:', {
          date: slot.date,
          time: selectedSlot.start_time,
          slotDateTime: slotDateTime.toLocaleString('en-IN'),
          slotTimestamp: slotDateTime.getTime()
        });
        
        // Check if slot is at least 3 hours from now
        const hoursFromNow = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        console.log('⏱️ Hours from now:', hoursFromNow);
        
        // Skip past slots (negative hours or less than 3 hours)
        if (hoursFromNow < 0) {
          console.log('⏮️ Skipping past slot:', slot.date, selectedSlot.slot_name);
          pastSlots.push(slot);
          continue;
        }
        
        // Check if future slot is at least 3 hours away
        if (hoursFromNow < 3) {
          const errorMsg = `⚠️ Slot "${selectedSlot.slot_name}" on ${formatDisplayDate(new Date(slot.date))} is too soon!\n\n` +
            `You can only create slots that are at least 3 hours from now.\n` +
            `Current time: ${now.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}\n` +
            `Slot time: ${slotDateTime.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}\n` +
            `Gap: ${hoursFromNow.toFixed(1)} hours (need 3 hours minimum)`;
          toast.error(errorMsg, { 
            duration: 6000,
            style: { whiteSpace: 'pre-line', maxWidth: '500px' }
          });
          setSaving(false);
          return;
        }
        
        // Validate deadline for this future slot
        // Parse deadline (create a proper date object)
        const [deadlineHour, deadlineMinute] = slot.bookingDeadlineTime.split(':').map(Number);
        const deadlineDateTime = new Date(slot.bookingDeadlineDate + 'T00:00:00'); // Parse as local date
        deadlineDateTime.setHours(deadlineHour, deadlineMinute, 0, 0);
        
        console.log('⏰ Deadline details:', {
          date: slot.bookingDeadlineDate,
          time: slot.bookingDeadlineTime,
          deadlineDateTime: deadlineDateTime.toLocaleString('en-IN'),
          deadlineTimestamp: deadlineDateTime.getTime()
        });
        
        // Check if deadline is in the past
        if (deadlineDateTime < now) {
          const errorMsg = `⚠️ Deadline for "${selectedSlot.slot_name}" is in the past! ` +
            `Please set a future deadline.`;
          toast.error(errorMsg, { duration: 5000 });
          setSaving(false);
          return;
        }
        
        // Calculate hours between deadline and slot
        const hoursBeforeSlot = (slotDateTime.getTime() - deadlineDateTime.getTime()) / (1000 * 60 * 60);
        console.log('⏳ Hours between deadline and slot:', hoursBeforeSlot);
        
        const minHoursRequired = 2; // Always 2 hours minimum
        
        if (hoursBeforeSlot < minHoursRequired) {
          const errorMsg = `⚠️ Booking deadline must be at least ${minHoursRequired} hours before class time.\n\n` +
            `📌 Slot: ${selectedSlot.slot_name} on ${formatDisplayDate(new Date(slot.date))}\n` +
            `⏰ Current deadline: ${deadlineDateTime.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n` +
            `⏱️ Gap: ${hoursBeforeSlot.toFixed(1)} hours (need ${minHoursRequired} hours)\n\n` +
            `💡 Move deadline earlier by at least ${(minHoursRequired - hoursBeforeSlot).toFixed(1)} hours`;
          
          toast.error(errorMsg, { 
            duration: 8000,
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          });
          setSaving(false);
          return;
        }
        
        // Check deadline is not more than 2 days before
        if (hoursBeforeSlot > 48) {
          const errorMsg = `⚠️ Deadline cannot be more than 2 days (48 hours) before the class.\n\n` +
            `📌 Slot: ${selectedSlot.slot_name} on ${formatDisplayDate(new Date(slot.date))}\n` +
            `⏰ Current deadline: ${deadlineDateTime.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n` +
            `⏱️ Gap: ${hoursBeforeSlot.toFixed(1)} hours (max 48 hours)\n\n` +
            `💡 Move deadline closer to class time`;
          
          toast.error(errorMsg, { 
            duration: 8000,
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          });
          setSaving(false);
          return;
        }
        
        // This slot passed all validations
        futureSlots.push(slot);
      }
      
      // Show warning if past slots were skipped
      if (pastSlots.length > 0) {
        toast(`⏮️ Skipped ${pastSlots.length} past slot(s)`, { 
          icon: '⏰',
          duration: 3000 
        });
        console.log('⏮️ Skipped past slots:', pastSlots);
      }
      
      // If no future slots remain, show error
      if (futureSlots.length === 0) {
        toast.error('⚠️ No valid future slots to save. All slots are either past or too soon.', { duration: 5000 });
        setSaving(false);
        return;
      }
      
      console.log(`✅ Saving ${futureSlots.length} future slots (skipped ${pastSlots.length} past)`);
      
      const token = await getToken();
      
      // Save weekly availability
      const weekStart = formatDate(selectedWeek);
      await api.teacherAvailability.saveWeeklyAvailability({
        weekStartDate: weekStart,
        availability: weeklyAvailability
      }, token);
      
      // Save slot configurations (only future slots)
      if (futureSlots.length > 0) {
        console.log('💾 Saving future slots:', futureSlots);
        await api.teacherAvailability.saveSlotAvailability({
          slots: futureSlots
        }, token);
      }
      
      toast.success(`✅ Availability saved successfully! (${futureSlots.length} slot${futureSlots.length !== 1 ? 's' : ''})`, { 
        duration: 4000,
        icon: '🎉'
      });
      
      // Update state to include only future slots
      setSlotsToConfig(futureSlots);
      
      // Reload data without full page refresh
      await loadData();
      
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('❌ Failed to save availability. Please try again.', { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading || globalLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Toast Notifications */}
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          // Default options
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            fontSize: '14px',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          // Success style
          success: {
            duration: 4000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          // Error style
          error: {
            duration: 6000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            My Availability
          </h1>
          <p className="text-gray-600">
            Set your weekly schedule and configure time slots with capacity limits
          </p>
        </div>

        {/* Week Navigation */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
            >
              ← Previous Week
            </button>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">
                  Week of {formatDate(selectedWeek)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedWeek)} to {formatDate(getDateForDay(selectedWeek, 7))}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm"
            >
              Next Week →
            </button>
          </div>
        </div>

        {/* Weekly Calendar */}
        <div className="grid gap-4 mb-8">
          {weeklyAvailability.map((day) => {
            const isActive = day.isAvailable;
            const dayDate = getDateForDay(selectedWeek, day.dayOfWeek);
            const isPast = !isFutureDate(dayDate);
            
            // Count slots for this day
            const slotsForDay = slotsToConfig.filter(slot => slot.date === formatDate(dayDate));
            const hasSlots = slotsForDay.length > 0;
            
            return (
              <div
                key={day.dayOfWeek}
                className={`bg-white rounded-xl shadow-md border-2 transition-all duration-200 ${
                  isPast 
                    ? 'border-gray-200 opacity-60' 
                    : isActive 
                      ? 'border-green-400 shadow-lg' 
                      : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => !isPast && handleDayToggle(day.dayOfWeek)}
                        disabled={isPast}
                        className="w-6 h-6 rounded text-green-600 focus:ring-green-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold text-gray-800">
                            {dayNames[day.dayOfWeek - 1]}
                          </h3>
                          {isActive && hasSlots && !isPast && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {slotsForDay.length} slot{slotsForDay.length !== 1 ? 's' : ''} configured
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{formatDisplayDate(dayDate)}</p>
                        {isPast && <span className="text-xs text-red-500 font-medium">Past Date</span>}
                      </div>
                    </div>
                    
                    {isActive && !isPast && (
                      <button
                        onClick={() => handleConfigureSlots(day.dayOfWeek)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                      >
                        <Clock className="w-4 h-4" />
                        Configure Slots
                      </button>
                    )}
                  </div>
                  
                  {isActive && !isPast && activeDay === day.dayOfWeek && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-700">Time Slots for {dayNames[day.dayOfWeek - 1]}</h4>
                        <button
                          onClick={() => handleAddSlot(day.dayOfWeek)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm"
                        >
                          + Add Slot
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {slotsToConfig
                          .map((slot, actualIndex) => ({ slot, actualIndex }))
                          .filter(({ slot }) => slot.date === formatDate(dayDate))
                          .map(({ slot, actualIndex }) => (
                            <div key={actualIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Time Slot *
                                  </label>
                                  <select
                                    value={slot.timeSlotId}
                                    onChange={(e) => {
                                      console.log('🎯 Dropdown changed:', {
                                        actualIndex,
                                        value: e.target.value,
                                        slotDate: slot.date
                                      });
                                      handleSlotChange(actualIndex, 'timeSlotId', e.target.value);
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                                      !slot.timeSlotId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                                  >
                                    <option value="">Select time slot...</option>
                                    {timeSlots
                                      .filter(ts => {
                                        const now = new Date();
                                        const slotDate = new Date(slot.date + 'T00:00:00'); // Parse as local date
                                        
                                        // Parse slot start time
                                        const [slotHour, slotMinute] = ts.start_time.split(':').map(Number);
                                        const slotDateTime = new Date(slotDate);
                                        slotDateTime.setHours(slotHour, slotMinute, 0, 0);
                                        
                                        // Must be at least 3 hours from now
                                        const hoursFromNow = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                                        
                                        return hoursFromNow >= 3;
                                      })
                                      .map(ts => (
                                        <option key={ts.id} value={ts.id}>
                                          {ts.slot_name}
                                        </option>
                                      ))}
                                  </select>
                                  {timeSlots.filter(ts => {
                                    const now = new Date();
                                    const slotDate = new Date(slot.date + 'T00:00:00'); // Parse as local date
                                    const [slotHour, slotMinute] = ts.start_time.split(':').map(Number);
                                    const slotDateTime = new Date(slotDate);
                                    slotDateTime.setHours(slotHour, slotMinute, 0, 0);
                                    const hoursFromNow = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                                    return hoursFromNow >= 3;
                                  }).length === 0 && (
                                    <p className="mt-1 text-xs text-red-600">
                                      ⚠️ No slots available - all slots must be at least 3 hours from now
                                    </p>
                                  )}
                                  {!slot.timeSlotId && (
                                    <p className="mt-1 text-xs text-red-600">Please select a time slot</p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4" />
                                      Student Capacity *
                                    </div>
                                  </label>
                                  <div className="flex gap-2 flex-col sm:flex-row">
                                    <input
                                      type="number"
                                      min="1"
                                      value={slot.maxCapacity}
                                      onChange={(e) => handleSlotChange(actualIndex, 'maxCapacity', parseInt(e.target.value))}
                                      disabled={slot.isUnlimited}
                                      placeholder="e.g., 5"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 text-gray-900 bg-white"
                                    />
                                    <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 whitespace-nowrap">
                                      <input
                                        type="checkbox"
                                        checked={slot.isUnlimited}
                                        onChange={(e) => handleSlotChange(actualIndex, 'isUnlimited', e.target.checked)}
                                        className="rounded text-blue-600"
                                      />
                                      <span className="text-sm text-gray-700">Unlimited</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                              
                              {/* FREE Checkbox - New row */}
                              <div className="mb-3">
                                <label className="flex items-center gap-3 px-4 py-3 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-all bg-white">
                                  <input
                                    type="checkbox"
                                    checked={slot.is_free}
                                    onChange={(e) => handleSlotChange(actualIndex, 'is_free', e.target.checked)}
                                    className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-semibold text-gray-800">🆓 Mark this slot as FREE</span>
                                    <p className="text-xs text-gray-600 mt-0.5">Students can book this slot without payment</p>
                                  </div>
                                  {slot.is_free && (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-300">
                                      FREE SLOT
                                    </span>
                                  )}
                                </label>
                              </div>
                              
                              {/* Islamic Learning Topic Section */}
                              <div className="mb-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                                <h5 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                  📚 Islamic Learning Topic
                                </h5>
                                <div className="grid grid-cols-1 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Topic/Subject *
                                    </label>
                                    <input
                                      type="text"
                                      value={slot.topic || ''}
                                      onChange={(e) => handleSlotChange(actualIndex, 'topic', e.target.value)}
                                      placeholder="e.g., Quran Recitation, Islamic History, Arabic Grammar"
                                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white placeholder-gray-400"
                                    />
                                    <p className="text-xs text-purple-600 mt-1">
                                      What Islamic subject will you teach in this session?
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Description (Optional)
                                    </label>
                                    <textarea
                                      value={slot.description || ''}
                                      onChange={(e) => handleSlotChange(actualIndex, 'description', e.target.value)}
                                      placeholder="e.g., Beginner-friendly Tajweed lessons covering Makharij and basic rules"
                                      rows={2}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white placeholder-gray-400"
                                    />
                                    <p className="text-xs text-purple-600 mt-1">
                                      Provide details about what students will learn
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Booking Deadline Date * 
                                    <span className="text-xs font-normal text-gray-500"> (Min: 2 hrs before)</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={slot.bookingDeadlineDate}
                                    min={formatDate(new Date())}
                                    max={slot.date}
                                    onChange={(e) => handleSlotChange(actualIndex, 'bookingDeadlineDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                  />
                                  <p className="text-xs text-blue-600 mt-1">
                                    ⏰ Same day, 1 day, or 2 days before class (min: 2hrs)
                                  </p>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Booking Deadline Time * 
                                    <span className="text-xs font-normal text-gray-500"> (IST)</span>
                                  </label>
                                  <input
                                    type="time"
                                    value={slot.bookingDeadlineTime}
                                    onChange={(e) => handleSlotChange(actualIndex, 'bookingDeadlineTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Students book at least 2 hours before class
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={slot.notes}
                                    onChange={(e) => handleSlotChange(actualIndex, 'notes', e.target.value)}
                                    placeholder="e.g., Focus on beginners"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-400"
                                  />
                                </div>
                                
                                <button
                                  onClick={() => handleRemoveSlot(actualIndex)}
                                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSaveAvailability}
            disabled={saving}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Availability
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Reset time
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateForDay(weekStart: Date, dayOfWeek: number): Date {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + (dayOfWeek - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function initializeWeeklyAvailability(): DayAvailability[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    isAvailable: false,
    notes: ''
  }));
}

function formatDisplayDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate >= today;
}
