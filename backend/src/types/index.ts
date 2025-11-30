/**
 * Shared Type Definitions
 * 
 * Centralized types for type safety across the application.
 */

import { Request } from 'express';

// Clerk Auth Request
// This extends the globally augmented Express.Request from express.d.ts
export interface ClerkRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    orgId?: string;
    role?: string;
    email?: string;
    userName?: string;
    [key: string]: any;
  };
}

// User Roles
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

// Standard API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// User Type
export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Course Type
export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  teacherId: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enrollment Type
export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  enrolledAt: Date;
}

// Meeting Type
export interface Meeting {
  id: string;
  teacherId: string;
  studentId: string;
  courseId?: string;
  scheduledTime: Date;
  duration: number; // in minutes
  meetLink?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
}

// Video/Lesson Type
export interface Video {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  url: string;
  duration?: number;
  weekNumber: number;
  orderIndex: number;
  createdAt: Date;
}

// Teacher Availability Types
export interface TeacherWeeklyAvailability {
  id: string;
  teacherId: string;
  weekStartDate: string;
  dayOfWeek: number; // 1=Monday, 7=Sunday
  isAvailable: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  topic?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
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
  topic?: string;
  description?: string;
  is_free?: boolean;
  resource_link?: string;
  notes_link?: string;
}

// Meeting Booking Type
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
  paymentDate?: Date;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  studentEmailSent: boolean;
  teacherEmailSent: boolean;
  meetingLink?: string;
  status: 'reserved' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// System Settings Type
export interface SystemSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  description?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
