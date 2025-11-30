/**
 * Payment Controller
 * 
 * Handles HTTP requests for payments and Razorpay integration
 */

import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';
import * as meetingService from '../services/meetingService';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabase } from '../config/database';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// ============================================
// RAZORPAY INTEGRATION
// ============================================

/**
 * Create Razorpay order
 * POST /api/payments/create-order
 */
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { meeting_request_id, amount } = req.body;

    if (!meeting_request_id || !amount) {
      return res.status(400).json({ error: 'Meeting request ID and amount are required' });
    }

    // Verify meeting request exists
    const meetingRequest = await meetingService.getMeetingRequestById(meeting_request_id);
    if (!meetingRequest) {
      return res.status(404).json({ error: 'Meeting request not found' });
    }

    // Create Razorpay order
    // Generate short receipt ID (max 40 chars for Razorpay)
    const shortId = meeting_request_id.substring(0, 8);
    const timestamp = Date.now().toString().substring(7); // Last 6 digits
    
    const options = {
      amount: amount * 100, // Convert to paise (smallest currency unit)
      currency: 'INR',
      receipt: `rcpt_${shortId}_${timestamp}`, // Max 40 chars
      notes: {
        meeting_request_id,
        student_name: meetingRequest.student_name,
        student_email: meetingRequest.student_email,
      }
    };

    const order = await razorpay.orders.create(options);

    // Create payment record in database
    const payment = await paymentService.createPaymentRecord({
      meeting_request_id,
      razorpay_order_id: order.id,
      amount,
      currency: 'INR',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      payment_record_id: payment.id,
      // In production, include Razorpay key_id for frontend
      // key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
};

/**
 * Verify Razorpay payment
 * POST /api/payments/verify
 */
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      meeting_request_id,
      payment_method,
      payment_email,
      payment_contact,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment verification details are required' 
      });
    }

    // Verify Razorpay signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const isValidSignature = expectedSignature === razorpay_signature;

    if (!isValidSignature) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid payment signature. Payment verification failed.' 
      });
    }

    // Update payment record
    const payment = await paymentService.updatePaymentRecord(razorpay_order_id, {
      razorpay_payment_id,
      razorpay_signature,
      payment_method,
      payment_email,
      payment_contact,
      payment_data: req.body,
      status: 'success',
    });

    // IMPORTANT: Try to create booking BEFORE marking as paid
    // This prevents the issue where payment succeeds but booking fails
    let bookingCreated = false;
    let booking = null;
    let bookingError = null;
    
    try {
      // Insert into meeting_bookings for admin approval/box logic
      console.log('🔄 Attempting to create booking for payment:', payment.id);
      console.log('🔄 Meeting request ID:', payment.meeting_request_id);
      booking = await meetingService.insertMeetingBooking(payment.meeting_request_id, payment.id);
      bookingCreated = true;
      console.log('✅ Booking created successfully:', booking.id);
    } catch (error: any) {
      bookingError = error;
      console.error('❌ Failed to create booking after successful payment:');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Meeting request ID:', payment.meeting_request_id);
      console.error('Payment ID:', payment.id);
      console.error('Full error:', JSON.stringify(error, null, 2));
    }

    // Only mark as 'paid' if booking was created successfully
    if (bookingCreated) {
      await meetingService.updateMeetingRequestStatus(payment.meeting_request_id, 'paid');
      console.log('✅ Meeting request marked as paid');
    } else {
      // If booking failed, mark as failed so student can retry
      await meetingService.updateMeetingRequestStatus(payment.meeting_request_id, 'failed');
      console.error('❌ Booking creation failed, marking meeting request as failed');
      
      // Return a proper error response with payment details
      return res.status(500).json({
        success: false,
        error: 'Booking creation failed after payment was successful',
        message: 'Your payment was received but we could not create the booking. Please contact support.',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        booking_error: bookingError?.message || 'Unknown error',
        support_message: `Payment ID: ${razorpay_payment_id}. Please save this for reference.`
      });
    }

    // Try to create scheduled meeting (optional - booking already exists)
    let scheduledMeeting = null;
    try {
      scheduledMeeting = await meetingService.createScheduledMeeting(
        payment.meeting_request_id,
        payment.id
      );
      console.log('✅ Scheduled meeting created:', scheduledMeeting?.id);
    } catch (scheduledError: any) {
      console.warn('⚠️  Could not create scheduled_meeting record (booking already exists):', scheduledError.message);
      // Don't fail the whole payment - the booking exists which is what matters
    }

    res.json({
      success: true,
      payment,
      meeting: scheduledMeeting,
      booking,
      message: 'Payment verified successfully. Your meeting has been scheduled and sent for admin approval!',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
    // Try to mark the meeting request as failed if we have the order_id
    const { razorpay_order_id } = req.body;
    if (razorpay_order_id) {
      try {
        const paymentRecord = await paymentService.getPaymentByOrderId(razorpay_order_id);
        if (paymentRecord && paymentRecord.meeting_request_id) {
          await meetingService.updateMeetingRequestStatus(paymentRecord.meeting_request_id, 'failed');
        }
      } catch (updateError) {
        console.error('Error updating meeting request status to failed:', updateError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to verify payment' 
    });
  }
};

/**
 * Handle Razorpay webhook
 * POST /api/payments/webhook
 */
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = req.body;

    // Verify webhook signature (in production)
    // const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // const expectedSignature = crypto
    //   .createHmac('sha256', secret)
    //   .update(JSON.stringify(webhookBody))
    //   .digest('hex');
    //
    // if (expectedSignature !== webhookSignature) {
    //   return res.status(400).json({ error: 'Invalid webhook signature' });
    // }

    const { event, payload } = webhookBody;

    switch (event) {
      case 'payment.captured':
        // Payment successful
        await paymentService.updatePaymentStatus(payload.payment.entity.order_id, 'captured');
        break;

      case 'payment.failed':
        // Payment failed
        await paymentService.updatePaymentStatus(payload.payment.entity.order_id, 'failed');
        break;

      case 'payment.refunded':
        // Payment refunded
        await paymentService.updatePaymentStatus(payload.payment.entity.order_id, 'refunded');
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: error.message || 'Webhook handling failed' });
  }
};

