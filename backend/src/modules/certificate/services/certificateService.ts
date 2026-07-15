import { supabase } from '../../../config/database';

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
    const { data, error } = await supabase.rpc('calculate_student_final_score', {
      p_course_id: courseId,
      p_student_id: studentId
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
 * Award certificate to student
 */
export const awardCertificate = async (
  courseId: string,
  studentId: string,
  issuedBy?: string
): Promise<{ success: boolean; certificate?: any; error?: string }> => {
  try {
    // Check if already has certificate
    const { data: existing } = await supabase
      .from('certificates')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      if (existing.status === 'awarded') {
        return { success: false, error: 'Certificate already awarded' };
      }
      // If revoked, can re-award by updating
    }

    // Calculate final score
    const scoreData = await calculateFinalScore(courseId, studentId);

    if (!scoreData || !scoreData.passed) {
      return { success: false, error: 'Student has not passed the course' };
    }

    // Generate certificate number
    const { data: certNumber } = await supabase.rpc('generate_certificate_number');

    if (!certNumber) {
      return { success: false, error: 'Failed to generate certificate number' };
    }

    const gradeBreakdown: GradeBreakdown = {
      quiz_average: scoreData.quiz_average,
      assignment_average: scoreData.assignment_average,
      final_exam_score: scoreData.final_exam_score
    };

    // Create or update certificate
    if (existing) {
      // Update existing revoked certificate
      const { data: certificate, error } = await supabase
        .from('certificates')
        .update({
          final_score: scoreData.final_score,
          grade_breakdown: gradeBreakdown,
          status: 'awarded',
          issued_at: new Date().toISOString(),
          issued_by: issuedBy || null,
          revoked_at: null,
          revoked_by: null,
          revoke_reason: null
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating certificate:', error);
        return { success: false, error: 'Failed to update certificate' };
      }

      return { success: true, certificate };
    } else {
      // Create new certificate
      const { data: certificate, error } = await supabase
        .from('certificates')
        .insert({
          course_id: courseId,
          student_id: studentId,
          certificate_number: certNumber,
          final_score: scoreData.final_score,
          grade_breakdown: gradeBreakdown,
          status: 'awarded',
          issued_by: issuedBy || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating certificate:', error);
        return { success: false, error: 'Failed to create certificate' };
      }

      return { success: true, certificate };
    }
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
  revokedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        revoke_reason: reason
      })
      .eq('id', certificateId);

    if (error) {
      console.error('Error revoking certificate:', error);
      return { success: false, error: 'Failed to revoke certificate' };
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
      .eq('student_id', studentId)
      .single();

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
      .eq('student_id', studentId)
      .eq('status', 'awarded')
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
