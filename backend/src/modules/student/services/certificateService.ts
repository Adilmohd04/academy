import { supabase } from '../../../config/database';

export interface Certificate {
  id: string;
  enrollment_id: string;
  course_id: string;
  student_id: string;
  course_title: string;
  student_name: string;
  teacher_name: string;
  completion_date: string;
  certificate_url?: string;
  issued_at: string;
}

type CertificateRow = Record<string, any>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The student-facing page needs friendly names, while the certificates table
 * deliberately stores only stable identifiers. Keep that enrichment here so
 * callers never have to guess from UUID/Clerk values or render placeholders.
 */
async function enrichCertificatesForStudent(
  certificates: CertificateRow[],
  clerkUserId: string,
): Promise<Certificate[]> {
  if (certificates.length === 0) return [];

  const courseIds = [...new Set(certificates.map((certificate) => certificate.course_id).filter(Boolean))];
  const { data: studentProfile } = await supabase
    .from('profiles')
    .select('id, clerk_user_id, full_name')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  const { data: courses, error: coursesError } = courseIds.length
    ? await supabase
      .from('courses')
      .select('id, title, teacher_id')
      .in('id', courseIds)
    : { data: [], error: null };

  if (coursesError) throw coursesError;

  const courseById = new Map((courses || []).map((course: any) => [course.id, course]));
  const teacherIdentifiers = [...new Set((courses || []).map((course: any) => course.teacher_id).filter(Boolean))];
  const teacherProfileIds = teacherIdentifiers.filter((id) => UUID_PATTERN.test(String(id)));

  const [teachersByClerkResult, teachersByIdResult] = await Promise.all([
    teacherIdentifiers.length
      ? supabase
        .from('profiles')
        .select('id, clerk_user_id, full_name')
        .in('clerk_user_id', teacherIdentifiers)
      : Promise.resolve({ data: [] as any[], error: null }),
    teacherProfileIds.length
      ? supabase
        .from('profiles')
        .select('id, clerk_user_id, full_name')
        .in('id', teacherProfileIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (teachersByClerkResult.error) throw teachersByClerkResult.error;
  if (teachersByIdResult.error) throw teachersByIdResult.error;

  const teacherNameByIdentifier = new Map<string, string>();
  for (const profile of [...(teachersByClerkResult.data || []), ...(teachersByIdResult.data || [])]) {
    if (!profile?.full_name) continue;
    if (profile.id) teacherNameByIdentifier.set(profile.id, profile.full_name);
    if (profile.clerk_user_id) teacherNameByIdentifier.set(profile.clerk_user_id, profile.full_name);
  }

  return certificates.map((certificate) => {
    const course = courseById.get(certificate.course_id);
    return {
      ...certificate,
      course_title: course?.title || certificate.course_name_cached || 'Course',
      student_name: certificate.student_name || studentProfile?.full_name || 'Student',
      teacher_name: teacherNameByIdentifier.get(course?.teacher_id) || 'Instructor',
      completion_date: certificate.completion_date || certificate.issued_at,
    } as Certificate;
  });
}

/**
 * Deliberately does not distinguish a missing enrollment from an enrollment
 * belonging to someone else. The student certificate endpoint must never
 * reveal or issue another student's certificate.
 */
export class EnrollmentCertificateAccessError extends Error {
  constructor() {
    super('Enrollment not found');
    this.name = 'EnrollmentCertificateAccessError';
  }
}

/**
 * Students can request an already-issued certificate, but they cannot mint
 * one themselves. Issuance is handled by the central eligibility lifecycle
 * after the final assessment and other requirements have been satisfied.
 */
export class CertificateNotAvailableError extends Error {
  constructor() {
    super('Certificate is not available yet');
    this.name = 'CertificateNotAvailableError';
  }
}

export const generateCertificate = async (
  enrollmentId: string,
  studentId: string
): Promise<Certificate> => {
  // Scope the enrollment lookup to the authenticated student. Do this in the
  // same database query that loads issuance data so an arbitrary enrollment ID
  // can never be used to generate a certificate for somebody else.
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      id,
      course_id,
      student_id,
      enrolled_at,
      progress_percentage,
      courses!inner(
        title,
        teacher_id
      )
    `)
    .eq('id', enrollmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    if (enrollmentError) {
      throw enrollmentError;
    }
    throw new EnrollmentCertificateAccessError();
  }

  if (enrollment.progress_percentage < 100) {
    throw new Error('Course not completed yet');
  }

  // This endpoint used to create a minimal legacy row here. That allowed a
  // student to bypass final-exam/eligibility gates and produced certificates
  // without a secure verification code or QR image. It is now intentionally a
  // read of the certificate issued by the canonical lifecycle instead.
  const { data: existingCert, error: existingError } = await supabase
    .from('certificates')
    .select('*')
    .eq('course_id', enrollment.course_id)
    .eq('student_id', studentId)
    .in('status', ['active', 'awarded', 'issued'])
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingCert) {
    return existingCert;
  }

  throw new CertificateNotAvailableError();
};

export const getStudentCertificates = async (
  studentId: string
): Promise<Certificate[]> => {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false });

  if (error) {
    throw error;
  }

  return enrichCertificatesForStudent((data || []) as CertificateRow[], studentId);
};

export const getCertificate = async (
  certificateId: string,
  studentId: string
): Promise<Certificate | null> => {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', certificateId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  const [certificate] = await enrichCertificatesForStudent([data as CertificateRow], studentId);
  return certificate || null;
};
