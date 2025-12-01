// app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRoleSync } from '@/hooks/useRoleSync';

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
  
  // Auto-sync user role from database to Clerk on every page load
  useRoleSync();

  // Prefetch common routes for faster navigation
  useEffect(() => {
    router.prefetch('/student');
    router.prefetch('/teacher');
    router.prefetch('/admin');
    router.prefetch('/sign-in');
    router.prefetch('/sign-up');
  }, [router]);

  return <>{children}</>;
}
