/**
 * Shared Type Definitions
 * 
 * TypeScript interfaces shared between frontend and backend.
 */

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  teacherId: string;
  thumbnail?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Teacher Availability Types
export interface TeacherWeeklyAvailability {
  id: string;
  teacherId: string;
  weekStartDate: string;
  dayOfWeek: number; // 1=Monday, 7=Sunday
  isAvailable: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSlotAvailability {
  id: string;
  teacherId: string;
  date: string;
  timeSlotId: string;
  maxCapacity: number;
  currentBookings: number;
  isUnlimited: boolean;
  bookingDeadlineDate?: string;
  bookingDeadlineTime?: string;
  isAvailable: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSlot {
  id: string;
  teacherId: string;
  date: string;
  timeSlotId: string;
  slotName: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentBookings: number;
  isUnlimited: boolean;
  slotsRemaining: number;
  bookingDeadlineDate?: string;
  bookingDeadlineTime?: string;
  isAvailable: boolean;
  hasCapacity: boolean;
  bookingOpen: boolean;
}

export interface MeetingBooking {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  studentPhone?: string;
  teacherSlotId: string;
  courseId?: string;
  teacherId: string;
  meetingDate: string;
  timeSlotId: string;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  paymentAmount?: number;
  paymentDate?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  studentEmailSent: boolean;
  teacherEmailSent: boolean;
  meetingLink?: string;
  status: 'reserved' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  description?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

