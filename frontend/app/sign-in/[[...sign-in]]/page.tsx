'use client';

import { SignIn } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoaded && userId) {
      setIsRedirecting(true);
      router.replace('/dashboard');
    }
  }, [isLoaded, userId, router]);

  if (isRedirecting || (isLoaded && !!userId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #1B365D, #0f2240)' }}>
            م
          </div>
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#1B365D] mx-auto mb-3" />
          <p className="text-sm text-slate-600">Signing you in...</p>
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
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #C5A059, #a8882f)' }}
            >
              <span className="text-white font-bold text-2xl" style={{ fontFamily: 'serif' }}>م</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">Little Muslimah Academy</h1>
              <p className="text-xs font-medium" style={{ color: '#C5A059' }}>Islamic Learning Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-3xl font-bold text-white leading-snug">
              Welcome back to your<br />
              <span style={{ color: '#C5A059' }}>learning journey</span>
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
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1B365D, #0f2240)' }}
          >
            <span className="text-white font-bold text-xl" style={{ fontFamily: 'serif' }}>م</span>
          </div>
          <div>
            <h1 className="font-bold text-lg" style={{ color: '#1B365D' }}>Little Muslimah Academy</h1>
            <p className="text-xs" style={{ color: '#C5A059' }}>Islamic Learning Platform</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold" style={{ color: '#1B365D' }}>Sign in</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Don't have an account?{' '}
              <Link href="/sign-up" className="font-semibold hover:underline" style={{ color: '#C5A059' }}>
                Create one free
              </Link>
            </p>
          </div>

          <SignIn
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm m-0',
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
