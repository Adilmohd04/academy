import { supabase } from '../../../config/database';
import { resolveCertificateStudentIdentity } from './studentIdentity';
import { removeCertificatePdfArtifacts } from './certificatePdfService';

/**
 * Certificate Service
 * 
 * Handles certificate generation, awarding, and revocation
 */

interface GradeBreakdown {
  quiz_average: number;
  assignment_average: number;
  final_exam_score: number;
}

interface FinalScoreResult {
  final_score: number;
  quiz_average: number;
  assignment_average: number;
  final_exam_score: number;
  passed: boolean;
}

/**
 * Calculate student's final score for a course
 */
export const calculateFinalScore = async (
  courseId: string,
  studentId: string
): Promise<FinalScoreResult | null> => {
  try {
    const identity = await resolveCertificateStudentIdentity(studentId);
    if (!identity) {
      console.warn('[certificate] cannot calculate a final score without a matching student profile');
      return null;
    }

    const { data, error } = await supabase.rpc('calculate_student_final_score', {
      p_course_id: courseId,
      // The grading function is UUID-backed because assessment rows reference
      // profiles.id, not the Clerk ID stored by enrollments/certificates.
      p_student_id: identity.profileId
    });

    if (error) {
      console.error('Error calculating final score:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in calculateFinalScore:', error);
    return null;
  }
};

/**
 * Check if student is eligible for certificate
 */
export const isEligibleForCertificate = async (
  courseId: string,
  studentId: string
): Promise<boolean> => {
  try {
    // Check if certificates are enabled for the course
    const { data: course } = await supabase
      .from('courses')
      .select('enable_certificates')
      .eq('id', courseId)
      .single();

    if (!course?.enable_certificates) {
      return false;
    }

    // Calculate final score
    const scoreData = await calculateFinalScore(courseId, studentId);
    
    return scoreData ? scoreData.passed : false;
  } catch (error) {
    console.error('Error checking certificate eligibility:', error);
    return false;
  }
};

/**
 * Legacy award adapter.
 *
 * Older teacher routes call this service directly.  Keeping a separate insert
 * implementation here previously let those routes create certificates without
 * the template snapshot, public verification code, or QR image that the
 * lifecycle guarantees.  Delegate to the canonical issuance service instead.
 *
 * The dynamic import deliberately avoids a static cycle: issuanceService uses
 * `calculateFinalScore` from this module.
 */
export const awardCertificate = async (
  courseId: string,
  studentId: string,
  _issuedBy?: string
): Promise<{ success: boolean; certificate?: any; error?: string }> => {
  try {
    const { issueCertificate } = await import('./issuanceService.js');
    const result = await issueCertificate(courseId, studentId);

    if (result.ok === false) {
      return {
        success: false,
        error:
          result.error === 'not_eligible'
            ? 'Student has not met all certificate requirements'
            : result.error,
      };
    }

    // A revoked record must remain revoked.  Reissuing it in place would both
    // erase the revocation audit trail and leave a prior public QR ambiguous.
    if (String(result.certificate?.status || '').toLowerCase() === 'revoked') {
      return {
        success: false,
        error: 'Certificate is revoked. Use the lifecycle reissue workflow instead.',
      };
    }

    return { success: true, certificate: result.certificate };
  } catch (error: any) {
    console.error('Error in awardCertificate:', error);
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Revoke a certificate
 */
export const revokeCertificate = async (
  certificateId: string,
  revokedBy: string | null,
  reason: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('certificates')
      .select('id, status, verification_code')
      .eq('id', certificateId)
      .maybeSingle();

    if (existingError || !existing) {
      return { success: false, error: 'Certificate not found' };
    }

    // Do not overwrite the original revocation timestamp/reason on retries.
    // The certificate (including its QR credential) remains in place so public
    // verification immediately reports the revoked state.
    if (String(existing.status || '').toLowerCase() === 'revoked') {
      return { success: true };
    }

    const { error } = await supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy ?? null,
        revoke_reason: reason,
        // A direct PDF must never continue to look like a current credential
        // after revocation. The QR row remains so the public verifier reports
        // the durable revoked state rather than an ambiguous missing record.
        pdf_url: null,
      })
      .eq('id', certificateId);

    if (error) {
      console.error('Error revoking certificate:', error);
      return { success: false, error: 'Failed to revoke certificate' };
    }

    try {
      await removeCertificatePdfArtifacts(existing.id, existing.verification_code);
    } catch (storageError) {
      // Revocation is authoritative in the database. Do not turn a storage
      // cleanup issue into a failed lifecycle transition.
      console.warn('[certificate] could not remove revoked PDF artifact:', storageError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in revokeCertificate:', error);
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Get student's certificate for a course
 */
export const getStudentCertificate = async (
  courseId: string,
  studentId: string
): Promise<any | null> => {
  try {
    const identity = await resolveCertificateStudentIdentity(studentId);
    if (!identity) return null;

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          title,
          description
        )
      `)
      .eq('course_id', courseId)
      .eq('student_id', identity.clerkUserId)
      // A revoked record is preserved when a corrected certificate is
      // reissued. The student-facing course view must select the one current
      // credential rather than failing because the immutable history has two
      // rows.
      .in('status', ['active', 'awarded', 'issued'])
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No certificate found
      }
      console.error('Error fetching certificate:', error);
      return null;
    }

    // Manually fetch student profile
    let studentProfile = null;
    if (certificate?.student_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('clerk_user_id', certificate.student_id)
        .single();
      studentProfile = profile;
    }

    return {
      ...certificate,
      profiles: studentProfile
    };
  } catch (error) {
    console.error('Error in getStudentCertificate:', error);
    return null;
  }
};

/**
 * Get all certificates for a course
 */
export const getCourseCertificates = async (
  courseId: string
): Promise<any[]> => {
  try {
    const { data: certificates, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('course_id', courseId)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error fetching course certificates:', error);
      return [];
    }

    // Manually fetch student profiles
    const studentIds = (certificates || []).map((c: any) => c.student_id).filter(Boolean);
    let profilesMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('clerk_user_id, full_name, email')
        .in('clerk_user_id', studentIds);
      profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.clerk_user_id] = p;
        return acc;
      }, {});
    }

    return (certificates || []).map((cert: any) => ({
      ...cert,
      profiles: profilesMap[cert.student_id] || null
    }));
  } catch (error) {
    console.error('Error in getCourseCertificates:', error);
    return [];
  }
};

/**
 * Get all certificates for a student
 */
export const getStudentCertificates = async (
  studentId: string
): Promise<any[]> => {
  try {
    const identity = await resolveCertificateStudentIdentity(studentId);
    if (!identity) return [];

    const { data: certificates, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          title,
          description,
          category
        )
      `)
      .eq('student_id', identity.clerkUserId)
      // Revoked certificates are included deliberately. Dropping them made a
      // revoked credential silently disappear from the student's list, which
      // is worse than showing it as revoked — the portal renders an explicit
      // "Revoked" state, and the public verification page reports the same.
      .in('status', ['active', 'awarded', 'issued', 'revoked'])
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error fetching student certificates:', error);
      return [];
    }

    return certificates || [];
  } catch (error) {
    console.error('Error in getStudentCertificates:', error);
    return [];
  }
};

/**
 * Check and auto-award certificate if eligible
 */
export const checkAndAwardCertificate = async (
  courseId: string,
  studentId: string
): Promise<{ awarded: boolean; certificate?: any }> => {
  try {
    // Check if eligible
    const eligible = await isEligibleForCertificate(courseId, studentId);
    
    if (!eligible) {
      return { awarded: false };
    }

    // Award certificate
    const result = await awardCertificate(courseId, studentId);
    
    return {
      awarded: result.success,
      certificate: result.certificate
    };
  } catch (error) {
    console.error('Error in checkAndAwardCertificate:', error);
    return { awarded: false };
  }
};

export default {
  calculateFinalScore,
  isEligibleForCertificate,
  awardCertificate,
  revokeCertificate,
  getStudentCertificate,
  getCourseCertificates,
  getStudentCertificates,
  checkAndAwardCertificate
};
