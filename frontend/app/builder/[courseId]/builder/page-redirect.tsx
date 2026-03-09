'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function RedirectToNewBuilder() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  useEffect(() => {
    // Redirect to new builder route
    router.replace(`/teacher/courses/${courseId}/builder`);
  }, [courseId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Redirecting to course builder...</p>
      </div>
    </div>
  );
}
