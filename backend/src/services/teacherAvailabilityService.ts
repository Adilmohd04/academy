import pool, { supabase } from '../config/database';
import { 
  TeacherWeeklyAvailability, 
  TeacherSlotAvailability, 
  AvailableSlot 
} from '../types';

export class TeacherAvailabilityService {
  /**
   * Save teacher's weekly availability
   * Teachers mark which days they're available for a given week
   */
  async saveWeeklyAvailability(
    teacherId: string,
    weekStartDate: string,
    availability: Array<{ dayOfWeek: number; isAvailable: boolean; notes?: string }>
  ): Promise<TeacherWeeklyAvailability[]> {
    try {
      const results: TeacherWeeklyAvailability[] = [];
      
      for (const day of availability) {
        const { data, error } = await supabase
          .from('teacher_weekly_availability')
          .upsert({
            teacher_id: teacherId,
            week_start_date: weekStartDate,
            day_of_week: day.dayOfWeek,
            is_available: day.isAvailable,
            notes: day.notes || null
          }, {
            onConflict: 'teacher_id,week_start_date,day_of_week'
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving weekly availability:', error);
          throw new Error(error.message);
        }
        
        results.push(data);
      }
      
      return results;
    } catch (error) {
      console.error('Error in saveWeeklyAvailability:', error);
      throw error;
    }
  }

  /**
   * Save teacher's slot availability with capacity and deadline
   */
  async saveSlotAvailability(
    teacherId: string,
    slots: Array<{
      date: string;
      timeSlotId: string;
      maxCapacity: number;
      isUnlimited: boolean;
      bookingDeadlineDate?: string;
      bookingDeadlineTime?: string;
      notes?: string;
      is_free?: boolean;
      topic?: string;
      description?: string;
      resource_link?: string;
      notes_link?: string;
    }>
  ): Promise<TeacherSlotAvailability[]> {
    try {
      const results: TeacherSlotAvailability[] = [];
      
      for (const slot of slots) {
        const { data, error } = await supabase
          .from('teacher_slot_availability')
          .upsert({
            teacher_id: teacherId,
            date: slot.date,
            time_slot_id: slot.timeSlotId,
            max_capacity: slot.isUnlimited ? 999 : slot.maxCapacity,
            is_unlimited: slot.isUnlimited,
            booking_deadline_date: slot.bookingDeadlineDate || null,
            booking_deadline_time: slot.bookingDeadlineTime || null,
            notes: slot.notes || null,
            is_available: true,
            is_free: slot.is_free || false,
            topic: slot.topic || null,
            description: slot.description || null,
            resource_link: slot.resource_link || null,
            notes_link: slot.notes_link || null
          }, {
            onConflict: 'teacher_id,date,time_slot_id'
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving slot availability:', error);
          throw new Error(error.message);
        }
        
        results.push(data);
      }
      
      return results;
    } catch (error) {
      console.error('Error in saveSlotAvailability:', error);
      throw error;
    }
  }

  /**
   * Get teacher's weekly availability
   */
  async getWeeklyAvailability(
    teacherId: string,
    weekStartDate: string
  ): Promise<TeacherWeeklyAvailability[]> {
    const { data, error } = await supabase
      .from('teacher_weekly_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('week_start_date', weekStartDate)
      .order('day_of_week', { ascending: true });
    
    if (error) {
      console.error('Supabase error:', error);
      return []; // Return empty array if no data found
    }
    
    return data || [];
  }

  /**
   * Get teacher's slot availability for a date range
   */
  async getSlotAvailability(
    teacherId: string,
    startDate: string,
    endDate: string
  ): Promise<TeacherSlotAvailability[]> {
    try {
      console.log('📅 Getting slot availability for teacher:', teacherId);
      console.log('📅 Date range:', startDate, 'to', endDate);
      
      const { data, error } = await supabase
        .from('teacher_slot_availability')
        .select(`
          *,
          time_slots:time_slot_id (
            slot_name,
            start_time,
            end_time
          )
        `)
        .eq('teacher_id', teacherId)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_available', true)
        .order('date', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching slot availability:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} slots`);
      
      // Get current date/time for deadline filtering
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
      
      // Flatten and filter by deadline
      const formattedData = data?.map(slot => ({
        ...slot,
        slot_name: slot.time_slots?.slot_name,
        start_time: slot.time_slots?.start_time,
        end_time: slot.time_slots?.end_time
      })).filter(slot => {
        // If no deadline set, include the slot
        if (!slot.booking_deadline_date || !slot.booking_deadline_time) {
          return true;
        }
        
        // Check if deadline has passed
        const deadlinePassed = slot.booking_deadline_date < currentDate || 
          (slot.booking_deadline_date === currentDate && slot.booking_deadline_time <= currentTime);
        
        if (deadlinePassed) {
          console.log(`🗑️ Filtering out slot with expired deadline: ${slot.date} ${slot.start_time} (deadline: ${slot.booking_deadline_date} ${slot.booking_deadline_time})`);
          return false;
        }
        
        return true;
      }) || [];
      
      console.log(`✅ ${formattedData.length} slots after deadline filtering`);
      
      return formattedData;
    } catch (error) {
      console.error('Error in getSlotAvailability:', error);
      throw error;
    }
  }

  /**
   * Get available slots for students (with capacity info)
   */
  /**
   * Get available slots for a student, excluding slots already booked by the student
   */
  async getAvailableSlotsForStudent(
    teacherId: string,
    startDate: string,
    endDate: string,
    studentId?: string
  ): Promise<AvailableSlot[]> {
    let query = `
      SELECT s.* FROM available_slots_view s
      WHERE s.teacher_id = $1 
        AND s.date >= $2 
        AND s.date <= $3
        AND s.is_available = true
        AND s.has_capacity = true
        AND s.booking_open = true
    `;
    const params: any[] = [teacherId, startDate, endDate];
    if (studentId) {
      // Exclude slots already booked by this student
      query += ` AND NOT EXISTS (
        SELECT 1 FROM meeting_requests mr
        WHERE mr.student_id = $4
          AND mr.preferred_date = s.date
          AND mr.time_slot_id = s.time_slot_id
          AND mr.status NOT IN ('failed', 'cancelled')
      )`;
      params.push(studentId);
    }
    query += ' ORDER BY s.date ASC, s.start_time ASC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get available dates for a teacher (for student date picker)
   */
  async getAvailableDates(
    teacherId: string,
    month: string // Format: YYYY-MM
  ): Promise<string[]> {
    const query = `
      SELECT DISTINCT date::text
      FROM available_slots_view
      WHERE teacher_id = $1 
        AND TO_CHAR(date, 'YYYY-MM') = $2
        AND is_available = true
        AND has_capacity = true
        AND booking_open = true
      ORDER BY date ASC
    `;
    
    const result = await pool.query(query, [teacherId, month]);
    return result.rows.map((row: { date: string }) => row.date);
  }

  /**
   * Check if a slot has capacity
   */
  async checkSlotCapacity(slotId: string): Promise<{
    hasCapacity: boolean;
    slotsRemaining: number;
    isUnlimited: boolean;
    bookingOpen: boolean;
  }> {
    const query = `
      SELECT 
        id,
        has_capacity,
        slots_remaining,
        is_unlimited,
        booking_open
      FROM available_slots_view
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [slotId]);
    
    if (result.rows.length === 0) {
      return {
        hasCapacity: false,
        slotsRemaining: 0,
        isUnlimited: false,
        bookingOpen: false
      };
    }
    
    return result.rows[0];
  }

  /**
   * Get all teachers who have availability
   */
  async getTeachersWithAvailability(): Promise<Array<{ teacherId: string }>> {
    const query = `
      SELECT DISTINCT teacher_id
      FROM teacher_slot_availability
      WHERE is_available = true
        AND date >= CURRENT_DATE
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Delete slot availability (teacher removes a slot)
   */
  async deleteSlotAvailability(
    teacherId: string,
    slotId: string
  ): Promise<void> {
    // Check if slot has any bookings
    const checkQuery = `
      SELECT COUNT(*) as booking_count
      FROM meeting_bookings
      WHERE teacher_slot_id = $1 
        AND status NOT IN ('cancelled')
    `;
    
    const checkResult = await pool.query(checkQuery, [slotId]);
    
    if (parseInt(checkResult.rows[0].booking_count) > 0) {
      throw new Error('Cannot delete slot with existing bookings');
    }
    
    // Soft delete by setting is_available to false
    const query = `
      UPDATE teacher_slot_availability
      SET is_available = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND teacher_id = $2
    `;
    
    await pool.query(query, [slotId, teacherId]);
  }

  /**
   * Get available slots for a specific teacher (for students)
   */
  async getAvailableSlotsForTeacher(teacherId: string): Promise<any[]> {
    try {
      // Get current date and time in IST
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
      
      // Calculate 3 hours from now
      const threeHoursLater = new Date(now.getTime() + (3 * 60 * 60 * 1000));
      const threeHoursLaterTime = threeHoursLater.toTimeString().split(' ')[0];
      
      console.log('🔍 Checking slots for teacher:', teacherId);
      console.log('📅 Current date:', currentDate);
      console.log('⏰ Current time:', currentTime);
      console.log('⏰ 3 hours later:', threeHoursLaterTime);
      
      // First, get teacher profile
      const { data: teacherProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('clerk_user_id', teacherId)
        .single();
      
      if (profileError) {
        console.error('❌ Error fetching teacher profile:', profileError);
      }
      
      const teacherName = teacherProfile?.full_name || 'Unknown';
      
      // Get all active slots for this teacher using the available_slots_view
      // This view includes is_free, meeting_price, topic, description
      // The view already filters by is_available = true in its WHERE clause
      const { data: slots, error } = await supabase
        .from('available_slots_view')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('date', currentDate); // Only get slots from today onwards
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      if (!slots || slots.length === 0) {
        console.log('⚠️ No slots found for teacher');
        return [];
      }
      
      console.log(`✅ Found ${slots.length} total slots`);
      
      // Filter slots based on business rules
      const availableSlots = slots.filter((slot: any) => {
        const slotDate = slot.date;
        const slotTime = slot.start_time; // available_slots_view has start_time directly
        
        // Rule 1: Check if slot is in the past (MOST IMPORTANT - CHECK FIRST)
        if (slotDate < currentDate) {
          console.log(`🗑️ REMOVING past slot: ${slotDate} ${slotTime} (current: ${currentDate})`);
          return false; // Exclude past slots
        }
        
        // Rule 2: Check if deadline has passed (view has deadline_utc)
        if (slot.deadline_utc) {
          const deadlineDate = new Date(slot.deadline_utc);
          if (now >= deadlineDate) {
            console.log(`🗑️ REMOVING expired deadline slot: ${slotDate} ${slotTime} (deadline: ${slot.deadline_utc})`);
            return false; // Exclude slots past deadline
          }
        }
        
        // Rule 3: Check 3-hour rule for today's slots
        if (slotDate === currentDate) {
          if (slotTime <= threeHoursLaterTime) {
            console.log(`🗑️ REMOVING slot too soon: ${slotDate} ${slotTime} (need 3hr buffer)`);
            return false; // Exclude slots within 3 hours
          }
        }
        
        // Rule 4: Check capacity
        if (!slot.is_unlimited && slot.current_bookings >= slot.max_capacity) {
          console.log(`�️ REMOVING full slot: ${slotDate} ${slotTime} (${slot.current_bookings}/${slot.max_capacity})`);
          return false; // Exclude full slots
        }
        
        // Slot passed all checks - keep it
        console.log(`✅ KEEPING available slot: ${slotDate} ${slotTime}`);
        return true;
      });
      
      console.log(`✅ ${availableSlots.length} slots available after filtering`);
      
      // Format the results - available_slots_view already has most fields
      const formattedSlots = availableSlots.map((slot: any) => ({
        id: slot.id,
        teacher_id: slot.teacher_id,
        teacher_name: teacherName,
        date: slot.date,
        time_slot_id: slot.time_slot_id,
        slot_name: slot.slot_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        max_capacity: slot.max_capacity,
        current_bookings: slot.current_bookings,
        remaining_capacity: slot.slots_remaining, // View calculates this
        is_unlimited: slot.is_unlimited,
        is_available: slot.is_available,
        // Include the fields from available_slots_view
        is_free: slot.is_free,
        meeting_price: slot.meeting_price,
        topic: slot.topic,
        description: slot.description,
        resource_link: slot.resource_link,
        notes_link: slot.notes_link,
        deadline_utc: slot.deadline_utc
      }));
      
      return formattedSlots;
    } catch (error) {
      console.error('Error in getAvailableSlotsForTeacher:', error);
      throw error;
    }
  }
}

export default new TeacherAvailabilityService();
