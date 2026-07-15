import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { supabase } from '../../../config/database';

interface CertificateData {
  id: string;
  student_name: string;
  course_title: string;
  teacher_name?: string;
  completion_date: string;
  verification_code: string;
  percentage: number;
  grade: string;
  total_marks: number;
}

export class CertificatePdfService {
  /**
   * Generate Islamic-styled certificate PDF
   */
  async generateCertificatePDF(certificateData: CertificateData): Promise<Buffer> {
    try {
      // Generate QR code data URL
      const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify/${certificateData.verification_code}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0A4D3C',
          light: '#FFFFFF'
        }
      });

      // Launch headless browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1754, height: 1240 }); // A4 landscape at 150 DPI

      // Generate HTML content
      const html = this.generateCertificateHTML(certificateData, qrCodeDataUrl);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const buffer = Buffer.from(await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
      }));

      await browser.close();

      return buffer;
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

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate of Completion</title>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cormorant+Garamond:wght@400;600;700&display=swap" rel="stylesheet">
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
            Certificate ID: ${data.id.substring(0, 8).toUpperCase()}
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
            
            <div class="student-name">${data.student_name}</div>
            
            <p class="course-text">has successfully completed the course</p>
            
            <div class="course-title">${data.course_title}</div>

            <div class="grade-section">
              <div class="grade-box">
                <div class="grade-label">Grade</div>
                <div class="grade-value">${data.grade}</div>
              </div>
              <div class="grade-box">
                <div class="grade-label">Score</div>
                <div class="grade-value">${data.percentage.toFixed(1)}%</div>
              </div>
              <div class="grade-box">
                <div class="grade-label">Marks</div>
                <div class="grade-value">${data.total_marks}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="qr-section">
              <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
              <div class="verification-text">Scan to verify</div>
              <div class="verification-code">${data.verification_code}</div>
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
                <span class="detail-label">Instructor:</span> ${data.teacher_name}
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
   * Upload PDF to storage and update certificate record
   */
  async uploadAndUpdateCertificate(certificateId: string, pdfBuffer: Buffer): Promise<string> {
    try {
      const fileName = `certificate_${certificateId}.pdf`;
      const filePath = `certificates/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('certificates')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      // Update certificate record
      await supabase
        .from('certificates')
        .update({ pdf_url: publicUrl })
        .eq('id', certificateId);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      throw new Error('Failed to upload certificate');
    }
  }
}
