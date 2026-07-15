'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [isPasswordSubmitted, setIsPasswordSubmitted] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    router.replace('/sync');
  }, [isLoaded, isSignedIn, router]);

  // Monitor for sign-in timeout
  useEffect(() => {
    if (!isPasswordSubmitted) return;

    const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 8000); // Show timeout message after 8 seconds

    return () => clearTimeout(timeoutId);
  }, [isPasswordSubmitted]);

  // Monitor form for password submission
  useEffect(() => {
    const checkFormState = () => {
      // Check if a button with "Continue" or similar is being clicked
      const form = document.querySelector('[role="form"]') || document.querySelector('form');
      if (form) {
        const submitButton = form.querySelector('[type="submit"]');
        if (submitButton) {
          const handleClick = () => {
            setIsPasswordSubmitted(true);
            setLoadingTimeout(false);
          };
          submitButton.addEventListener('click', handleClick);
          return () => submitButton.removeEventListener('click', handleClick);
        }
      }
    };

    const timer = setTimeout(checkFormState, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show loading screen if password was submitted (even before isSignedIn updates)
  if (isLoaded && (isSignedIn || isPasswordSubmitted)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDFBF7] to-[#f6f2e8] px-6">
        <div className="w-full max-w-xl rounded-3xl border border-[#e7dfcc] bg-white/85 backdrop-blur-sm shadow-[0_30px_80px_rgba(27,54,93,0.15)] p-8 sm:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
              style={{ background: 'linear-gradient(135deg, #1B365D, #0f2240)' }}
            >
              م
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1B365D]">Signing you in</h2>
              <p className="text-sm text-slate-600 mt-1">Please wait while we prepare your workspace.</p>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1B365D] to-[#C5A059] animate-pulse" />
          </div>

          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-[#1B365D]" />
            <p className="text-sm font-medium text-slate-700">Setting up your account...</p>
          </div>

          {loadingTimeout && (
            <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50">
              <p className="text-sm text-amber-800 font-medium mb-2">⚠️ This is taking longer than expected</p>
              <p className="text-xs text-amber-700 mb-3">If you continue to see this message, try refreshing the page or clearing your browser cache.</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="mt-2 h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse">
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="mt-2 h-3 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B365D 0%, #0f2240 60%, #162d50 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C5A059' fill-opacity='1'%3E%3Cpath d='M40 0 L80 40 L40 80 L0 40Z' fill='none' stroke='%23C5A059' stroke-width='1'/%3E%3Cpath d='M40 10 L70 40 L40 70 L10 40Z' fill='none' stroke='%23C5A059' stroke-width='0.5'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }} />

        <div className="relative z-10">
          <BrandLogo href="/" className="text-white" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-3xl font-bold text-white leading-snug">
              مرحباً بكم في الأكاديمية الإسلامية...
            </p>
            <p className="mt-2 text-xl font-semibold" style={{ color: '#C5A059' }}>
              Welcome to Islamic Academy...
            </p>
            <p className="mt-4 text-blue-200 text-base leading-relaxed">
              Continue your path toward authentic Islamic knowledge. Your progress, courses, and community are waiting.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '📖', text: 'Structured weekly course content' },
              { icon: '🎯', text: 'Quizzes & assignments with instant grading' },
              { icon: '🕌', text: 'Live, hybrid & recorded Islamic classes' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-blue-100 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="border-l-2 pl-4" style={{ borderColor: '#C5A059' }}>
            <p className="text-blue-100 text-sm italic">"Seek knowledge from the cradle to the grave"</p>
            <p className="text-xs mt-1" style={{ color: '#C5A059' }}>— Prophet Muhammad ﷺ</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12" style={{ background: '#FDFBF7' }}>
        <div className="flex lg:hidden items-center gap-3 mb-8">
          <BrandLogo href="/" className="text-[#1B365D]" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-gray-500 mt-2 text-sm">
              Don't have an account?{' '}
              <Link href="/sign-up" className="font-semibold hover:underline" style={{ color: '#C5A059' }}>
                Create one free
              </Link>
            </p>
          </div>

          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/sync"
            fallbackRedirectUrl="/sync"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xl m-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                header: 'hidden',
                socialButtonsBlockButton:
                  'bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-all',
                socialButtonsBlockButtonText: 'font-medium',
                dividerLine: 'bg-slate-200',
                dividerText: 'text-slate-400 text-xs',
                formFieldLabel: 'text-sm font-medium text-slate-700',
                formFieldInput:
                  'rounded-xl border-slate-200 bg-white focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/10 text-slate-900 placeholder-slate-400',
                formButtonPrimary:
                  'rounded-xl font-semibold text-white shadow-md hover:opacity-90 transition-opacity',
                formButtonPrimaryText: 'font-semibold',
                formFieldAction: 'text-[#C5A059] hover:text-[#a8882f] font-medium',
                footerActionLink: 'font-semibold',
                identityPreviewEditButton: 'text-slate-500',
                formResendCodeLink: 'font-medium',
                alert: 'rounded-xl text-sm',
                footerAction: 'hidden',
              },
              variables: {
                colorPrimary: '#1B365D',
                colorTextOnPrimaryBackground: '#ffffff',
                colorBackground: '#ffffff',
                colorInputBackground: '#ffffff',
                colorInputText: '#1B365D',
                fontFamily: 'inherit',
                borderRadius: '0.75rem',
              },
            }}
          />

        </div>
      </div>
    </div>
  );
}
