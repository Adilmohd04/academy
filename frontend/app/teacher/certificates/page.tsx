'use client';

import { Award, BookOpen, Download, Eye } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';

export default function TeacherCertificatesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-900 mb-2">Student Certificates</h1>
        <p className="text-slate-600">Issue and manage certificates for course completions</p>
      </div>

      <IslamicCard className="p-12 text-center">
        <Award className="w-20 h-20 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Certificate Management</h2>
        <p className="text-slate-600 max-w-md mx-auto mb-6">
          View and manage certificates for students who have completed your courses. 
          Certificates are automatically generated when students finish all course requirements.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Auto-generated</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Downloadable PDF</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Shareable</span>
          </div>
        </div>
      </IslamicCard>
    </div>
  );
}
