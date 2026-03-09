/**
 * Payment Routes
 * 
 * Handles all payment-related API endpoints and Razorpay integration
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as paymentController from '../modules/shared/controllers/paymentController';
import * as receiptController from '../modules/shared/controllers/receiptController';
import * as adminPaymentController from '../modules/admin/controllers/adminPaymentController';

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
// PAYMENT DETAILS
// ============================================

// Get payment by ID (Protected - for student to view their own payment)
router.get('/payments/:id', requireAuth, paymentController.getPaymentById);

// ============================================
// PAYMENT RECEIPTS
// ============================================

// Get payment receipt as PDF (Protected)
router.get('/payments/:id/receipt', requireAuth, paymentController.generatePaymentReceipt);

// Get student's payment history (Protected)
router.get('/student/payments', requireAuth, receiptController.getStudentPayments);

// ============================================
// ADMIN PAYMENT MANAGEMENT
// ============================================

// Get all payments with filters (Admin only)
router.get('/admin/payments', requireAuth, adminPaymentController.getAllPayments);

// Get payment by ID (Admin only)
router.get('/admin/payments/:paymentId', requireAuth, adminPaymentController.getPaymentById);

// Verify payment manually (Admin only)
router.post('/admin/payments/:paymentId/verify', requireAuth, adminPaymentController.verifyPayment);

// Refund payment (Admin only)
router.post('/admin/payments/:paymentId/refund', requireAuth, adminPaymentController.refundPayment);

export default router;
