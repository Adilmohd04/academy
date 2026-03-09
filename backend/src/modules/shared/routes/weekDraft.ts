/**
 * Week Draft Mode Routes
 * 
 * Routes for Week 0 draft functionality
 */

import { Router } from 'express';
import * as weekDraftController from '../controllers/weekDraftController';
import { requireAuth as authenticate, requireRole } from '../../../middleware/clerkAuth';

// Helper to match existing route pattern
const authorizeRole = (roles: string[]) => requireRole(roles);

const router = Router();

// All routes require authentication and teacher/admin role
router.use(authenticate);
router.use(authorizeRole(['admin', 'teacher']));

// ============================================
// WEEK DRAFT MANAGEMENT
// ============================================

/**
 * Create a new week draft
 * POST /api/drafts/courses/:courseId/weeks
 * 
 * Body: { week_number, title, description? }
 */
router.post('/courses/:courseId/weeks', weekDraftController.createWeekDraft);

/**
 * Save week draft
 * PATCH /api/drafts/weeks/:weekId
 * 
 * Body: { title?, description? }
 */
router.patch('/weeks/:weekId', weekDraftController.saveWeekDraft);

/**
 * Get week with all content
 * GET /api/drafts/weeks/:weekId/content
 */
router.get('/weeks/:weekId/content', weekDraftController.getWeekWithContent);

/**
 * Check if week is ready to publish
 * GET /api/drafts/weeks/:weekId/ready
 */
router.get('/weeks/:weekId/ready', weekDraftController.checkReadyToPublish);

// ============================================
// AUTOSAVE
// ============================================

/**
 * Autosave draft content
 * POST /api/drafts/autosave/:entityType/:entityId
 * 
 * Body: { draft_content: {...} }
 */
router.post('/autosave/:entityType/:entityId', weekDraftController.autosaveDraft);

/**
 * Get autosaved draft
 * GET /api/drafts/autosave/:entityType/:entityId
 */
router.get('/autosave/:entityType/:entityId', weekDraftController.getAutosavedDraft);

/**
 * Discard autosaved draft
 * DELETE /api/drafts/autosave/:entityType/:entityId
 */
router.delete('/autosave/:entityType/:entityId', weekDraftController.discardAutosave);

/**
 * Get all my autosaves
 * GET /api/drafts/autosaves
 */
router.get('/autosaves', weekDraftController.getMyAutosaves);

// ============================================
// PUBLISHING
// ============================================

/**
 * Publish week and all content
 * POST /api/drafts/weeks/:weekId/publish
 */
router.post('/weeks/:weekId/publish', weekDraftController.publishWeek);

/**
 * Unpublish week (return to draft)
 * POST /api/drafts/weeks/:weekId/unpublish
 */
router.post('/weeks/:weekId/unpublish', weekDraftController.unpublishWeek);

/**
 * Publish single lesson
 * POST /api/drafts/lessons/:lessonId/publish
 */
router.post('/lessons/:lessonId/publish', weekDraftController.publishLesson);

// ============================================
// CONTENT RETRIEVAL
// ============================================

/**
 * Get my draft weeks
 * GET /api/drafts/weeks
 * 
 * Query params:
 *   - courseId: Filter by course
 */
router.get('/weeks', weekDraftController.getMyDraftWeeks);

/**
 * Get publishing history
 * GET /api/drafts/history/:entityType/:entityId
 */
router.get('/history/:entityType/:entityId', weekDraftController.getPublishHistory);

export default router;
