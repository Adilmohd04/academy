import { IslamicPageLoader } from '@/components/ui/IslamicPageLoader';

export default function StudentLoading() {
  return (
    <IslamicPageLoader 
      message="Loading Student Portal..." 
      arabicMessage="جاري تحميل بوابة الطالب..."
    />
  );
}
