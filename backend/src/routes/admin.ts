import { Router } from 'express';
import { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as courseController from '../modules/admin/controllers/courseController';
import * as teacherController from '../modules/admin/controllers/teacherController';
import * as courseArchivalController from '../modules/admin/controllers/courseArchivalController';
import * as teacherPricingService from '../modules/teacher/services/teacherPricingService';
import { UserService } from '../modules/shared/services/userService';
import { UserRole } from '../types';
import { supabase } from '../config/database';

const router = Router();

// Apply admin middleware to all routes
router.use(requireAuth, requireRole(['admin']));

// Course Management
router.get('/courses', courseController.getAllCourses);
router.get('/courses/pending', courseController.getPendingCourses);
router.put('/courses/:id/approve', courseController.approveCourse);
router.put('/courses/:id/reject', courseController.rejectCourse);
router.put('/courses/:id/price', courseController.updateCoursePrice);
router.delete('/courses/:id', courseController.deleteCourse);
router.post('/courses/:id/co-teachers', courseController.addCoTeacher);
router.delete('/courses/:id/co-teachers/:teacherId', courseController.removeCoTeacher);

// Teacher Management
router.get('/teachers', teacherController.getAllTeachers);

const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/**
 * The admin teacher/calendar pages use this read model.  It deliberately
 * accepts either legacy profile UUIDs or current Clerk IDs and normalizes
 * them before reading slots, rather than silently returning an empty calendar.
 */
router.get('/teacher-slots', async (req: Request, res: Response) => {
  try {
    const rawTeacherId = typeof req.query.teacher_id === 'string' ? req.query.teacher_id.trim() : '';
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    if ((startDate && !endDate) || (!startDate && endDate)) {
      return res.status(400).json({ error: 'start_date and end_date must be provided together' });
    }
    if ((startDate && !isIsoDate(startDate)) || (endDate && !isIsoDate(endDate))) {
      return res.status(400).json({ error: 'Dates must use YYYY-MM-DD format' });
    }
    if (isIsoDate(startDate) && isIsoDate(endDate) && startDate > endDate) {
      return res.status(400).json({ error: 'start_date must not be after end_date' });
    }

    let teacherIdentifiers: string[] | undefined;
    if (rawTeacherId) {
      let profileResult = await supabase
        .from('profiles')
        .select('id, clerk_user_id, role')
        .eq('clerk_user_id', rawTeacherId)
        .maybeSingle();

      if (!profileResult.data && !profileResult.error) {
        profileResult = await supabase
          .from('profiles')
          .select('id, clerk_user_id, role')
          .eq('id', rawTeacherId)
          .maybeSingle();
      }

      if (profileResult.error) {
        console.error('Error resolving teacher for admin slots:', profileResult.error);
        return res.status(500).json({ error: 'Unable to load teacher slots' });
      }
      if (!profileResult.data || profileResult.data.role !== 'teacher') {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      teacherIdentifiers = [profileResult.data.id, profileResult.data.clerk_user_id]
        .filter((identifier): identifier is string => Boolean(identifier));
    }

    let query = supabase
      .from('teacher_slot_availability')
      .select(`
        id,
        teacher_id,
        date,
        max_capacity,
        current_bookings,
        is_available,
        is_free,
        meeting_price,
        topic,
        notes,
        time_slots!time_slot_id ( start_time, end_time ),
        meeting_bookings ( payment_status, payment_amount )
      `)
      .order('date', { ascending: true });

    if (teacherIdentifiers) query = query.in('teacher_id', teacherIdentifiers);
    if (isIsoDate(startDate) && isIsoDate(endDate)) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: slots, error } = await query;
    if (error) {
      console.error('Error fetching admin teacher slots:', error);
      return res.status(500).json({ error: 'Unable to load teacher slots' });
    }

    const ownerIds = Array.from(new Set((slots || []).map((slot: any) => slot.teacher_id).filter(Boolean)));
    const [{ data: profilesByClerk }, { data: profilesById }] = await Promise.all([
      ownerIds.length > 0
        ? supabase.from('profiles').select('id, clerk_user_id, full_name').in('clerk_user_id', ownerIds)
        : Promise.resolve({ data: [] as any[] }),
      ownerIds.length > 0
        ? supabase.from('profiles').select('id, clerk_user_id, full_name').in('id', ownerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const names = new Map<string, string>();
    [...(profilesByClerk || []), ...(profilesById || [])].forEach((profile: any) => {
      if (profile.id) names.set(profile.id, profile.full_name || 'Unknown teacher');
      if (profile.clerk_user_id) names.set(profile.clerk_user_id, profile.full_name || 'Unknown teacher');
    });

    return res.json((slots || []).map((slot: any) => ({
      ...slot,
      teacher_name: names.get(slot.teacher_id) || 'Unknown teacher',
    })));
  } catch (error) {
    console.error('Error in admin teacher-slots route:', error);
    return res.status(500).json({ error: 'Unable to load teacher slots' });
  }
});

// Teacher Pricing
router.post('/teacher-price', async (req: Request, res: Response) => {
  try {
    const { clerk_user_id, price } = req.body;
    await teacherPricingService.setTeacherPrice(clerk_user_id, price);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating teacher price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

router.post('/teacher-free', async (req: Request, res: Response) => {
  try {
    const { teacher_id, is_free } = req.body;
    if (is_free) {
      await teacherPricingService.setTeacherPrice(teacher_id, 0);
    } else {
      // Get global price and set teacher to paid
      const globalPriceResult = await teacherPricingService.getTeacherPrice(teacher_id);
      await teacherPricingService.setTeacherPrice(teacher_id, globalPriceResult || 100);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling teacher free status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

  // Admin: change user role via clerk_user_id (used by frontend admin UI)
  router.post('/change-role', async (req: Request, res: Response) => {
    try {
      const { clerk_user_id, role } = req.body;

      if (!clerk_user_id || !role) {
        return res.status(400).json({ success: false, message: 'Missing clerk_user_id or role' });
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role', validRoles: Object.values(UserRole) });
      }

      const profile = await UserService.getUserByClerkId(clerk_user_id);
      if (!profile) return res.status(404).json({ success: false, message: 'User profile not found' });

      await UserService.updateUserRole(profile.id, role);

      res.json({ success: true });
    } catch (error) {
      console.error('Error changing role:', error);
      res.status(500).json({ success: false, message: 'Failed to change role' });
    }
  });

  // Admin: delete user by clerk_user_id (used by frontend admin UI)
  router.delete('/delete-user', async (req: Request, res: Response) => {
    try {
      const { clerk_user_id } = req.body;
      if (!clerk_user_id) return res.status(400).json({ success: false, message: 'Missing clerk_user_id' });

      const profile = await UserService.getUserByClerkId(clerk_user_id);
      if (!profile) return res.status(404).json({ success: false, message: 'User profile not found' });

      await UserService.deleteUser(profile.id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
  });

// Course Archival System
router.post('/courses/:courseId/archive', courseArchivalController.archiveCourse);
router.post('/courses/:courseId/restore', courseArchivalController.restoreCourse);
router.get('/courses/archived', courseArchivalController.getArchivedCourses);
router.get('/courses/:courseId/archive-details', courseArchivalController.getCourseArchiveDetails);
router.delete('/courses/:courseId/permanent', courseArchivalController.permanentlyDeleteCourse);
router.get('/archive-statistics', courseArchivalController.getArchiveStatistics);
router.post('/courses/:courseId/convert-to-prerecorded', courseArchivalController.convertToPreRecorded);

export default router;
