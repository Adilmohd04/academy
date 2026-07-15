/**
 * Student Payment Controllers
 * Handle payment history and slip generation
 */

import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';
import * as sharedPaymentController from '../../shared/controllers/paymentController';

/**
 * Create a payment order for course enrollment
 */
export const createPaymentOrder = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    const { courseId } = req.body;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const result = await paymentService.createPaymentOrder(studentId, courseId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create payment order' 
    });
  }
};

/**
 * Verify and confirm Razorpay payment
 */
export const verifyPayment = async (req: Request, res: Response) => {
  // Delegate to shared payment controller which contains enrollment and booking logic
  return sharedPaymentController.verifyRazorpayPayment(req as any, res as any);
};

/**
 * Get payment history for logged-in student
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const payments = await paymentService.getPaymentHistory(userId);

    res.json({ success: true, payments });
  } catch (error: any) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * Get payment slip data
 */
export const getPaymentSlip = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const slipData = await paymentService.generatePaymentSlipData(paymentId, userId);

    res.json({ success: true, slip: slipData });
  } catch (error: any) {
    console.error('Error getting payment slip:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
