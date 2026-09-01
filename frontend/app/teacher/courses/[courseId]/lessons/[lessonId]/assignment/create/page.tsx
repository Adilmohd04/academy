"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * This legacy page used an activity API that is no longer part of the product.
 * Keep deep links safe by forwarding teachers to the supported builder instead
 * of presenting a form that cannot save.
 */
export default function LegacyCreateAssignmentRedirect() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  useEffect(() => {
    if (!courseId) return;

    const search = new URLSearchParams({ tab: "content" });
    if (lessonId) search.set("lessonId", lessonId);
    router.replace(`/teacher/courses/${courseId}/builder?${search.toString()}`);
  }, [courseId, lessonId, router]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="text-center text-slate-600">
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-emerald-600" />
        <p className="font-medium">Opening the course builder…</p>
      </div>
    </main>
  );
}
