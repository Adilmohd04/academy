import { Request, Response } from 'express';
import * as teacherPricingService from '../services/teacherPricingService';

/**
 * Get price for a specific teacher
 * GET /api/teacher-pricing/:teacherId
 */
export const getTeacherPrice = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const price = await teacherPricingService.getTeacherPrice(teacherId);
    
    res.json({ 
      price,
      isFree: price === 0,
      display: price === 0 ? 'FREE' : `₹${price}`
    });
  } catch (error: any) {
    console.error('Error fetching teacher price:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch teacher price' });
  }
};

/**
 * Get all teachers with their pricing (Admin only)
 * GET /api/teacher-pricing
 */
export const getAllTeacherPricing = async (req: Request, res: Response) => {
  try {
    const teachers = await teacherPricingService.getAllTeacherPricing();
    res.json({ data: teachers });
  } catch (error: any) {
    console.error('Error fetching all teacher pricing:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch teacher pricing' });
  }
};

/**
 * Update teacher price (Admin only)
 * PUT /api/teacher-pricing/:teacherId
 * Body: { price: number, notes?: string }
 */
export const updateTeacherPrice = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { price, notes } = req.body;

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Invalid price. Must be a positive number or 0 for FREE.' });
    }

    await teacherPricingService.setTeacherPrice(teacherId, price, notes);
    
    res.json({ 
      message: 'Teacher price updated successfully',
      price,
      isFree: price === 0,
      display: price === 0 ? 'FREE' : `₹${price}`
    });
  } catch (error: any) {
    console.error('Error updating teacher price:', error);
    res.status(500).json({ error: error.message || 'Failed to update teacher price' });
  }
};

/**
 * Set teacher to FREE (Admin only)
 * POST /api/teacher-pricing/:teacherId/free
 */
export const setTeacherFree = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { notes } = req.body;

    await teacherPricingService.setTeacherFree(teacherId, notes);
    
    res.json({ 
      message: 'Teacher set to FREE successfully',
      price: 0,
      isFree: true,
      display: 'FREE'
    });
  } catch (error: any) {
    console.error('Error setting teacher to FREE:', error);
    res.status(500).json({ error: error.message || 'Failed to set teacher to FREE' });
  }
};

/**
 * Reset teacher to global price (Admin only)
 * DELETE /api/teacher-pricing/:teacherId
 */
export const resetTeacherPrice = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    await teacherPricingService.resetTeacherToGlobalPrice(teacherId);
    
    res.json({ 
      message: 'Teacher reset to global price successfully'
    });
  } catch (error: any) {
    console.error('Error resetting teacher price:', error);
    res.status(500).json({ error: error.message || 'Failed to reset teacher price' });
  }
};
