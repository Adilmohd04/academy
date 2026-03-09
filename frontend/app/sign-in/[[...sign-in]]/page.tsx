'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          {/* Simple Logo */}
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">ل</span>
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-2xl font-bold text-gray-800">Little Muslim Academy</h1>
              <p className="text-xs text-purple-600 font-medium">Islamic Learning Platform</p>
            </div>
          </div>
        </div>

        {/* Clerk Sign In Component */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <SignIn 
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "bg-white hover:bg-purple-50 border-gray-200 text-gray-700",
                formButtonPrimary: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg",
                formFieldInput: "border-gray-200 focus:border-purple-500 focus:ring-purple-500/20",
                footerActionLink: "text-purple-600 hover:text-purple-700"
              }
            }}
          />
        </div>

        {/* Footer Quote */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">"Seek knowledge from the cradle to the grave"</p>
        </div>
      </div>
    </div>
  );
}
