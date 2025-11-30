/**
 * API Client
 * 
 * Centralized HTTP client for backend API communication.
 * Token must be manually added to requests via headers.
 * Use with Clerk's getToken() in client components or auth() in server components.
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiError {
  message?: string;
  [key: string]: unknown;
}

/**
 * Create axios instance with default config
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - token should be added per-request
 * Example usage:
 * ```
 * const { getToken } = useAuth();
 * const token = await getToken();
 * api.user.getProfile(token);
 * ```
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Token will be added per request
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'An error occurred';
      console.error('API Error:', message);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error: No response from server');
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * API service methods
 * All methods accept an optional token parameter for authentication
 */

interface UserUpdateData {
  [key: string]: unknown;
}

interface GetUsersParams {
  [key: string]: unknown;
}

export const api = {
  // Health check
  health: () => apiClient.get('/api/health'),
  
  // User endpoints
  user: {
    getProfile: (token?: string | null) => 
      apiClient.get('/api/users/profile', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    updateProfile: (data: UserUpdateData, token?: string | null) => 
      apiClient.put('/api/users/profile', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getAllUsers: (params?: GetUsersParams, token?: string | null) => 
      apiClient.get('/api/users', { 
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    updateRole: (userId: string, role: string, token?: string | null) => 
      apiClient.put(`/api/users/${userId}/role`, { role }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    deleteUser: (userId: string, token?: string | null) => 
      apiClient.delete(`/api/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // Course endpoints
  courses: {
    getAll: (token?: string | null) =>
      apiClient.get('/api/courses', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getById: (courseId: string, token?: string | null) =>
      apiClient.get(`/api/courses/${courseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    create: (data: {
      title: string;
      description: string;
      price: number;
      thumbnail_url?: string;
      duration_weeks?: number;
    }, token?: string | null) =>
      apiClient.post('/api/courses', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    update: (courseId: string, data: {
      title?: string;
      description?: string;
      price?: number;
      thumbnail_url?: string;
      duration_weeks?: number;
      status?: string;
    }, token?: string | null) =>
      apiClient.put(`/api/courses/${courseId}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    delete: (courseId: string, token?: string | null) =>
      apiClient.delete(`/api/courses/${courseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getTeacherCourses: (token?: string | null) =>
      apiClient.get('/api/teacher/courses', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // Time Slot endpoints
  timeSlots: {
    getAll: (activeOnly?: boolean, token?: string | null) =>
      apiClient.get('/api/time-slots', {
        params: { active_only: activeOnly },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getAvailable: (token?: string | null) =>
      apiClient.get('/api/time-slots/available', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getAvailableForDate: (date: string, token?: string | null) =>
      apiClient.get(`/api/time-slots/available/${date}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    checkDateAvailability: (date: string, token?: string | null) =>
      apiClient.get(`/api/time-slots/check-date/${date}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    checkSlotAvailability: (date: string, timeSlotId: string, token?: string | null) =>
      apiClient.get('/api/time-slots/check-availability', {
        params: { date, time_slot_id: timeSlotId },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // Meeting endpoints
  meetings: {
    createRequest: (data: {
      student_name: string;
      student_email: string;
      student_phone?: string;
      course_id?: string;
      preferred_date: string;
      time_slot_id: string;
      notes?: string;
      amount: number;
    }, token?: string | null) =>
      apiClient.post('/api/meetings/requests', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // New method for teacher slot booking
    createMeetingRequest: (data: {
      preferred_date: string;
      time_slot_id: string;
      teacher_slot_id: string;
      student_name: string;
      student_email: string;
      student_phone: string;
      notes?: string;
      amount: number;
    }, token?: string | null) =>
      apiClient.post('/api/meetings/requests', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    getRequestById: (requestId: string, token?: string | null) =>
      apiClient.get(`/api/meetings/requests/${requestId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getRequests: (params?: {
      status?: string;
      date_from?: string;
      date_to?: string;
    }, token?: string | null) =>
      apiClient.get('/api/meetings/requests', {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getScheduled: (params?: {
      role?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
    }, token?: string | null) =>
      apiClient.get('/api/meetings', {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getStudentUpcoming: (token?: string | null) =>
      apiClient.get('/api/meetings/student/upcoming', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getTeacherUpcoming: (token?: string | null) =>
      apiClient.get('/api/meetings/teacher/upcoming', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getPendingAdmin: (token?: string | null) =>
      apiClient.get('/api/meetings/admin/pending', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    assignTeacher: (meetingId: string, data: {
      teacher_id: string;
      meeting_link?: string;
      meeting_platform?: string;
      admin_notes?: string;
    }, token?: string | null) =>
      apiClient.post(`/api/meetings/${meetingId}/assign-teacher`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Approve/Reject meeting requests
    approveMeeting: (requestId: string, data: {
      meeting_link?: string;
      admin_notes?: string;
    }, token?: string | null) =>
      apiClient.put(`/api/meetings/${requestId}/status`, {
        status: 'approved',
        ...data
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    rejectMeeting: (requestId: string, reason: string, token?: string | null) =>
      apiClient.put(`/api/meetings/${requestId}/status`, {
        status: 'rejected',
        admin_notes: reason
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    updateMeetingStatus: (meetingId: string, status: string, token?: string | null) =>
      apiClient.put(`/api/meetings/${meetingId}/status`, { status }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Update attendance
    updateAttendance: (meetingId: string, attendance: 'present' | 'absent' | 'cancelled', token?: string | null) =>
      apiClient.put(`/api/meetings/${meetingId}/attendance`, { attendance }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Update resource link
    updateResourceLink: (meetingId: string, resourceLink: string, token?: string | null) =>
      apiClient.put(`/api/meetings/${meetingId}/resource`, { resource_link: resourceLink }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Update notes link
    updateNotesLink: (meetingId: string, notesLink: string, token?: string | null) =>
      apiClient.put(`/api/meetings/${meetingId}/notes`, { notes_link: notesLink }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Create free meeting booking (no payment required)
    createFreeBooking: (data: {
      meeting_request_id: string;
    }, token?: string | null) =>
      apiClient.post('/api/meetings/bookings/free', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // Payment endpoints
  payments: {
    createOrder: (data: {
      meeting_request_id: string;
      amount: number;
    }, token?: string | null) =>
      apiClient.post('/api/payments/create-order', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    verifyPayment: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      meeting_request_id: string;
    }, token?: string | null) =>
      apiClient.post('/api/payments/verify', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    verify: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      payment_method?: string;
      payment_email?: string;
      payment_contact?: string;
    }, token?: string | null) =>
      apiClient.post('/api/payments/verify', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getPaymentById: (paymentId: string, token?: string | null) =>
      apiClient.get(`/api/payments/${paymentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getHistory: (token?: string | null) =>
      apiClient.get('/api/payments/student/history', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // Settings endpoints
  settings: {
    getMeetingPrice: () =>
      apiClient.get('/api/settings/meeting-price'),
    updateMeetingPrice: (price: number, token?: string | null) =>
      apiClient.put('/api/settings/meeting-price', { price }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    getAllSettings: (token?: string | null) =>
      apiClient.get('/api/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // Teacher Availability endpoints
  teacherAvailability: {
    // Save weekly availability (teacher marks which days available)
    saveWeeklyAvailability: (data: {
      weekStartDate: string;
      availability: Array<{ dayOfWeek: number; isAvailable: boolean; notes?: string }>;
    }, token?: string | null) =>
      apiClient.post('/api/teacher/availability/weekly', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Save slot availability with capacity
    saveSlotAvailability: (data: {
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
      }>;
    }, token?: string | null) =>
      apiClient.post('/api/teacher/availability/slots', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Get teacher's weekly availability
    getWeeklyAvailability: (weekStartDate: string, token?: string | null) =>
      apiClient.get(`/api/teacher/availability/weekly/${weekStartDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Get teacher's slot availability
    getSlotAvailability: (startDate: string, endDate: string, token?: string | null) =>
      apiClient.get('/api/teacher/availability/slots', {
        params: { startDate, endDate },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Get available slots for a specific teacher (for student booking)
    getAvailableSlots: (teacherId: string, token?: string | null) =>
      apiClient.get(`/api/teacher/slots/${teacherId}/available`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
    
    // Get available slots for students (public)
    getAvailableSlotsForStudent: (teacherId: string, startDate: string, endDate: string) =>
      apiClient.get(`/api/teacher/${teacherId}/available-slots`, {
        params: { startDate, endDate }
      }),
    
    // Get available dates for a teacher (for date picker)
    getAvailableDates: (teacherId: string, month: string) =>
      apiClient.get(`/api/teacher/${teacherId}/available-dates`, {
        params: { month } // Format: YYYY-MM
      }),
    
    // Check slot capacity
    checkSlotCapacity: (slotId: string) =>
      apiClient.get(`/api/teacher/availability/slot/${slotId}/capacity`),
    
    // Get all teachers with availability
    getTeachersWithAvailability: () =>
      apiClient.get('/api/teachers/with-availability'),
    
    // Delete slot availability
    deleteSlotAvailability: (slotId: string, token?: string | null) =>
      apiClient.delete(`/api/teacher/availability/slot/${slotId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }),
  },

  // TODO: Add more API endpoints as features are developed
  // enrollments: { ... },
};

export default apiClient;
