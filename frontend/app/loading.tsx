import { IslamicPageLoader } from '@/components/ui/IslamicPageLoader';

export default function RootLoading() {
  return (
    <IslamicPageLoader 
      message="Welcome to Islamic Academy..." 
      arabicMessage="مرحباً بكم في الأكاديمية الإسلامية..."
    />
  );
}
