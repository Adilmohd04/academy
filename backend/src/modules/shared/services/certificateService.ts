/**
 * Certificate Service with QR Code Generation
 * 
 * Handles:
 * - Certificate generation with unique verification codes
 * - QR code generation linking to verification portal
 * - PDF certificate generation
 * - Verification portal API
 */

import { supabase } from '../../../config/database';
import QRCode from 'qrcode';

const VERIFICATION_PORTAL_URL = process.env.VERIFICATION_PORTAL_URL || 'https://yourdomain.com/verify';

interface Certificate {
  id: string;
  course_id: string;
  student_id: string;
  verification_code: string;
  pdf_url?: string;
  qr_code_url?: string;
  final_grade: number;
  completion_date: string;
  status: string;
  is_manual_override: boolean;
  override_by?: string;
  override_reason?: string;
}

interface CertificateDetails {
  certificate: Certificate;
  student_name: string;
  student_email: string;
  course_title: string;
  course_description?: string;
  teacher_name: string;
}

/**
 * Generate unique verification code (XXXX-XXXX-XXXX format)
 */
const generateVerificationCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let result = '';
  
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) {
      result += '-';
    }
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * Generate QR code as base64 data URL
 */
const generateQRCode = async (verificationUrl: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1B365D',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Issue a new certificate
 */
export const issueCertificate = async (
  courseId: string,
  studentId: string,
  finalGrade: number,
  options?: {
    isManualOverride?: boolean;
    overrideBy?: string;
    overrideReason?: string;
  }
): Promise<Certificate> => {
  try {
    // Check if certificate already exists
    const { data: existing } = await supabase
      .from('certificates')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle();
    
    if (existing) {
      return existing;
    }
    
    // Generate unique verification code
    let verificationCode = generateVerificationCode();
    let codeExists = true;
    
    while (codeExists) {
      const { data: check } = await supabase
        .from('certificates')
        .select('id')
        .eq('verification_code', verificationCode)
        .maybeSingle();

      if (!check) {
        codeExists = false;
      } else {
        verificationCode = generateVerificationCode();
      }
    }
    
    // Generate QR code
    const verificationUrl = `${VERIFICATION_PORTAL_URL}/${verificationCode}`;
    const qrCodeDataUrl = await generateQRCode(verificationUrl);
    
    // Insert certificate
    const { data: result, error } = await supabase
      .from('certificates')
      .insert({
        course_id: courseId,
        student_id: studentId,
        verification_code: verificationCode,
        qr_code_url: qrCodeDataUrl,
        final_grade: finalGrade,
        is_manual_override: options?.isManualOverride || false,
        override_by: options?.overrideBy,
        override_reason: options?.overrideReason,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get certificate by verification code
 */
export const getCertificateByCode = async (
  verificationCode: string
): Promise<CertificateDetails | null> => {
  try {
    // First get the certificate
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('verification_code', verificationCode)
      .maybeSingle();

    if (certError) throw certError;
    if (!cert) return null;

    // Get student info
    const { data: student } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('clerk_user_id', cert.student_id)
      .maybeSingle();

    // Get course info
    const { data: course } = await supabase
      .from('courses')
      .select('title, description, teacher_id')
      .eq('id', cert.course_id)
      .maybeSingle();

    // Get teacher info if course exists
    let teacherName = '';
    if (course?.teacher_id) {
      const { data: teacher } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('clerk_user_id', course.teacher_id)
        .maybeSingle();
      teacherName = teacher?.full_name || '';
    }
    
    return {
      certificate: cert,
      student_name: student?.full_name || '',
      student_email: student?.email || '',
      course_title: course?.title || '',
      course_description: course?.description,
      teacher_name: teacherName
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Verify a certificate (public API)
 */
export const verifyCertificate = async (
  verificationCode: string,
  verifierIp?: string,
  verifierUserAgent?: string
): Promise<{
  valid: boolean;
  status: 'valid' | 'invalid' | 'revoked' | 'expired';
  certificate?: CertificateDetails;
  message: string;
}> => {
  try {
    const certDetails = await getCertificateByCode(verificationCode);
    
    if (!certDetails) {
      // Log failed verification
      await supabase
        .from('certificate_verification_log')
        .insert({
          certificate_id: null,
          verification_code: verificationCode,
          verified_by_ip: verifierIp,
          verified_by_user_agent: verifierUserAgent,
          verification_result: 'invalid'
        });
      
      return {
        valid: false,
        status: 'invalid',
        message: 'Certificate not found. Please check the verification code.'
      };
    }
    
    const cert = certDetails.certificate;
    let status: 'valid' | 'invalid' | 'revoked' | 'expired' = 'valid';
    let message = 'Certificate is valid and authentic.';
    
    if (cert.status === 'revoked') {
      status = 'revoked';
      message = 'This certificate has been revoked.';
    } else if (cert.status === 'expired') {
      status = 'expired';
      message = 'This certificate has expired.';
    }
    
    // Log verification
    await supabase
      .from('certificate_verification_log')
      .insert({
        certificate_id: cert.id,
        verification_code: verificationCode,
        verified_by_ip: verifierIp,
        verified_by_user_agent: verifierUserAgent,
        verification_result: status
      });
    
    // Update verification count
    await supabase
      .from('certificates')
      .update({
        verification_count: (cert as any).verification_count ? (cert as any).verification_count + 1 : 1,
        last_verified_at: new Date().toISOString()
      })
      .eq('id', cert.id);
    
    return {
      valid: status === 'valid',
      status,
      certificate: certDetails,
      message
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get student's certificates
 */
export const getStudentCertificates = async (
  studentId: string
): Promise<CertificateDetails[]> => {
  try {
    // Get certificates for this student
    const { data: certificates, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!certificates || certificates.length === 0) return [];

    // Get student info
    const { data: student } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('clerk_user_id', studentId)
      .maybeSingle();

    const studentName = student?.full_name || '';
    const studentEmail = student?.email || '';

    // Get course info for all certificates
    const courseIds = [...new Set(certificates.map(c => c.course_id))];
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, description, thumbnail_url, teacher_id')
      .in('id', courseIds);

    const courseMap = new Map((courses || []).map(c => [c.id, c]));

    // Get teacher info
    const teacherIds = [...new Set((courses || []).map(c => c.teacher_id).filter(Boolean))];
    const { data: teachers } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name')
      .in('clerk_user_id', teacherIds);

    const teacherMap = new Map((teachers || []).map(t => [t.clerk_user_id, t.full_name || '']));
    
    return certificates.map(cert => {
      const course = courseMap.get(cert.course_id);
      return {
        certificate: cert,
        student_name: studentName,
        student_email: studentEmail,
        course_title: course?.title || '',
        course_description: course?.description,
        teacher_name: course?.teacher_id ? (teacherMap.get(course.teacher_id) || '') : ''
      };
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get certificate by ID
 */
export const getCertificateById = async (
  certificateId: string
): Promise<CertificateDetails | null> => {
  try {
    // Get the certificate
    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .maybeSingle();

    if (error) throw error;
    if (!cert) return null;

    // Get student info
    const { data: student } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('clerk_user_id', cert.student_id)
      .maybeSingle();

    // Get course info
    const { data: course } = await supabase
      .from('courses')
      .select('title, description, teacher_id')
      .eq('id', cert.course_id)
      .maybeSingle();

    // Get teacher info if course exists
    let teacherName = '';
    if (course?.teacher_id) {
      const { data: teacher } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('clerk_user_id', course.teacher_id)
        .maybeSingle();
      teacherName = teacher?.full_name || '';
    }
    
    return {
      certificate: cert,
      student_name: student?.full_name || '',
      student_email: student?.email || '',
      course_title: course?.title || '',
      course_description: course?.description,
      teacher_name: teacherName
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Revoke a certificate (admin only)
 */
export const revokeCertificate = async (
  certificateId: string,
  reason: string
): Promise<Certificate> => {
  try {
    const { data: result, error } = await supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_reason: reason
      })
      .eq('id', certificateId)
      .select()
      .single();

    if (error) throw error;
    if (!result) throw new Error('Certificate not found');
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Reinstate a revoked certificate (admin only)
 */
export const reinstateCertificate = async (
  certificateId: string
): Promise<Certificate> => {
  try {
    const { data: result, error } = await supabase
      .from('certificates')
      .update({
        status: 'active',
        revoked_at: null,
        revoked_reason: null
      })
      .eq('id', certificateId)
      .select()
      .single();

    if (error) throw error;
    if (!result) throw new Error('Certificate not found');
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all certificates (admin view)
 */
export const getAllCertificates = async (
  options: {
    courseId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ certificates: CertificateDetails[]; total: number }> => {
  try {
    // Build query for certificates
    let query = supabase
      .from('certificates')
      .select('*', { count: 'exact' });

    if (options.courseId) {
      query = query.eq('course_id', options.courseId);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: certificates, error, count } = await query;

    if (error) throw error;
    if (!certificates || certificates.length === 0) {
      return { certificates: [], total: 0 };
    }

    // Get unique student IDs and course IDs
    const studentIds = [...new Set(certificates.map(c => c.student_id))];
    const courseIds = [...new Set(certificates.map(c => c.course_id))];

    // Get students
    const { data: students } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', studentIds);

    const studentMap = new Map((students || []).map(s => [s.clerk_user_id, s]));

    // Get courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, teacher_id')
      .in('id', courseIds);

    const courseMap = new Map((courses || []).map(c => [c.id, c]));

    // Get teachers
    const teacherIds = [...new Set((courses || []).map(c => c.teacher_id).filter(Boolean))];
    const { data: teachers } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name')
      .in('clerk_user_id', teacherIds);

    const teacherMap = new Map((teachers || []).map(t => [t.clerk_user_id, t.full_name || '']));
    
    return {
      certificates: certificates.map(cert => {
        const student = studentMap.get(cert.student_id);
        const course = courseMap.get(cert.course_id);
        return {
          certificate: cert,
          student_name: student?.full_name || '',
          student_email: student?.email || '',
          course_title: course?.title || '',
          course_description: undefined,
          teacher_name: course?.teacher_id ? (teacherMap.get(course.teacher_id) || '') : ''
        };
      }),
      total: count || 0
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get verification statistics for a certificate
 */
export const getCertificateVerificationStats = async (
  certificateId: string
): Promise<{
  total_verifications: number;
  last_verified_at: string | null;
  recent_verifications: any[];
}> => {
  try {
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .select('verification_count, last_verified_at')
      .eq('id', certificateId)
      .maybeSingle();

    if (certError) throw certError;
    if (!cert) throw new Error('Certificate not found');
    
    const { data: recentVerifications, error: logError } = await supabase
      .from('certificate_verification_log')
      .select('*')
      .eq('certificate_id', certificateId)
      .order('verified_at', { ascending: false })
      .limit(10);

    if (logError) throw logError;
    
    return {
      total_verifications: cert.verification_count || 0,
      last_verified_at: cert.last_verified_at,
      recent_verifications: recentVerifications || []
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Generate certificate HTML from template
 */
export const generateCertificateHTML = async (
  certificateId: string
): Promise<string> => {
  try {
    const certDetails = await getCertificateById(certificateId);
    
    if (!certDetails) {
      throw new Error('Certificate not found');
    }
    
    const { data: courseTemplate, error: courseTemplateError } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('course_id', certDetails.certificate.course_id)
      .maybeSingle();

    if (courseTemplateError) throw courseTemplateError;

    let template = courseTemplate;

    const isApprovedTemplate = (candidate: any) => {
      const status = candidate?.template_data?.approval_status;
      return !status || status === 'approved';
    };

    if (template && !isApprovedTemplate(template)) {
      template = null;
    }

    if (!template) {
      const { data: defaultTemplate, error: defaultTemplateError } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();

      if (defaultTemplateError) throw defaultTemplateError;
      template = isApprovedTemplate(defaultTemplate) ? defaultTemplate : null;
    }

    if (!template) throw new Error('No certificate template found');

    const templateHtml =
      template.template_html ||
      template.template_data?.template_html ||
      template.template_data?.html ||
      template.template_data?.content;

    if (!templateHtml) {
      throw new Error('Certificate template is missing HTML content');
    }

    const cert = certDetails.certificate;
    const certificateNumber = (cert as any).certificate_number || (cert as any).verification_code || cert.id;
    
    // Replace placeholders
    const html = String(templateHtml)
      .replace('{{STUDENT_NAME}}', certDetails.student_name)
      .replace('{{COURSE_TITLE}}', certDetails.course_title)
      .replace('{{FINAL_GRADE}}', cert.final_grade?.toString() || 'N/A')
      .replace('{{COMPLETION_DATE}}', new Date(cert.completion_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))
      .replace('{{QR_CODE_URL}}', cert.qr_code_url || '')
      .replace('{{VERIFICATION_CODE}}', cert.verification_code)
      .replace('{{CERTIFICATE_NUMBER}}', certificateNumber)
      .replace('{{CERTIFICATE_ID}}', certificateNumber)
      .replace('{{TEACHER_NAME}}', certDetails.teacher_name);
    
    return html;
  } catch (error) {
    throw error;
  }
};
