import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { supabase } from '../../../config/database';
import { verificationUrlForCode } from './verificationCode';

export interface CertificateData {
  id: string;
  /** Public, printed certificate identifier. Never show the database UUID. */
  certificate_number?: string;
  student_name: string;
  course_title: string;
  teacher_name?: string;
  completion_date: string;
  verification_code: string;
  percentage: number;
  grade: string;
  total_marks: number;
}

const CERTIFICATE_BUCKET = 'certificates';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function finiteNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function gradeForScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

/**
 * QR codes are rotated on verification regeneration, so the storage object is
 * namespaced by both certificate id and verification code.  This prevents a
 * CDN-cached PDF from being mistaken for the current QR-bearing artifact.
 */
export function certificatePdfStoragePath(certificateId: string, verificationCode: string): string {
  if (!isUuid(certificateId)) {
    throw new Error('A certificate PDF requires a UUID certificate id');
  }

  // `verificationUrlForCode` validates the public code format before a PDF is
  // rendered. Keep the storage segment conservative as an additional guard.
  const safeCode = verificationCode.replace(/[^A-Za-z0-9-]/g, '');
  if (!safeCode) {
    throw new Error('A certificate PDF requires a verification code');
  }

  return `issued/${certificateId}/certificate-${safeCode}.pdf`;
}

