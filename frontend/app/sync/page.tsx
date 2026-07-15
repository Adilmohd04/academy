'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function SyncPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState(false);
  const [stage, setStage] = useState(0);

  const stages = [
    'Authenticating your account',
    'Syncing role and permissions',
    'Preparing workspace context',
    'Routing to your dashboard'
  ];

  useEffect(() => {
    const stageInterval = window.setInterval(() => {
      setStage((current) => (current < stages.length - 1 ? current + 1 : current));
    }, 1000);

    return () => window.clearInterval(stageInterval);
  }, [stages.length]);

  useEffect(() => {
    // Only proceed once Clerk has fully loaded
    if (!isLoaded) return;

    // If we reach this point and user is not signed in after Clerk has loaded,
    // it means the session was lost. Redirect back to sign-in.
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }

    let isCancelled = false;

    const initializeWorkspace = async () => {
      try {
        setStage(1);

        // Call the sync-role endpoint to securely copy DB role to Clerk publicMetadata
        const res = await fetch('/api/sync-role', { method: 'POST' });
        if (!res.ok) throw new Error('Sync failed');

        setStage(2);

        // Force refresh the JWT token so middleware sees the newly updated publicMetadata
        await getToken({ skipCache: true });

        if (isCancelled) {
          return;
        }

        setStage(3);
        router.replace('/dashboard');
      } catch (err) {
        console.error('Error syncing role:', err);
        setError(true);

        if (isCancelled) {
          return;
        }

        setStage(3);
        // Fallback anyway
        router.replace('/dashboard');
      }
    };

    initializeWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDFBF7] to-[#f4efe2] px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-[#e9ddc3] bg-white/90 backdrop-blur-sm shadow-[0_32px_84px_rgba(27,54,93,0.14)] p-8 sm:p-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold text-[#1B365D]">Setting up your workspace...</h2>
          <div className="w-10 h-10 border-2 border-[#1B365D]/25 border-t-[#1B365D] rounded-full animate-spin" />
        </div>

        <p className="text-[#64748B] mb-5">Please wait while we authenticate your session and prepare your dashboard.</p>

        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1B365D] to-[#C5A059] transition-all duration-700"
            style={{ width: `${((stage + 1) / stages.length) * 100}%` }}
          />
        </div>

        <div className="space-y-3 mb-6">
          {stages.map((item, index) => (
            <div key={item} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${index <= stage ? 'bg-[#1B365D]' : 'bg-slate-300'}`} />
              <p className={`text-sm ${index <= stage ? 'text-[#1B365D] font-medium' : 'text-slate-500'}`}>{item}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="mt-2 h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-5">There was an issue syncing your profile. Redirecting...</p>
        )}
      </div>
    </div>
  );
}
