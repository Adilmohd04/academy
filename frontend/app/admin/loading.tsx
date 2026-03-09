import { IslamicPageLoader } from '@/components/ui/IslamicPageLoader';

export default function AdminLoading() {
  return (
    <IslamicPageLoader 
      message="Loading Admin Portal..." 
      arabicMessage="جاري تحميل بوابة الإدارة..."
    />
  );
}
