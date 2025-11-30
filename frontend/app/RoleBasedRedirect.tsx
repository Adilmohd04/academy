'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function RoleBasedRedirect() {
  const router = useRouter();
  const { getToken, userId } = useAuth();

  useEffect(() => {
    async function redirectBasedOnRole() {
      if (!userId) return;

      try {
        const token = await getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const role = data.role;

          if (role === 'admin') {
            router.push('/admin');
          } else if (role === 'teacher') {
            router.push('/teacher');
          } else if (role === 'student') {
            router.push('/student');
          } else {
            // Default to dashboard if role is not set
            router.push('/dashboard');
          }
        } else {
          // If API fails, go to dashboard for role selection
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        router.push('/dashboard');
      }
    }

    redirectBasedOnRole();
  }, [userId, getToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="text-center">
        <div className="inline-flex items-center space-x-3 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Islamic Academy
          </h1>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Redirecting to your portal...</p>
        <p className="text-gray-500 text-sm mt-2">السلام عليكم</p>
      </div>
    </div>
  );
}
