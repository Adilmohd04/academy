'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function CourseCertificateDesignPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const courseId = params.courseId as string;

  useEffect(() => {
    router.replace(`/teacher/courses/${courseId}/builder?tab=certificateDesign`);
  }, [courseId, router]);

  return <div className="p-6 text-sm text-slate-600">Redirecting to the course builder certificate studio...</div>;
}