export class CertificatePdfService {
  /**
   * Generate Islamic-styled certificate PDF
   */
  async generateCertificatePDF(certificateData: CertificateData): Promise<Buffer> {
    try {
      // Generate QR code data URL
      const verificationUrl = verificationUrlForCode(certificateData.verification_code);
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0A4D3C',
          light: '#FFFFFF'
        }
      });

      // Launch headless browser. Keep the browser lifetime in a finally block
      // so a failed render never leaves a Chromium process behind.
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1754, height: 1240 }); // A4 landscape at 150 DPI

        // Generate HTML content. The document is self-contained, so waiting
        // for remote network activity would only make issuance fragile.
        const html = this.generateCertificateHTML(certificateData, qrCodeDataUrl);
        await page.setContent(html, { waitUntil: 'domcontentloaded' });

        // Generate PDF
        return Buffer.from(await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
          preferCSSPageSize: true,
        }));
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      throw new Error('Failed to generate certificate PDF');
    }
  }

  /**
   * Generate HTML for Islamic certificate
   */
  private generateCertificateHTML(data: CertificateData, qrCodeDataUrl: string): string {
    const gradeColor = 
      data.grade === 'A' ? '#059669' :
      data.grade === 'B' ? '#0891B2' :
      data.grade === 'C' ? '#F59E0B' : '#DC2626';

    const completionDate = new Date(data.completion_date);
    const formattedDate = completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const safe = {
      certificateNumber: escapeHtml(data.certificate_number || data.verification_code),
      studentName: escapeHtml(data.student_name),
      courseTitle: escapeHtml(data.course_title),
      grade: escapeHtml(data.grade),
      verificationCode: escapeHtml(data.verification_code),
      teacherName: escapeHtml(data.teacher_name),
      percentage: finiteNumber(data.percentage).toFixed(1),
      totalMarks: escapeHtml(finiteNumber(data.total_marks)),
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate of Completion</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Cormorant Garamond', serif;
            background: linear-gradient(135deg, #FFF8E7 0%, #FEFCF5 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 40px;
          }

          .certificate {
            width: 100%;
            max-width: 1400px;
            background: #FFFFFF;
            border: 15px solid #D4AF37;
            border-radius: 10px;
            padding: 60px 80px;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          }

          .certificate::before {
            content: '';
            position: absolute;
            top: 30px;
            left: 30px;
            right: 30px;
            bottom: 30px;
            border: 3px solid #D4AF37;
            pointer-events: none;
          }

          .islamic-pattern {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.03;
            background-image: 
              repeating-linear-gradient(45deg, #0A4D3C 0px, #0A4D3C 2px, transparent 2px, transparent 10px),
              repeating-linear-gradient(-45deg, #0A4D3C 0px, #0A4D3C 2px, transparent 2px, transparent 10px);
            pointer-events: none;
          }

          .certificate-id {
            position: absolute;
            top: 50px;
            right: 80px;
            font-size: 14px;
            color: #666;
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
          }

          .bismillah {
            font-family: 'Amiri', serif;
            font-size: 36px;
            color: #0A4D3C;
            margin-bottom: 20px;
            font-weight: bold;
          }

          .academy-name {
            font-size: 28px;
            color: #0A4D3C;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 10px;
          }

          .mosque-icon {
            font-size: 48px;
            color: #D4AF37;
            margin: 20px 0;
          }

          .title {
            font-size: 48px;
            color: #0A4D3C;
            font-weight: 700;
            margin: 30px 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            text-align: center;
          }

          .content {
            text-align: center;
            position: relative;
            z-index: 1;
            margin: 40px 0;
          }

          .intro-text {
            font-size: 22px;
            color: #333;
            margin-bottom: 25px;
            font-style: italic;
          }

          .student-name {
            font-size: 56px;
            color: #0A4D3C;
            font-weight: 700;
            margin: 30px 0;
            text-decoration: underline;
            text-decoration-color: #D4AF37;
            text-decoration-thickness: 3px;
            text-underline-offset: 8px;
          }

          .course-text {
            font-size: 22px;
            color: #333;
            margin: 25px 0;
          }

          .course-title {
            font-size: 40px;
            color: #059669;
            font-weight: 700;
            margin: 20px 0;
            font-style: italic;
          }

          .grade-section {
            display: flex;
            justify-content: center;
            gap: 60px;
            margin: 40px 0;
          }

          .grade-box {
            text-align: center;
            padding: 20px 40px;
            border-radius: 10px;
            background: linear-gradient(135deg, #F0FDF4 0%, #E8FAF0 100%);
            border: 3px solid ${gradeColor};
          }

          .grade-label {
            font-size: 18px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .grade-value {
            font-size: 48px;
            color: ${gradeColor};
            font-weight: 700;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 60px;
            position: relative;
            z-index: 1;
          }

          .qr-section {
            text-align: center;
          }

          .qr-code {
            width: 150px;
            height: 150px;
            border: 5px solid #D4AF37;
            border-radius: 10px;
            padding: 10px;
            background: white;
          }

          .verification-text {
            font-size: 14px;
            color: #666;
            margin-top: 10px;
          }

          .verification-code {
            font-family: 'Courier New', monospace;
            font-size: 16px;
            color: #0A4D3C;
            font-weight: bold;
            margin-top: 5px;
            letter-spacing: 2px;
          }

          .details-section {
            flex: 1;
            text-align: center;
          }

          .detail-line {
            font-size: 18px;
            color: #333;
            margin: 8px 0;
          }

          .detail-label {
            font-weight: 600;
            color: #0A4D3C;
          }

          .signature-section {
            text-align: center;
          }

          .signature-line {
            width: 250px;
            height: 2px;
            background: #333;
            margin: 0 auto 10px;
          }

          .signature-title {
            font-size: 16px;
            color: #0A4D3C;
            font-weight: 600;
          }

          .signature-name {
            font-size: 18px;
            color: #666;
            margin-top: 5px;
          }

          .ornament {
            color: #D4AF37;
            font-size: 24px;
            margin: 0 15px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="islamic-pattern"></div>
          
          <div class="certificate-id">
            Certificate ID: ${safe.certificateNumber}
          </div>

          <div class="header">
            <div class="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
            <div class="academy-name">🕌 Little Muslim Academy</div>
            <div class="mosque-icon">☪</div>
          </div>

          <h1 class="title">
            <span class="ornament">❖</span>
            Certificate of Completion
            <span class="ornament">❖</span>
          </h1>

          <div class="content">
            <p class="intro-text">This is to certify that</p>
            
            <div class="student-name">${safe.studentName}</div>
            
            <p class="course-text">has successfully completed the course</p>
            
            <div class="course-title">${safe.courseTitle}</div>

            <div class="grade-section">
              <div class="grade-box">
                <div class="grade-label">Grade</div>
                <div class="grade-value">${safe.grade}</div>
              </div>
              <div class="grade-box">
                <div class="grade-label">Score</div>
                <div class="grade-value">${safe.percentage}%</div>
              </div>
              <div class="grade-box">
                <div class="grade-label">Marks</div>
                <div class="grade-value">${safe.totalMarks}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="qr-section">
              <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
              <div class="verification-text">Scan to verify</div>
              <div class="verification-code">${safe.verificationCode}</div>
            </div>

            <div class="details-section">
              <div class="detail-line">
                <span class="detail-label">Completion Date:</span> ${formattedDate}
              </div>
              <div class="detail-line">
                <span class="detail-label">Issued On:</span> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              ${data.teacher_name ? `
              <div class="detail-line">
                <span class="detail-label">Instructor:</span> ${safe.teacherName}
              </div>
              ` : ''}
            </div>

            <div class="signature-section">
              <div class="signature-line"></div>
              <div class="signature-title">Authorized Signature</div>
              <div class="signature-name">Academy Director</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Upload a QR-bearing PDF to storage and update its certificate row.
   *
   * A verification-code-specific object path is intentional: when an admin
   * rotates the code, the next PDF receives a new URL rather than relying on
   * cache invalidation for an overwritten public object.
   */
  async uploadAndUpdateCertificate(
    certificateId: string,
    verificationCode: string,
    pdfBuffer: Buffer,
  ): Promise<string> {
    try {
      const filePath = certificatePdfStoragePath(certificateId, verificationCode);

      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from(CERTIFICATE_BUCKET)
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '0',
          // Same immutable code path may be rendered again after a transient
          // database/storage failure; overwriting that exact artifact is safe.
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(CERTIFICATE_BUCKET)
        .getPublicUrl(filePath);

      // Update certificate record
      const { error: updateError } = await supabase
        .from('certificates')
        .update({ pdf_url: publicUrl })
        .eq('id', certificateId);

      if (updateError) {
        // Do not leave an orphaned public artifact if its owning certificate
        // cannot be updated to point at it.
        await supabase.storage.from(CERTIFICATE_BUCKET).remove([filePath]);
        throw updateError;
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      throw new Error('Failed to upload certificate');
    }
  }
}

/**
 * Render and persist the QR-bearing PDF artifact for an already-issued
 * certificate.
 *
 * This is deliberately post-insert: a browser/storage failure must not roll
 * back or make an otherwise valid, QR-backed credential disappear. Callers
 * receive the certificate regardless, while a successful render fills
 * `pdf_url` before the API response is returned. The immutable designer
 * snapshot remains stored on the certificate; this existing server renderer
 * is a safe archival fallback until the shared designer renderer is packaged
 * for backend execution.
 */
export async function renderAndStoreCertificatePdf(certificateId: string): Promise<string> {
  const { data: certificate, error: certificateError } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', certificateId)
    .maybeSingle();

  if (certificateError || !certificate) {
    throw new Error('Certificate not found while rendering PDF');
  }

  const verificationCode = String(certificate.verification_code || '').trim().toUpperCase();
  // This performs the authoritative format check before we create a public
  // storage object whose filename includes the code.
  verificationUrlForCode(verificationCode);

  let studentName = String(certificate.student_name || '').trim();
  let courseTitle = String(certificate.course_name_cached || '').trim();
  let teacherIdentifier: string | null = null;

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('title, teacher_id')
    .eq('id', certificate.course_id)
    .maybeSingle();

  if (courseError) {
    console.warn('[certificate-pdf] unable to look up course while rendering:', courseError);
  } else if (course) {
    courseTitle = courseTitle || String(course.title || '').trim();
    teacherIdentifier = course.teacher_id ? String(course.teacher_id) : null;
  }

  if (!studentName && certificate.student_id) {
    const studentId = String(certificate.student_id);
    const profileQueries = [
      supabase.from('profiles').select('full_name').eq('clerk_user_id', studentId).maybeSingle(),
    ];
    if (isUuid(studentId)) {
      profileQueries.push(
        supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle(),
      );
    }
    const profiles = await Promise.all(profileQueries);
    studentName = profiles.map((result: any) => result.data?.full_name).find(Boolean) || '';
  }

  let teacherName = '';
  if (teacherIdentifier) {
    const teacherQueries = [
      supabase.from('profiles').select('full_name').eq('clerk_user_id', teacherIdentifier).maybeSingle(),
    ];
    if (isUuid(teacherIdentifier)) {
      teacherQueries.push(
        supabase.from('profiles').select('full_name').eq('id', teacherIdentifier).maybeSingle(),
      );
    }
    const teachers = await Promise.all(teacherQueries);
    teacherName = teachers.map((result: any) => result.data?.full_name).find(Boolean) || '';
  }

  const score = finiteNumber(certificate.percentage ?? certificate.final_score);
  const gradeCandidate = String(certificate.final_grade ?? certificate.grade ?? '').trim().toUpperCase();
  const grade = /^[A-F][+-]?$/.test(gradeCandidate) ? gradeCandidate : gradeForScore(score);
  const completionDate = String(certificate.completion_date || certificate.issued_at || new Date().toISOString());
  const totalMarks = finiteNumber(certificate.total_marks, Math.round(score));

  const service = new CertificatePdfService();
  const pdfBuffer = await service.generateCertificatePDF({
    id: certificate.id,
    certificate_number: certificate.certificate_number || undefined,
    student_name: studentName || 'Student',
    course_title: courseTitle || 'Course',
    teacher_name: teacherName || 'Academy Instructor',
    completion_date: completionDate,
    verification_code: verificationCode,
    percentage: score,
    grade,
    total_marks: totalMarks,
  });

  return service.uploadAndUpdateCertificate(certificate.id, verificationCode, pdfBuffer);
}

/**
 * Delete both the current QR-specific artifact and the legacy fixed-path
 * object. Deletion is best-effort: the verification code itself remains the
 * source of truth, and a storage outage must not make revocation/rotation fail.
 */
export async function removeCertificatePdfArtifacts(
  certificateId: string,
  verificationCode?: string | null,
): Promise<void> {
  if (!isUuid(certificateId)) return;

  const paths = [`certificates/certificate_${certificateId}.pdf`];
  if (verificationCode) {
    try {
      paths.push(certificatePdfStoragePath(certificateId, verificationCode));
    } catch {
      // An old or malformed legacy code can never have been written by the
      // QR-specific path. Still remove the historical fixed path above.
    }
  }

  const { error } = await supabase.storage.from(CERTIFICATE_BUCKET).remove(paths);
  if (error) {
    console.warn('[certificate-pdf] could not remove superseded PDF artifact:', error);
  }
}
