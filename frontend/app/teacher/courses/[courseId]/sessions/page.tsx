import { redirect } from 'next/navigation';

/**
 * Compatibility route for old course links. The former page called an
 * unmounted `/api/live-sessions` API; live classes now live in the secure
 * course scheduler and use the teacher's Clerk session.
 */
export default function LegacyCourseSessionsPage({ params }: { params: { courseId: string } }) {
  redirect(`/teacher/courses/${params.courseId}/live-classes`);
}
