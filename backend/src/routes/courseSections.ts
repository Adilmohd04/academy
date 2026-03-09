import express from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as sectionService from '../modules/teacher/services/sectionService';
import * as lessonService from '../modules/student/services/lessonService';

const router = express.Router();

// ============================================
// COURSE SECTIONS ROUTES
// ============================================

// Get all sections for a course
router.get('/courses/:courseId/sections', requireAuth, async (req: any, res) => {
  try {
    const { courseId } = req.params;
    const sections = await sectionService.getCourseSections(courseId);
    
    // Fetch lessons for each section
    const sectionsWithLessons = await Promise.all(
      sections.map(async (section) => {
        const lessons = await lessonService.getSectionLessons(section.id);
        return {
          ...section,
          lessons,
        };
      })
    );

    res.json({ success: true, data: sectionsWithLessons });
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new section
router.post('/courses/:courseId/sections', requireAuth, async (req: any, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, order_index, unlock_date } = req.body;

    const section = await sectionService.createSection({
      course_id: courseId,
      title,
      description,
      order_index,
      unlock_date,
    });

    res.json({ success: true, data: section });
  } catch (error: any) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a section
router.put('/sections/:sectionId', requireAuth, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    const updates = req.body;

    const section = await sectionService.updateSection(sectionId, updates);
    res.json({ success: true, data: section });
  } catch (error: any) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a section
router.delete('/sections/:sectionId', requireAuth, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    await sectionService.deleteSection(sectionId);
    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SECTION LESSONS ROUTES
// ============================================

// Get all lessons for a section
router.get('/sections/:sectionId/lessons', requireAuth, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    const lessons = await lessonService.getSectionLessons(sectionId);
    res.json({ success: true, data: lessons });
  } catch (error: any) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new lesson
router.post('/sections/:sectionId/lessons', requireAuth, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    const { title, type, video_url, duration_minutes, order_index } = req.body;

    const lesson = await lessonService.createLesson({
      section_id: sectionId,
      title,
      type,
      video_url,
      duration_minutes,
      order_index,
    });

    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a lesson
router.put('/lessons/:lessonId', requireAuth, async (req: any, res) => {
  try {
    const { lessonId } = req.params;
    const updates = req.body;

    const lesson = await lessonService.updateLesson(lessonId, updates);
    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a lesson
router.delete('/lessons/:lessonId', requireAuth, async (req: any, res) => {
  try {
    const { lessonId } = req.params;
    await lessonService.deleteLesson(lessonId);
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
