import { Request, Response } from 'express';
import { 
  getPendingBoxes as getPendingBoxesService, 
  approveBox as approveBoxService, 
  closeBox as closeBoxService, 
  autoCloseExpiredBoxes as autoCloseExpiredBoxesService
} from '../services/boxApprovalService';
export const getPendingBoxes = async (req: Request, res: Response) => {
  try {
    const boxes = await getPendingBoxesService();
    res.json({
      success: true,
      data: boxes,
      count: boxes.length
    });
  } catch (error: any) {
    console.error('Error fetching pending boxes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending boxes'
    });
  }
};

/**
 * Approve an entire box (batch approval)
 * POST /api/boxes/:boxId/approve
 * Body: { meetingLink?: string }
 */
export const approveBox = async (req: Request, res: Response) => {
  try {
    const { boxId } = req.params;
    const { meetingLink } = req.body;
    const adminId = (req as any).auth?.userId;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    const result = await approveBoxService(boxId, adminId, meetingLink);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error approving box:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve box'
    });
  }
};


/**
 * Close a box manually
 * POST /api/boxes/:boxId/close
 */
export const closeBox = async (req: Request, res: Response) => {
  try {
    const { boxId } = req.params;
    await closeBoxService(boxId);
    res.json({
      success: true,
      message: '🔒 Box closed successfully'
    });
  } catch (error: any) {
    console.error('Error closing box:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to close box'
    });
  }
};

/**
 * Auto-close expired boxes (cron endpoint)
 * POST /api/boxes/auto-close
 */
export const autoCloseExpiredBoxes = async (req: Request, res: Response) => {
  try {
    const closedCount = await autoCloseExpiredBoxesService();
    res.json({
      success: true,
      message: `🔒 Auto-closed ${closedCount} expired boxes`,
      closedCount
    });
  } catch (error: any) {
    console.error('Error auto-closing boxes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to auto-close boxes'
    });
  }
};
