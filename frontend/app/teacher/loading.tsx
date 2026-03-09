import { IslamicPageLoader } from '@/components/ui/IslamicPageLoader';

export default function TeacherLoading() {
  return (
    <IslamicPageLoader 
      message="Loading Teacher Portal..." 
      arabicMessage="جاري تحميل بوابة المعلم..."
    />
  );
}
