// app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <PrefetchRoutes>
        {children}
      </PrefetchRoutes>
    </ClerkProvider>
  );
}

function PrefetchRoutes({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Prefetch common routes for faster navigation
  useEffect(() => {
    router.prefetch('/student/dashboard');
    router.prefetch('/teacher/dashboard');
    router.prefetch('/sign-in');
    router.prefetch('/sign-up');
  }, [router]);

  return <>{children}</>;
}
