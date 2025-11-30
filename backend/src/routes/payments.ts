/**
 * Payment Routes
 * 
 * Handles all payment-related API endpoints and Razorpay integration
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as paymentController from '../controllers/paymentController';

const router = Router();

// ============================================
// RAZORPAY INTEGRATION
// ============================================

// Create Razorpay order (Protected)
router.post('/payments/create-order', requireAuth, paymentController.createRazorpayOrder);

// Verify Razorpay payment (Protected)
router.post('/payments/verify', requireAuth, paymentController.verifyRazorpayPayment);

// Razorpay webhook (Public - signature verification inside controller)
router.post('/payments/webhook', paymentController.handleRazorpayWebhook);

// ============================================
// PAYMENT RECORDS
// ============================================

// Get payment by ID (Protected)
router.get('/payments/:id', requireAuth, paymentController.getPaymentById);

// Get student's payment history (Protected)
router.get('/payments/student/history', requireAuth, paymentController.getStudentPaymentHistory);

// Get payment statistics (Admin only)
router.get('/payments/stats', requireAuth, paymentController.getPaymentStats);

// Generate payment receipt (Protected)
router.get('/payments/:id/receipt', requireAuth, paymentController.generatePaymentReceipt);

export default router;