// ============================================
// PAYMENT RECORDS
// ============================================

/**
 * Get payment record by ID
 * GET /api/payments/:id
 */
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentRecordById(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payment' });
  }
};

/**
 * Get student's payment history
 * GET /api/payments/student/history
 */
export const getStudentPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payments = await paymentService.getStudentPayments(userId);
    res.json(payments);
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payment history' });
  }
};

/**
 * Get payment statistics (Admin only)
 * GET /api/payments/stats
 */
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const stats = await paymentService.getPaymentStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payment statistics' });
  }
};

/**
 * Generate payment receipt (Future: PDF generation)
 * GET /api/payments/:id/receipt
 */
export const generatePaymentReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentRecordById(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Fetch meeting request and slot info
    let studentName = '';
    let studentEmail = '';
    let studentPhone = '';
    let slotName = '';
    let slotTime = '';
    let topic = '';
    let description = '';
    if (payment.meeting_request_id) {
      const meetingRequest = await paymentService.getMeetingRequestById(payment.meeting_request_id);
      if (meetingRequest) {
        studentName = meetingRequest.student_name || '';
        studentEmail = meetingRequest.student_email || '';
        studentPhone = meetingRequest.student_phone || '';
        
        // Fetch topic and description from teacher_slot_availability
        if (meetingRequest.teacher_slot_id) {
          const { data: slotData } = await supabase
            .from('teacher_slot_availability')
            .select('topic, description')
            .eq('id', meetingRequest.teacher_slot_id)
            .single();
          
          if (slotData) {
            topic = slotData.topic || '';
            description = slotData.description || '';
          }
        }
        
        if (meetingRequest.time_slot_id) {
          const slot = await paymentService.getTimeSlotById(meetingRequest.time_slot_id);
          if (slot) {
            slotName = slot.slot_name || '';
            slotTime = `${slot.start_time || ''} - ${slot.end_time || ''}`;
          }
        }
      }
    }

    // Generate PDF receipt using pdfkit
    const PDFDocument = require('pdfkit');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payment-receipt-${id}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // Header
    doc.fillColor('black').fontSize(22).font('Helvetica-Bold').text('Islamic Academy Payment Receipt', { align: 'center' });
    doc.moveDown(1.5);

    // Payment Info Section
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Details', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Receipt ID: ${id}`);
    doc.text(`Pay ID: ${payment.razorpay_payment_id || 'N/A'}`);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleString()}`);
    doc.text(`Amount Paid: ₹${(payment.amount / 100).toFixed(2)}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown();

    // Meeting Info Section
    doc.font('Helvetica-Bold').text('Meeting Details', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(`Student Name: ${studentName}`);
    doc.text(`Student Email: ${studentEmail}`);
    doc.text(`Student Phone: ${studentPhone}`);
    if (slotName) {
      doc.text(`Slot: ${slotName}`);
      doc.text(`Time: ${slotTime}`);
    }
    doc.moveDown();

    // Islamic Topic Section
    if (topic) {
      doc.font('Helvetica-Bold').text('Islamic Learning Topic', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(12).text(topic);
      if (description) {
        doc.font('Helvetica').fontSize(10).text(description, { width: 500 });
      }
      doc.moveDown();
    }

    // Footer
    doc.moveDown(1);
    doc.font('Helvetica-Oblique').fontSize(12).fillColor('black').text('JazakAllah Khair for your payment!', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).fillColor('black').text('For any queries, contact support@yourislamicacademy.com', { align: 'center' });

    doc.end();
  } catch (error: any) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: error.message || 'Failed to generate receipt' });
  }
};
