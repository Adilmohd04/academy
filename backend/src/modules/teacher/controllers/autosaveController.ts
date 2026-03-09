import { Request, Response } from 'express';
import { AutosaveService } from '../services/autosaveService';

export class AutosaveController {
  private autosaveService: AutosaveService;

  constructor() {
    this.autosaveService = new AutosaveService();
  }

  /**
   * Save or update draft content
   * POST /api/teacher/autosave
   */
  saveDraft = async (req: Request, res: Response) => {
    try {
      const teacherId = req.auth?.userId;
      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { entity_type, entity_id, draft_content } = req.body;

      if (!entity_type || !draft_content) {
        return res.status(400).json({ 
          error: 'Missing required fields: entity_type, draft_content' 
        });
      }

      // If no entity_id, cannot save draft (entity must be created first)
      if (!entity_id) {
        return res.status(400).json({ 
          error: 'Cannot autosave: Entity must be created first',
          message: 'Please save the course/lesson first before autosaving'
        });
      }

      const result = await this.autosaveService.saveDraft({
        entity_type,
        entity_id,
        teacher_id: teacherId,
        draft_content
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error saving draft:', error);
      res.status(500).json({ 
        error: 'Failed to save draft',
        message: error.message 
      });
    }
  };

  /**
   * Get latest draft for entity
   * GET /api/teacher/autosave?entity_type=course&entity_id=xxx
   */
  getDraft = async (req: Request, res: Response) => {
    try {
      const teacherId = req.auth?.userId;
      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { entity_type, entity_id } = req.query;

      if (!entity_type) {
        return res.status(400).json({ 
          error: 'Missing required parameter: entity_type' 
        });
      }

      const draft = await this.autosaveService.getLatestDraft(
        teacherId,
        entity_type as string,
        entity_id as string | undefined
      );

      if (!draft) {
        return res.status(404).json({ error: 'No draft found' });
      }

      res.json(draft);
    } catch (error: any) {
      console.error('Error getting draft:', error);
      res.status(500).json({ 
        error: 'Failed to get draft',
        message: error.message 
      });
    }
  };

  /**
   * Delete draft
   * DELETE /api/teacher/autosave/:id
   */
  deleteDraft = async (req: Request, res: Response) => {
    try {
      const teacherId = req.auth?.userId;
      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      await this.autosaveService.deleteDraft(id, teacherId);

      res.json({
        success: true,
        message: 'Draft deleted'
      });
    } catch (error: any) {
      console.error('Error deleting draft:', error);
      res.status(500).json({ 
        error: 'Failed to delete draft',
        message: error.message 
      });
    }
  };

  /**
   * Clean up expired drafts (can be called by cron job)
   * DELETE /api/teacher/autosave/cleanup
   */
  cleanupExpiredDrafts = async (req: Request, res: Response) => {
    try {
      const count = await this.autosaveService.cleanupExpiredDrafts();

      res.json({
        success: true,
        message: `Cleaned up ${count} expired drafts`
      });
    } catch (error: any) {
      console.error('Error cleaning up drafts:', error);
      res.status(500).json({ 
        error: 'Failed to cleanup drafts',
        message: error.message 
      });
    }
  };
}
