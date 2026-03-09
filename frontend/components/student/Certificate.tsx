'use client';

import React from 'react';
import { Award, Download, ExternalLink, CheckCircle, XCircle, QrCode, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface Certificate {
  id: string;
  verification_code: string;
  course_title: string;
  student_name: string;
  teacher_name?: string;
  final_grade: number;
  grade_letter?: string;
  completion_date: string;
  qr_code_data?: string;
  status: 'active' | 'revoked' | 'expired';
  course_thumbnail?: string;
}

interface CertificateCardProps {
  certificate: Certificate;
  onView?: (id: string) => void;
  onDownload?: (id: string) => void;
}

interface CertificatePreviewProps {
  certificate: Certificate;
  onDownload?: () => void;
  onShare?: () => void;
}

interface CertificateVerificationProps {
  isLoading?: boolean;
  result?: {
    valid: boolean;
    status: 'valid' | 'invalid' | 'revoked' | 'expired';
    message: string;
    certificate?: {
      student_name: string;
      course_title: string;
      final_grade: number;
      completion_date: string;
      teacher_name?: string;
      verification_code: string;
    };
  };
  onVerify?: (code: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'valid':
      return 'text-green-600 bg-green-100';
    case 'revoked':
      return 'text-red-600 bg-red-100';
    case 'expired':
      return 'text-amber-600 bg-amber-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getGradeColor = (grade: number) => {
  if (grade >= 90) return 'text-emerald-600';
  if (grade >= 80) return 'text-blue-600';
  if (grade >= 70) return 'text-yellow-600';
  if (grade >= 60) return 'text-orange-600';
  return 'text-red-600';
};

export function CertificateCard({ certificate, onView, onDownload }: CertificateCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Certificate Preview Header */}
      <div className="relative h-32 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-4">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="white" />
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#pattern)" />
          </svg>
        </div>
        <Award className="absolute top-4 right-4 h-8 w-8 text-white/50" />
        <div className="absolute bottom-4 left-4 text-white">
          <p className="text-xs opacity-80">Certificate of Completion</p>
          <p className="font-semibold truncate max-w-[200px]">{certificate.course_title}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(certificate.status)}`}>
            {certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
          </span>
          <span className={`text-lg font-bold ${getGradeColor(certificate.final_grade)}`}>
            {certificate.final_grade}%
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span>{certificate.student_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{format(new Date(certificate.completion_date), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-gray-400" />
            <span className="font-mono text-xs">{certificate.verification_code}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => onView?.(certificate.id)}
            className="flex-1 px-3 py-2 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            View
          </button>
          <button
            onClick={() => onDownload?.(certificate.id)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

export function CertificatePreview({ certificate, onDownload, onShare }: CertificatePreviewProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-3xl mx-auto">
      {/* Certificate Design */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }} />
        </div>

        {/* Header */}
        <div className="relative text-center mb-8">
          <Award className="h-16 w-16 mx-auto mb-4 text-yellow-300" />
          <h1 className="text-3xl font-bold mb-2">Certificate of Completion</h1>
          <p className="text-emerald-100">This certifies that</p>
        </div>

        {/* Student Name */}
        <div className="relative text-center py-6 border-y border-white/20">
          <h2 className="text-4xl font-serif font-bold">{certificate.student_name}</h2>
        </div>

        {/* Course Info */}
        <div className="relative text-center mt-6 space-y-2">
          <p className="text-emerald-100">has successfully completed the course</p>
          <h3 className="text-2xl font-semibold">{certificate.course_title}</h3>
          <p className="text-emerald-100">
            with a final grade of <span className="font-bold text-yellow-300">{certificate.final_grade}%</span>
          </p>
        </div>

        {/* Footer */}
        <div className="relative mt-8 pt-6 border-t border-white/20 flex justify-between items-end">
          <div>
            <p className="text-sm text-emerald-100">Issued on</p>
            <p className="font-semibold">{format(new Date(certificate.completion_date), 'MMMM dd, yyyy')}</p>
          </div>
          {certificate.teacher_name && (
            <div className="text-center">
              <div className="w-32 border-b border-white/50 mb-1" />
              <p className="text-sm">{certificate.teacher_name}</p>
              <p className="text-xs text-emerald-100">Instructor</p>
            </div>
          )}
          <div className="text-right">
            {certificate.qr_code_data && (
              <div className="bg-white p-2 rounded-lg inline-block">
                <img src={certificate.qr_code_data} alt="QR Code" className="w-20 h-20" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Info */}
      <div className="bg-gray-50 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Verification Code</p>
          <p className="font-mono text-sm font-medium">{certificate.verification_code}</p>
        </div>
        <div className="flex gap-2">
          {onShare && (
            <button
              onClick={onShare}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Share
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CertificateVerification({ isLoading, result, onVerify }: CertificateVerificationProps) {
  const [code, setCode] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onVerify?.(code.trim());
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Verification Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="text-center mb-6">
          <QrCode className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-800">Verify Certificate</h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter the verification code to check certificate authenticity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full p-4 text-center text-lg font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase tracking-wider"
              maxLength={14}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify Certificate'}
          </button>
        </form>
      </div>

      {/* Verification Result */}
      {result && (
        <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
          result.valid ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="flex items-start gap-4">
            {result.valid ? (
              <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${
                result.valid ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.valid ? 'Certificate Verified' : 'Verification Failed'}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{result.message}</p>

              {result.certificate && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Student</span>
                    <span className="font-medium">{result.certificate.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Course</span>
                    <span className="font-medium">{result.certificate.course_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Grade</span>
                    <span className={`font-bold ${getGradeColor(result.certificate.final_grade)}`}>
                      {result.certificate.final_grade}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Completion Date</span>
                    <span className="font-medium">
                      {format(new Date(result.certificate.completion_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// My Certificates List
export function MyCertificates({
  certificates,
  onViewAction,
  onDownloadAction
}: {
  certificates: Certificate[];
  onViewAction?: (id: string) => void;
  onDownloadAction?: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Award className="h-6 w-6 text-emerald-600" />
        <h2 className="text-xl font-semibold text-gray-800">My Certificates</h2>
      </div>

      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <CertificateCard
              key={cert.id}
              certificate={cert}
              onView={onViewAction}
              onDownload={onDownloadAction}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Award className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800">No Certificates Yet</h3>
          <p className="text-gray-500 mt-1">
            Complete courses to earn certificates
          </p>
        </div>
      )}
    </div>
  );
}
