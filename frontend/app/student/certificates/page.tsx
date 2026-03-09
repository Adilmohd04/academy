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

  const handleDownload = (certificate: Certificate) => {
    // For now, generate a simple text-based certificate
    // In production, this would generate a PDF
    const content = `
CERTIFICATE OF COMPLETION

This certifies that

${certificate.student_name}

has successfully completed the course

${certificate.course_title}

Instructor: ${certificate.teacher_name}
Completion Date: ${formatDate(certificate.completion_date)}

Certificate ID: ${certificate.id}
Generated: ${formatDate(certificate.generated_at)}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${certificate.course_title.replace(/\s+/g, '-')}.txt`;
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
                      {certificate.course_title}
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Awarded to: <span className="font-semibold">{certificate.student_name}</span>
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>Instructor: {certificate.teacher_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>Completed: {formatDate(certificate.completion_date)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleDownload(certificate)}
                      className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Certificate
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-xs text-slate-400">
                      Certificate ID: {certificate.id.substring(0, 8)}...
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
