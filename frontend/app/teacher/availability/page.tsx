'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
  Pencil,
  DollarSign,
  Infinity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';

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
  const [globalLoading, setGlobalLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTopicSlot, setEditingTopicSlot] = useState<{slot: SlotConfig, index: number} | null>(null);
  const [quickTopic, setQuickTopic] = useState('');
  const [teacherPricing, setTeacherPricing] = useState<{is_free: boolean; price_per_meeting: number | null}>({ is_free: false, price_per_meeting: null });

  // 🔒 SECURITY: Check if user is a teacher
  useEffect(() => {
    if (user) {
      const role = user.publicMetadata?.role as string;
      if (role !== 'teacher') {
        toast.error('Access Denied: Teachers only!');
        router.replace('/dashboard');
        return;
      }
    }
  }, [user, router]);

  // Load time slots and existing availability
  useEffect(() => {
    loadData();
    loadTeacherPricing();
  }, [selectedWeek]);

  const loadTeacherPricing = async () => {
    try {
      const token = await getToken();
      const userId = user?.id;
      if (!userId) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTeacherPricing({
          is_free: data.is_free || false,
          price_per_meeting: data.price_per_meeting || null
        });
      }
    } catch (error) {
      console.error('Error fetching teacher pricing:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Load time slots
      let slotsResponse;
      try {
        slotsResponse = await api.timeSlots.getAll(true, token);
      } catch (error: any) {
        if (error.response?.status === 401) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const freshToken = await getToken();
          slotsResponse = await api.timeSlots.getAll(true, freshToken);
        } else {
          throw error;
        }
      }
      
      const slots = Array.isArray(slotsResponse.data) ? slotsResponse.data : [];
      setTimeSlots(slots);
      
      // Load existing weekly availability
      try {
        const weekStart = formatDate(selectedWeek);
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
        
        const availData = Array.isArray(availResponse.data) ? availResponse.data : (availResponse.data.data || []);
        
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
        
        // Load slot configurations
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
          
          const slotsData = Array.isArray(slotsResponse.data) ? slotsResponse.data : (slotsResponse.data.data || []);
          
          if (slotsData.length > 0) {
            const formattedSlots = slotsData.map((slot: any) => {
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
          } else {
            setSlotsToConfig([]);
          }
        } catch (error) {
          setSlotsToConfig([]);
        }
      } catch (error) {
        console.error('No existing availability found:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('❌ Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // ... (Keep existing helper functions: handleDayToggle, handleConfigureSlots, handleAddSlot, handleSlotChange, handleRemoveSlot, handleSaveAvailability)
  // I will copy them below to ensure the file is complete.

  const handleDayToggle = (dayOfWeek: number) => {
    const wasChecked = weeklyAvailability.find(d => d.dayOfWeek === dayOfWeek)?.isAvailable;
    setWeeklyAvailability(prev =>
      prev.map(day =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, isAvailable: !day.isAvailable }
          : day
      )
    );
    if (wasChecked) {
      const dayDate = getDateForDay(selectedWeek, dayOfWeek);
      const dateStr = formatDate(dayDate);
      setSlotsToConfig(prev => prev.filter(slot => slot.date !== dateStr));
      if (activeDay === dayOfWeek) setActiveDay(null);
    }
  };

  const handleConfigureSlots = (dayOfWeek: number) => {
    setActiveDay(dayOfWeek);
  };

  const handleAddSlot = (dayOfWeek: number) => {
    const date = getDateForDay(selectedWeek, dayOfWeek);
    const now = new Date();
    const isToday = formatDate(date) === formatDate(now);
    
    let defaultDeadlineDate: Date;
    let defaultDeadlineTime: string;
    
    if (isToday) {
      const deadlineTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      defaultDeadlineDate = deadlineTime;
      defaultDeadlineTime = `${String(deadlineTime.getHours()).padStart(2, '0')}:${String(deadlineTime.getMinutes()).padStart(2, '0')}`;
    } else {
      const oneDayBefore = new Date(date);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(18, 0, 0, 0);
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
    setSlotsToConfig(prev => {
      const updated = prev.map((slot, i) => {
        if (i === index) {
          if (field === 'timeSlotId') {
            const selectedSlot = timeSlots.find(ts => ts.id === value);
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
      return updated;
    });
  };

  const handleRemoveSlot = (index: number) => {
    setSlotsToConfig(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickSaveTopic = async () => {
    if (!editingTopicSlot) return;

    try {
      setSaving(true);
      const token = await getToken();
      
      const updatedSlot = {
        ...editingTopicSlot.slot,
        topic: quickTopic
      };

      await api.teacherAvailability.saveSlotAvailability({ slots: [updatedSlot] }, token);
      
      setSlotsToConfig(prev => prev.map((s) => 
        (s.date === updatedSlot.date && s.timeSlotId === updatedSlot.timeSlotId) ? updatedSlot : s
      ));
      
      toast.success('Topic updated successfully');
      setEditingTopicSlot(null);
      setQuickTopic('');
      
    } catch (error) {
      console.error('Error updating topic:', error);
      toast.error('Failed to update topic');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      const availableDays = weeklyAvailability.filter(day => day.isAvailable);
      
      if (availableDays.length === 0) {
        toast.error('⚠️ Please select at least one day as available.');
        setSaving(false);
        return;
      }
      
      const daysNeedingSlots: string[] = [];
      for (const day of availableDays) {
        const dayDate = getDateForDay(selectedWeek, day.dayOfWeek);
        const daySlots = slotsToConfig.filter(slot => formatDate(new Date(slot.date)) === formatDate(dayDate));
        if (daySlots.length === 0) daysNeedingSlots.push(dayNames[day.dayOfWeek - 1]);
      }
      
      if (daysNeedingSlots.length > 0) {
        toast.error(`⚠️ Please configure time slots for: ${daysNeedingSlots.join(', ')}.`);
        setSaving(false);
        return;
      }
      
      const checkedDays = weeklyAvailability.filter(d => d.isAvailable);
      const checkedDates = checkedDays.map(day => formatDate(getDateForDay(selectedWeek, day.dayOfWeek)));
      const validSlotsOnly = slotsToConfig.filter(slot => checkedDates.includes(slot.date));
      
      if (validSlotsOnly.length !== slotsToConfig.length) {
        setSlotsToConfig(validSlotsOnly);
      }
      
      const slotsWithoutTimeSlot = validSlotsOnly.filter(slot => !slot.timeSlotId);
      if (slotsWithoutTimeSlot.length > 0) {
        toast.error('⚠️ Please select a time slot for all configurations.');
        setSaving(false);
        return;
      }
      
      const now = new Date();
      const futureSlots = [];
      const pastSlots = [];
      
      for (const slot of validSlotsOnly) {
        const selectedSlot = timeSlots.find(ts => ts.id === slot.timeSlotId);
        if (!selectedSlot) continue;
        
        const [slotHour, slotMinute] = selectedSlot.start_time.split(':').map(Number);
        const slotDateTime = new Date(slot.date + 'T00:00:00');
        slotDateTime.setHours(slotHour, slotMinute, 0, 0);
        
        const hoursFromNow = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursFromNow < 0) {
          pastSlots.push(slot);
          continue;
        }
        
        if (hoursFromNow < 3) {
          toast.error(`⚠️ Slot "${selectedSlot.slot_name}" is too soon (min 3 hours).`);
          setSaving(false);
          return;
        }
        
        futureSlots.push(slot);
      }
      
      if (futureSlots.length === 0) {
        toast.error('⚠️ No valid future slots to save.');
        setSaving(false);
        return;
      }
      
      const token = await getToken();
      const weekStart = formatDate(selectedWeek);
      await api.teacherAvailability.saveWeeklyAvailability({
        weekStartDate: weekStart,
        availability: weeklyAvailability
      }, token);
      
      if (futureSlots.length > 0) {
        await api.teacherAvailability.saveSlotAvailability({ slots: futureSlots }, token);
      }
      
      toast.success('✅ Availability saved successfully!');
      setSlotsToConfig(futureSlots);
      setIsEditing(false); // Exit edit mode on save
      await loadData();
      
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('❌ Failed to save availability.');
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Show Islamic loader overlay for week changes (preserves sidebar)
  const showLoadingOverlay = loading && timeSlots.length > 0; // Only show overlay after initial load

  // Full page loader for initial load only
  if (loading && timeSlots.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Islamic pattern spinner */}
          <div className="w-24 h-24 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin mb-4"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="w-10 h-10 text-amber-600" />
          </div>
        </div>
        <p className="mt-4 text-emerald-800 font-medium">Loading your availability...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/30 relative">
      <IslamicPatternBackground>
        
        <IslamicPageHeader 
          title="My Availability" 
          subtitle="Manage your weekly schedule and teaching slots"
          actions={[
            {
              label: isEditing ? 'Cancel Editing' : 'Update Availability',
              icon: isEditing ? X : Edit2,
              onClick: () => setIsEditing(!isEditing),
              variant: isEditing ? 'secondary' : 'primary'
            }
          ]}
        />

        {/* Loading Overlay for week changes */}
        <AnimatePresence>
          {showLoadingOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-amber-200 flex flex-col items-center"
              >
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
                <p className="text-emerald-800 font-semibold text-lg">Loading week...</p>
                <p className="text-gray-500 text-sm mt-1">Please wait</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {/* Week Navigation */}
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-amber-100 p-6 flex items-center justify-between">
            <button
              onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
              className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-700"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-600" />
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
              className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-700"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div
                key="view-mode"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {(() => {
                  const daysWithSlots = weeklyAvailability.filter(day => {
                    const dayDate = getDateForDay(selectedWeek, day.dayOfWeek);
                    const slots = slotsToConfig.filter(s => s.date === formatDate(dayDate));
                    return slots.length > 0;
                  });

                  if (daysWithSlots.length === 0) {
                    return (
                      <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-amber-100 shadow-sm">
                        <Calendar className="w-16 h-16 text-amber-200 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900">No availability configured</h3>
                        <p className="text-gray-500 mt-2">Click "Update Availability" to add slots for this week.</p>
                      </div>
                    );
                  }

                  return daysWithSlots.map((day) => {
                    const dayDate = getDateForDay(selectedWeek, day.dayOfWeek);
                    const slotsForDay = slotsToConfig
                      .filter(slot => slot.date === formatDate(dayDate))
                      .sort((a, b) => {
                        const slotA = timeSlots.find(ts => ts.id === a.timeSlotId);
                        const slotB = timeSlots.find(ts => ts.id === b.timeSlotId);
                        if (!slotA || !slotB) return 0;
                        return slotA.start_time.localeCompare(slotB.start_time);
                      });
                    
                    return (
                      <div key={day.dayOfWeek} className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-4 bg-amber-50/50 border-b border-amber-100">
                          <h3 className="font-bold text-gray-900">{dayNames[day.dayOfWeek - 1]}</h3>
                          <p className="text-sm text-gray-500">{formatDisplayDate(dayDate)}</p>
                        </div>
                        <div className="p-4 space-y-3">
                          {slotsForDay.map((slot, idx) => (
                            <div key={idx} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-emerald-600" />
                                  <span className="font-semibold text-sm text-gray-800">{slot.slotName}</span>
                                </div>
                                {slot.is_free ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                    FREE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                    PAID
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <Users className="w-3 h-3" />
                                {slot.isUnlimited ? (
                                  <span className="font-bold text-emerald-600">Unlimited Capacity</span>
                                ) : (
                                  <span>Max {slot.maxCapacity} Students</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-50">
                                <div className="text-xs text-gray-600 truncate flex-1">
                                  {slot.topic || <span className="text-gray-400 italic">No topic set</span>}
                                </div>
                                <button 
                                  onClick={() => {
                                    setEditingTopicSlot({ slot, index: idx });
                                    setQuickTopic(slot.topic);
                                  }}
                                  className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Edit Topic"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </motion.div>
            ) : (
              <motion.div
                key="edit-mode"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50/30">
                  <h2 className="text-xl font-bold text-gray-800">Edit Schedule</h2>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {weeklyAvailability.map((day) => {
                    const isActive = day.isAvailable;
                    const dayDate = getDateForDay(selectedWeek, day.dayOfWeek);
                    const isPast = !isFutureDate(dayDate);
                    
                    return (
                      <div
                        key={day.dayOfWeek}
                        className={`bg-white rounded-xl border-2 transition-all duration-200 ${
                          isPast ? 'border-gray-100 opacity-60' : isActive ? 'border-emerald-400 shadow-md' : 'border-gray-200'
                        }`}
                      >
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => !isPast && handleDayToggle(day.dayOfWeek)}
                              disabled={isPast}
                              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <h3 className="font-semibold text-gray-800">{dayNames[day.dayOfWeek - 1]}</h3>
                              <p className="text-sm text-gray-500">{formatDisplayDate(dayDate)}</p>
                            </div>
                          </div>
                          
                          {isActive && !isPast && (
                            <button
                              onClick={() => handleConfigureSlots(day.dayOfWeek)}
                              className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                            >
                              {activeDay === day.dayOfWeek ? 'Close Config' : 'Configure Slots'}
                            </button>
                          )}
                        </div>

                        {isActive && !isPast && activeDay === day.dayOfWeek && (
                          <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-medium text-gray-700">Time Slots</h4>
                              <button
                                onClick={() => handleAddSlot(day.dayOfWeek)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm"
                              >
                                + Add Slot
                              </button>
                            </div>
                            
                            <div className="space-y-4">
                              {slotsToConfig
                                .map((slot, actualIndex) => ({ slot, actualIndex }))
                                .filter(({ slot }) => slot.date === formatDate(dayDate))
                                .map(({ slot, actualIndex }) => (
                                  <div key={actualIndex} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Time Slot</label>
                                        <select
                                          value={slot.timeSlotId}
                                          onChange={(e) => handleSlotChange(actualIndex, 'timeSlotId', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        >
                                          <option value="">Select time...</option>
                                          {timeSlots.map(ts => (
                                            <option key={ts.id} value={ts.id}>{ts.slot_name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Capacity</label>
                                        <div className="flex gap-3 items-start">
                                          <input
                                            type="number"
                                            value={slot.maxCapacity}
                                            onChange={(e) => handleSlotChange(actualIndex, 'maxCapacity', parseInt(e.target.value))}
                                            disabled={slot.isUnlimited}
                                            className={`flex-1 px-3 py-2 border rounded-lg text-sm transition-colors ${
                                              slot.isUnlimited 
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                                : 'bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                                            }`}
                                          />
                                          <label className="flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors">
                                            <input
                                              type="checkbox"
                                              checked={slot.isUnlimited}
                                              onChange={(e) => handleSlotChange(actualIndex, 'isUnlimited', e.target.checked)}
                                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                            />
                                            <span className="text-sm font-medium text-emerald-800">Unlimited</span>
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {!teacherPricing.is_free ? (
                                      <div className="mb-4">
                                        <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                          slot.is_free 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}>
                                          <input
                                            type="checkbox"
                                            checked={slot.is_free}
                                            onChange={(e) => handleSlotChange(actualIndex, 'is_free', e.target.checked)}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                          />
                                          <div>
                                            <span className="block text-sm font-medium text-gray-900">Make this slot free</span>
                                            <span className="block text-xs text-gray-500">Students will not be charged for this session (you can offer free sessions even as a paid teacher)</span>
                                          </div>
                                        </label>
                                      </div>
                                    ) : (
                                      <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                        <p className="text-sm text-emerald-800 flex items-center gap-2">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                          </svg>
                                          All your sessions are free (you are a free teacher)
                                        </p>
                                      </div>
                                    )}

                                    <div className="space-y-3 mb-4">
                                      <input
                                        type="text"
                                        value={slot.topic}
                                        onChange={(e) => handleSlotChange(actualIndex, 'topic', e.target.value)}
                                        placeholder="Topic (e.g. Quran Recitation)"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                      />
                                      <textarea
                                        value={slot.description}
                                        onChange={(e) => handleSlotChange(actualIndex, 'description', e.target.value)}
                                        placeholder="Description..."
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                      />
                                      {/* Booking Deadline */}
                                      <div className="flex gap-2 items-center">
                                        <label className="text-xs text-gray-500 whitespace-nowrap">Booking Deadline:</label>
                                        <input
                                          type="date"
                                          value={slot.bookingDeadlineDate}
                                          onChange={(e) => handleSlotChange(actualIndex, 'bookingDeadlineDate', e.target.value)}
                                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                        <input
                                          type="time"
                                          value={slot.bookingDeadlineTime}
                                          onChange={(e) => handleSlotChange(actualIndex, 'bookingDeadlineTime', e.target.value)}
                                          className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => handleRemoveSlot(actualIndex)}
                                        className="text-red-500 text-sm hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                                      >
                                        Remove Slot
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAvailability}
                    disabled={saving}
                    className="px-8 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Edit Topic Modal */}
          <AnimatePresence>
            {editingTopicSlot && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={() => setEditingTopicSlot(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/50">
                    <h3 className="font-bold text-gray-900">Edit Topic</h3>
                    <button onClick={() => setEditingTopicSlot(null)}>
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name</label>
                      <input
                        type="text"
                        value={quickTopic}
                        onChange={(e) => setQuickTopic(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 bg-white"
                        placeholder="e.g. Tajweed Basics"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingTopicSlot(null)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleQuickSaveTopic}
                        disabled={saving}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </IslamicPatternBackground>
    </div>
  );
}

// Helper functions
function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
