'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Award, Download, Calendar, BookOpen, ChevronLeft, Trophy, Search, Printer, X } from 'lucide-react';

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
  pdf_url?: string;
  verification_code?: string;
  certificate_number?: string;
  status?: string;
  generated_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERIFICATION_CODE_REGEX = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/i;

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'revoked'>('all');
  const [printCertificate, setPrintCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Render the print-only layout first, then hand off to the browser dialog.
  useEffect(() => {
    if (!printCertificate) return;
    const clear = () => setPrintCertificate(null);
    window.addEventListener('afterprint', clear);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      window.removeEventListener('afterprint', clear);
      cancelAnimationFrame(frame);
    };
  }, [printCertificate]);

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

  const verificationUrlFor = (certificate: Certificate): string | null => {
    const rawCode = certificate.verification_code?.trim();
    if (!rawCode || UUID_REGEX.test(rawCode) || !VERIFICATION_CODE_REGEX.test(rawCode)) {
      return null;
    }

    const base =
      process.env.NEXT_PUBLIC_VERIFICATION_PORTAL_URL ||
      (typeof window !== 'undefined' ? `${window.location.origin}/verify` : '/verify');
    return `${base.replace(/\/$/, '')}/${rawCode.toUpperCase()}`;
  };

  const handleView = (certificate: Certificate) => {
    const pdfUrl = certificate.pdf_url;
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const verificationUrl = verificationUrlFor(certificate);
    if (verificationUrl) {
      // No stored PDF yet — open the public verification page as a fallback view.
      window.open(verificationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async (certificate: Certificate) => {
    const url = verificationUrlFor(certificate);
    if (!url) {
      return;
    }

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

  /**
   * The stored PDF is the official artifact, so print that when it exists —
   * its viewer carries its own print control. Cross-origin storage URLs cannot
   * be driven through a hidden iframe. Only fall back to printing a rendered
   * layout when no PDF has been generated yet.
   */
  const handlePrint = (certificate: Certificate) => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank', 'noopener,noreferrer');
      return;
    }
    setPrintCertificate(certificate);
  };

  const isRevoked = (certificate: Certificate) => certificate.status === 'revoked';

  const visibleCertificates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return certificates.filter((certificate) => {
      if (statusFilter === 'revoked' && !isRevoked(certificate)) return false;
      if (statusFilter === 'valid' && isRevoked(certificate)) return false;
      if (!query) return true;
      return [
        safeCourseTitle(certificate.course_title),
        certificate.student_name,
        safeTeacherName(certificate.teacher_name),
        certificate.certificate_number,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query));
    });
  }, [certificates, search, statusFilter]);

  const handleDownload = (certificate: Certificate) => {
    const pdfUrl = certificate.pdf_url;
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
    const verificationUrl = verificationUrlFor(certificate);
    const verificationLine = verificationUrl
      ? `Verify at: ${verificationUrl}`
      : 'Public verification link: not available yet';

    const content = `
CERTIFICATE OF COMPLETION

This certifies that

${certificate.student_name}

has successfully completed the course

${safeCourseTitle(certificate.course_title)}

Instructor: ${safeTeacherName(certificate.teacher_name)}
Completion Date: ${formatDate(certificate.completion_date)}

Certificate ID: ${certificate.certificate_number || 'Not assigned'}
${verificationLine}
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
      <div className="bg-white border-b border-slate-200 shadow-sm print:hidden">
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
      <div className="container mx-auto px-6 py-8 print:hidden">
        {/* Search + status filter */}
        {certificates.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by course, instructor, or certificate ID"
                aria-label="Search certificates"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2" role="group" aria-label="Filter by status">
              {(['all', 'valid', 'revoked'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  aria-pressed={statusFilter === value}
                  className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    statusFilter === value
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}

        {certificates.length > 0 && (
          <p className="mb-4 text-sm text-slate-500" aria-live="polite">
            Showing {visibleCertificates.length} of {certificates.length} certificate
            {certificates.length !== 1 ? 's' : ''}
          </p>
        )}

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
        ) : visibleCertificates.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <Search className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h3 className="mb-2 text-xl font-semibold text-slate-900">No matching certificates</h3>
            <p className="mb-6 text-slate-600">Try a different search term or status filter.</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="rounded-xl border border-amber-300 px-6 py-3 font-semibold text-amber-700 transition-colors hover:bg-amber-50"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCertificates.map((certificate) => (
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
                      {certificate.status === 'revoked' ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          ● Revoked
                        </span>
                      ) : !verificationUrlFor(certificate) ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          Verification link pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          ● Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleView(certificate)}
                      disabled={!certificate.pdf_url && !verificationUrlFor(certificate)}
                      title={
                        certificate.pdf_url || verificationUrlFor(certificate)
                          ? 'View certificate'
                          : 'A certificate file or public verification link is not available yet'
                      }
                      className="px-2 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
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
                      disabled={!verificationUrlFor(certificate)}
                      title={
                        verificationUrlFor(certificate)
                          ? 'Share public verification link'
                          : 'A public verification link is not available yet'
                      }
                      className="px-2 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                    >
                      <Award className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={() => handlePrint(certificate)}
                      title={
                        certificate.pdf_url
                          ? 'Open the certificate PDF to print it'
                          : 'Print this certificate'
                      }
                      className="px-2 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-xs text-slate-400">
                      {certificate.certificate_number
                        ? `Certificate ID: ${certificate.certificate_number}`
                        : 'Certificate number pending'}
                    </p>
                    {!verificationUrlFor(certificate) && (
                      <p className="mt-1 text-xs text-amber-700">
                        Public verification will be available after a verification code is issued.
                      </p>
                    )}
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

      {/*
        Printable fallback, used only when no PDF artifact exists yet. Hidden on
        screen; the surrounding page is print:hidden so this is all that reaches
        the page.
      */}
      {printCertificate && (
        <div className="hidden print:block p-12 text-center text-black">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Certificate of Completion
          </p>
          <p className="mt-10 text-base text-neutral-600">This certifies that</p>
          <p className="mt-3 text-4xl font-bold">{printCertificate.student_name}</p>
          <p className="mt-6 text-base text-neutral-600">has successfully completed</p>
          <p className="mt-3 text-2xl font-semibold">
            {safeCourseTitle(printCertificate.course_title)}
          </p>

          <div className="mx-auto mt-12 flex max-w-xl justify-between text-sm text-neutral-700">
            <div className="text-left">
              <p className="font-semibold">{safeTeacherName(printCertificate.teacher_name)}</p>
              <p className="text-neutral-500">Instructor</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatDate(printCertificate.completion_date)}</p>
              <p className="text-neutral-500">Completion date</p>
            </div>
          </div>

          <p className="mt-12 text-xs text-neutral-500">
            Certificate ID: {printCertificate.certificate_number || 'Not assigned'}
          </p>
          {verificationUrlFor(printCertificate) && (
            <p className="mt-1 text-xs text-neutral-500">
              Verify at {verificationUrlFor(printCertificate)}
            </p>
          )}
          {isRevoked(printCertificate) && (
            <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-red-600">
              This certificate has been revoked
            </p>
          )}
        </div>
      )}
    </div>
  );
}
