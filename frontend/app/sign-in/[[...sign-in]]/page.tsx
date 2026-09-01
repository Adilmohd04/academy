'use client';

import { useEffect, useState } from 'react';
import { SignIn, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  // Gate on mount, not on isLoaded alone: the server always renders with
  // isLoaded=false, so branching on it directly can disagree with the client's
  // first render and make React discard the subtree — which blanks the panel.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showForm = mounted && isLoaded;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void fetch('/api/ensure-profile', { method: 'POST', keepalive: true }).catch(() => undefined);
    void fetch('/api/sync-role', { method: 'POST', keepalive: true }).catch(() => undefined);
    router.replace('/dashboard');
  }, [isLoaded, isSignedIn, router]);

  // Do not replace Clerk's form before authentication succeeds. Clerk owns the
  // submit/error/loading state; replacing it early traps failed logins forever.
  if (mounted && isLoaded && isSignedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-6">
        <section className="w-full max-w-xl rounded-[2rem] border border-[#e7dfcc] bg-white/90 p-8 shadow-[0_30px_80px_rgba(27,54,93,0.14)] backdrop-blur-sm sm:p-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B365D] text-2xl font-bold text-white shadow-lg">م</div>
            <div>
              <h1 className="text-xl font-semibold text-[#1B365D]">Signing you in</h1>
              <p className="mt-1 text-sm text-slate-600">Preparing your personalized workspace.</p>
            </div>
          </div>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#1B365D] via-[#2d6f83] to-[#C5A059] animate-pulse" />
          </div>
          <div className="mt-5 flex items-center gap-3 text-sm font-medium text-slate-700">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1B365D]" />
            Verifying your account and loading your dashboard…
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#1B365D] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(197,160,89,.45),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(41,131,136,.55),transparent_32%)]" />
        <div className="relative"><BrandLogo href="/" className="text-white" /></div>
        <div className="relative max-w-lg">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#E7C981]">Welcome back</p>
          <h1 className="text-5xl font-semibold leading-[1.05]">Continue your path of purposeful learning.</h1>
          <p className="mt-6 text-lg leading-relaxed text-blue-100">Your courses, mentors, progress, and community are waiting in one calm workspace.</p>
        </div>
        <p className="relative border-l-2 border-[#C5A059] pl-4 text-sm italic text-blue-100">“My Lord, increase me in knowledge.”</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandLogo href="/" className="text-[#1B365D]" /></div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#C5A059]">Little Muslimah Academy</p>
          <h2 className="text-3xl font-semibold text-[#1B365D]">Sign in to your academy</h2>
          <p className="mt-2 text-sm text-slate-500">New here? <Link href="/sign-up" className="font-semibold text-[#1B365D] hover:text-[#C5A059]">Create a free account</Link></p>
          <div className="mt-8">
            {/*
              Clerk renders nothing until ClerkJS has mounted. On a step change
              such as /sign-in/factor-one the component remounts, and without a
              fallback the panel simply went blank with no indication that
              anything was happening. Mirror the card's shape so the form does
              not jump when it appears.
            */}
            {!showForm ? (
              <div
                aria-busy="true"
                aria-live="polite"
                className="w-full rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(27,54,93,0.10)] sm:p-7"
              >
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1B365D]" />
                  Loading secure sign-in…
                </div>
                <div className="mt-6 space-y-4" aria-hidden="true">
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-11 animate-pulse rounded-xl bg-[#1B365D]/10" />
                </div>
              </div>
            ) : (
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" fallbackRedirectUrl="/dashboard" appearance={{
              elements: {
                rootBox: 'w-full', card: 'm-0 w-full rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(27,54,93,0.10)] sm:p-7', header: 'hidden', headerTitle: 'hidden', headerSubtitle: 'hidden', formFieldLabel: 'text-sm font-medium text-slate-700', formFieldInput: 'rounded-xl border-slate-200 bg-white focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/10', formButtonPrimary: 'rounded-xl bg-[#1B365D] font-semibold shadow-md transition-transform duration-150 ease-out hover:bg-[#254a78] active:scale-[0.97]', socialButtonsBlockButton: 'rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50', formFieldAction: 'font-medium text-[#A47F2E]', alert: 'rounded-xl text-sm', footerAction: 'hidden'
              },
              variables: { colorPrimary: '#1B365D', colorBackground: '#ffffff', colorInputBackground: '#ffffff', colorInputText: '#1B365D', borderRadius: '0.75rem', fontFamily: 'inherit' }
            }} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
