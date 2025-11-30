/**
 * Meeting Routes
 * 
 * Handles all meeting-related API endpoints
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as meetingController from '../controllers/meetingController';

const router = Router();

// ============================================
// MEETING REQUESTS
// ============================================

// Create meeting request (Student)
router.post('/meetings/requests', requireAuth, meetingController.createMeetingRequest);

// Create free meeting booking directly (Student)
router.post('/meetings/bookings/free', requireAuth, meetingController.createFreeBooking);

// Get meeting requests
router.get('/meetings/requests', requireAuth, meetingController.getMeetingRequests);

// Get single meeting request
router.get('/meetings/requests/:id', requireAuth, meetingController.getMeetingRequestById);

// ============================================
// SCHEDULED MEETINGS
// ============================================

// Get scheduled meetings (filtered by role)
router.get('/meetings', requireAuth, meetingController.getScheduledMeetings);

// ============================================
// DASHBOARD VIEWS (Must be BEFORE /:id routes)
// ============================================

// Student's upcoming meetings
router.get('/meetings/student/upcoming', requireAuth, meetingController.getStudentUpcomingMeetings);

// Teacher's upcoming meetings
router.get('/meetings/teacher/upcoming', requireAuth, meetingController.getTeacherUpcomingMeetings);

// Teacher's assigned meetings
router.get('/meetings/teacher/assigned', requireAuth, meetingController.getTeacherAssignedMeetings);

// Admin - pending meetings
router.get('/meetings/admin/pending', requireAuth, meetingController.getPendingMeetingsForAdmin);

// Admin - all meetings
router.get('/meetings/all', requireAuth, meetingController.getAllMeetings);

// ============================================
// SINGLE MEETING OPERATIONS (/:id routes)
// ============================================

// Get single scheduled meeting
router.get('/meetings/:id', requireAuth, meetingController.getScheduledMeetingById);

// Assign teacher to meeting (Admin only)
router.post('/meetings/:id/assign-teacher', requireAuth, meetingController.assignTeacherToMeeting);

// Update meeting status
router.put('/meetings/:id/status', requireAuth, meetingController.updateMeetingStatus);

// Update meeting attendance (Teacher only)
router.put('/meetings/:id/attendance', requireAuth, meetingController.updateAttendance);

// Update meeting notes link (Teacher only)
router.put('/meetings/:id/notes', requireAuth, meetingController.updateNotesLink);

// Update meeting resource link (Teacher only)
router.put('/meetings/:id/resource', requireAuth, meetingController.updateResourceLink);

// Reschedule meeting
router.put('/meetings/:id/reschedule', requireAuth, meetingController.rescheduleMeeting);

// Cancel meeting
router.delete('/meetings/:id', requireAuth, meetingController.cancelMeeting);

// Get meeting logs
router.get('/meetings/:id/logs', requireAuth, meetingController.getMeetingLogs);

export default router;
