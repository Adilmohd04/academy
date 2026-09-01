import { redirect } from 'next/navigation';

interface EditCoursePageProps {
  params: {
    courseId: string;
  };
}

export default function EditCoursePage({ params }: EditCoursePageProps) {
  redirect(`/teacher/courses/${params.courseId}/builder?tab=content`);
}
