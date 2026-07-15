// app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRoleSync } from '@/hooks/useRoleSync';

function normalizeRedirectPath(input: string | undefined, fallback: string): string {
  if (!input) {
    return fallback;
  }

  if (input.startsWith('/')) {
    return input;
  }

  try {
    const url = new URL(input);
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const signInFallbackRedirectUrl = normalizeRedirectPath(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL, '/sync');
  const signUpFallbackRedirectUrl = normalizeRedirectPath(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL, '/sync');
  const signInForceRedirectUrl = normalizeRedirectPath(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL, '/sync');
  const signUpForceRedirectUrl = normalizeRedirectPath(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL, '/sync');

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInFallbackRedirectUrl={signInFallbackRedirectUrl}
      signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
      signInForceRedirectUrl={signInForceRedirectUrl}
      signUpForceRedirectUrl={signUpForceRedirectUrl}
    >
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
