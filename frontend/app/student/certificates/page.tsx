'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Award, Download, Calendar, BookOpen, ChevronLeft, Trophy } from 'lucide-react';

interface Certificate {
  id: string;
  enrollment_id: string;
  course_id: string;
  student_id: string;
  course_title: string;
  student_name: string;
  teacher_name: string;
  completion_date: string;
  certificate_url?: string;
  generated_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlaceholderValue(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (UUID_REGEX.test(normalized)) return true;
  return /^(unknown(\s+teacher|\s+instructor)?|n\/a|null|undefined)$/i.test(normalized);
}

function safeTeacherName(teacherName?: string): string {
  return isPlaceholderValue(teacherName) ? 'Instructor' : teacherName!.trim();
}

function safeCourseTitle(title?: string): string {
  return isPlaceholderValue(title) ? 'Course' : title!.trim();
}

export default function CertificatesPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/certificates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCertificates(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const verificationUrlFor = (certificate: Certificate): string => {
    const base =
      process.env.NEXT_PUBLIC_VERIFICATION_PORTAL_URL ||
      (typeof window !== 'undefined' ? `${window.location.origin}/verify` : '/verify');
    const code = (certificate as any).verification_code || certificate.id;
    return `${base}/${code}`;
  };

  const handleView = (certificate: Certificate) => {
    const pdfUrl = (certificate as any).pdf_url;
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } else {
      // No stored PDF yet — open the public verification page as a fallback view.
      window.open(verificationUrlFor(certificate), '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async (certificate: Certificate) => {
    const url = verificationUrlFor(certificate);
    const shareData = {
      title: `Certificate — ${safeCourseTitle(certificate.course_title)}`,
      text: `Verify my certificate for ${safeCourseTitle(certificate.course_title)}`,
      url,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share unsupported — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Verification link copied to clipboard.');
    } catch {
      // Last resort: prompt the URL so the user can copy manually.
      window.prompt('Copy this verification link:', url);
    }
  };

  const handleDownload = (certificate: Certificate) => {
    const pdfUrl = (certificate as any).pdf_url;
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = `certificate-${safeCourseTitle(certificate.course_title).replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Fallback: text certificate when no PDF has been rendered yet.
    const content = `
CERTIFICATE OF COMPLETION

This certifies that

${certificate.student_name}

has successfully completed the course

${safeCourseTitle(certificate.course_title)}

Instructor: ${safeTeacherName(certificate.teacher_name)}
Completion Date: ${formatDate(certificate.completion_date)}

Certificate ID: ${(certificate as any).certificate_number || certificate.id}
Verify at: ${verificationUrlFor(certificate)}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${safeCourseTitle(certificate.course_title).replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/student/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">My Certificates</h1>
              <p className="text-slate-600">Your achievements and completed courses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {certificates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <Trophy className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              No Certificates Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Complete a course to earn your first certificate!
            </p>
            <button
              onClick={() => router.push('/student/courses/browse')}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="bg-white rounded-xl shadow-lg border-2 border-amber-200 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Certificate Header */}
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-6 text-center">
                  <Award className="w-16 h-16 text-white mx-auto mb-3" />
                  <h3 className="text-white font-bold text-lg">Certificate of Completion</h3>
                </div>

                {/* Certificate Body */}
                <div className="p-6">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-bold text-slate-900 mb-2">
                      {safeCourseTitle(certificate.course_title)}
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Awarded to: <span className="font-semibold">{certificate.student_name}</span>
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>Instructor: {safeTeacherName(certificate.teacher_name)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>Completed: {formatDate(certificate.completion_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {(certificate as any).status === 'revoked' ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          ● Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          ● Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleView(certificate)}
                      className="px-2 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <BookOpen className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(certificate)}
                      className="px-2 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleShare(certificate)}
                      className="px-2 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Award className="w-4 h-4" />
                      Share
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-xs text-slate-400">
                      Certificate ID: {((certificate as any).certificate_number || certificate.id).toString().substring(0, 12)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Banner */}
        {certificates.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-lg p-8 text-white text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">
              {certificates.length} Certificate{certificates.length !== 1 ? 's' : ''} Earned!
            </h2>
            <p className="text-amber-100">
              Keep learning to unlock more achievements
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
