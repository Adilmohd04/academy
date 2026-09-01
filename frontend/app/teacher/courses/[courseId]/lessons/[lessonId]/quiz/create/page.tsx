"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * The original quiz form targeted retired activity/question endpoints.
 * Redirect old bookmarks to the supported, authenticated course builder.
 */
export default function LegacyCreateQuizRedirect() {
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
    <main className="min-h-[60vh] flex items-center justify-center p-6 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
      <div className="text-center text-slate-600">
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-violet-600" />
        <p className="font-medium">Opening the course builder…</p>
      </div>
    </main>
  );
}
