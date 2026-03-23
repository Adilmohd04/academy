'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
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
              Start your Islamic<br />
              <span style={{ color: '#C5A059' }}>learning journey today</span>
            </p>
            <p className="mt-4 text-blue-200 text-base leading-relaxed">
              Join thousands of students gaining authentic Islamic knowledge through structured, engaging courses.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '🎓', text: 'Courses by qualified Islamic scholars' },
              { icon: '📅', text: 'Weekly content with auto-unlock scheduling' },
              { icon: '🏆', text: 'Earn certificates upon completion' },
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
            <p className="text-blue-100 text-sm italic">"And say: My Lord, increase me in knowledge"</p>
            <p className="text-xs mt-1" style={{ color: '#C5A059' }}>— Surah Ta-Ha 20:114</p>
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
            <h2 className="text-3xl font-bold" style={{ color: '#1B365D' }}>Create account</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-semibold hover:underline" style={{ color: '#C5A059' }}>
                Sign in
              </Link>
            </p>
          </div>

          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none bg-transparent p-0 gap-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                header: 'hidden',
                socialButtonsBlockButton:
                  'bg-white border border-gray-200 hover:border-gray-400 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-all',
                socialButtonsBlockButtonText: 'font-medium',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-gray-400 text-xs',
                formFieldLabel: 'text-sm font-medium text-gray-700',
                formFieldInput:
                  'rounded-xl border-gray-200 bg-white focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/10 text-gray-900 placeholder-gray-400',
                formButtonPrimary:
                  'rounded-xl font-semibold text-white shadow-lg hover:opacity-90 transition-opacity',
                footerActionLink: 'font-semibold',
                identityPreviewEditButton: 'text-gray-500',
                alert: 'rounded-xl text-sm',
                footerAction: 'hidden',
              },
              variables: {
                colorPrimary: '#1B365D',
                colorTextOnPrimaryBackground: '#ffffff',
                colorBackground: 'transparent',
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
