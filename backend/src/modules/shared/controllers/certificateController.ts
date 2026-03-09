/**
 * Certificate Controller
 * 
 * API endpoints for certificate management and verification
 */

import { Request, Response } from 'express';
import * as certificateService from '../services/certificateService';
import { CertificatePdfService } from '../../../services/certificatePdfService';

const pdfService = new CertificatePdfService();

/**
 * Issue a certificate for a student
 */
export const issueCertificate = async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.params;
    const { final_grade, is_manual_override, override_reason } = req.body;
    const adminId = req.auth?.userId;
    
    const certificate = await certificateService.issueCertificate(
      courseId,
      studentId,
      final_grade,
      {
        isManualOverride: is_manual_override,
        overrideBy: adminId,
        overrideReason: override_reason
      }
    );
    
    res.status(201).json({
      success: true,
      data: certificate,
      message: 'Certificate issued successfully'
    });
  } catch (error: any) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to issue certificate'
    });
  }
};

/**
 * Verify a certificate (public endpoint)
 */
export const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const verifierIp = req.ip || req.socket.remoteAddress;
    const verifierUserAgent = req.headers['user-agent'];
    
    const result = await certificateService.verifyCertificate(
      code,
      verifierIp,
      verifierUserAgent
    );
    
    // Return appropriate HTTP status based on result
    const statusCode = result.valid ? 200 : result.status === 'invalid' ? 404 : 200;
    
    res.status(statusCode).json({
      success: result.valid,
      status: result.status,
      message: result.message,
      data: result.certificate ? {
        student_name: result.certificate.student_name,
        course_title: result.certificate.course_title,
        final_grade: result.certificate.certificate.final_grade,
        completion_date: result.certificate.certificate.completion_date,
        teacher_name: result.certificate.teacher_name,
        verification_code: result.certificate.certificate.verification_code
      } : null
    });
  } catch (error: any) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify certificate'
    });
  }
};

/**
 * Get student's certificates
 */
export const getMyCertificates = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const certificates = await certificateService.getStudentCertificates(studentId);
    
    res.json({
      success: true,
      data: certificates
    });
  } catch (error: any) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch certificates'
    });
  }
};

/**
 * Get certificate by ID
 */
export const getCertificate = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await certificateService.getCertificateById(certificateId);
    
    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found'
      });
    }
    
    res.json({
      success: true,
      data: certificate
    });
  } catch (error: any) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch certificate'
    });
  }
};

/**
 * Get all certificates (admin view)
 */
export const getAllCertificates = async (req: Request, res: Response) => {
  try {
    const { courseId, status, limit, offset } = req.query;
    
    const result = await certificateService.getAllCertificates({
      courseId: courseId as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    
    res.json({
      success: true,
      data: result.certificates,
      total: result.total
    });
  } catch (error: any) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch certificates'
    });
  }
};

/**
 * Revoke a certificate (admin only)
 */
export const revokeCertificate = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Revocation reason is required'
      });
    }
    
    const certificate = await certificateService.revokeCertificate(certificateId, reason);
    
    res.json({
      success: true,
      data: certificate,
      message: 'Certificate revoked successfully'
    });
  } catch (error: any) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revoke certificate'
    });
  }
};

/**
 * Reinstate a revoked certificate (admin only)
 */
export const reinstateCertificate = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await certificateService.reinstateCertificate(certificateId);
    
    res.json({
      success: true,
      data: certificate,
      message: 'Certificate reinstated successfully'
    });
  } catch (error: any) {
    console.error('Error reinstating certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reinstate certificate'
    });
  }
};

/**
 * Get verification statistics for a certificate
 */
export const getVerificationStats = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    
    const stats = await certificateService.getCertificateVerificationStats(certificateId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching verification stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch verification stats'
    });
  }
};

/**
 * Get certificate HTML for preview/download
 */
export const getCertificateHTML = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    
    const html = await certificateService.generateCertificateHTML(certificateId);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error generating certificate HTML:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate certificate'
    });
  }
};

/**
 * Download certificate as PDF
 */
export const downloadCertificatePDF = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    
    // Get certificate data
    const certificateDetails = await certificateService.getCertificateById(certificateId);
    
    if (!certificateDetails) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found'
      });
    }

    const { certificate, student_name, course_title, teacher_name } = certificateDetails;

    // Generate PDF
    const pdfBuffer = await pdfService.generateCertificatePDF({
      id: certificate.id,
      student_name,
      course_title,
      teacher_name: teacher_name || 'Islamic Academy',
      completion_date: certificate.completion_date,
      verification_code: certificate.verification_code,
      percentage: Number(certificate.final_grade) || 0,
      grade: certificate.final_grade?.toString() || 'N/A',
      total_marks: 100 // Default, can be adjusted based on your grading system
    });

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificate.verification_code}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating certificate PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF'
    });
  }
};
