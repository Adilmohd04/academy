/**
 * Shared Type Definitions
 * 
 * Centralized types for type safety across the application.
 */

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
