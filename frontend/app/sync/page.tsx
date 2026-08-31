'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * Compatibility route for older Clerk redirect URLs.
 * It must never become a second authentication workflow or wait on API calls.
 */
export default function SyncPage() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      window.location.replace('/sign-in');
      return;
    }

    // Profile/role sync is best-effort and must not block the authenticated user.
    void fetch('/api/ensure-profile', {
      method: 'POST',
      headers: { 'Cache-Control': 'no-cache' },
      keepalive: true,
    }).catch(() => undefined);
    void fetch('/api/sync-role', {
      method: 'POST',
      headers: { 'Cache-Control': 'no-cache' },
      keepalive: true,
    }).catch(() => undefined);

    window.location.replace('/dashboard');
  }, [isLoaded, isSignedIn]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FDFBF7] to-[#f4efe2] px-6">
      <section className="w-full max-w-2xl rounded-3xl border border-[#e9ddc3] bg-white/90 p-8 shadow-[0_32px_84px_rgba(27,54,93,0.14)] backdrop-blur-sm sm:p-10" aria-live="polite">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#C5A059]">Little Muslimah Academy</p>
            <h1 className="mt-2 text-2xl font-bold text-[#1B365D]">Opening your dashboard…</h1>
          </div>
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#1B365D]/20 border-t-[#1B365D]" />
        </div>
        <p className="mt-4 text-sm text-[#64748B]">Your sign-in is complete. Taking you to your workspace now.</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-gradient-to-r from-[#1B365D] via-[#2d6f83] to-[#C5A059]" /></div>
      </section>
    </main>
  );
}
