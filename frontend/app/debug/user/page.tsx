'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function DebugUserPage() {
  const { userId, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [profileData, setProfileData] = useState<any>(null);
  const [clerkData, setClerkData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && userId) {
      loadUserData();
    }
  }, [isLoaded, userId]);

  const loadUserData = async () => {
    try {
      // Get Clerk user data
      setClerkData({
        userId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress,
        fullName: user?.fullName,
        firstName: user?.firstName,
        lastName: user?.lastName,
        role: user?.publicMetadata?.role,
        emailVerified: user?.primaryEmailAddress?.verification?.status,
        createdAt: user?.createdAt,
        lastSignInAt: user?.lastSignInAt,
      });

      // Get Supabase profile
      const token = await getToken();
      const response = await fetch('/api/ensure-profile', {
        method: 'POST',
      });
      const data = await response.json();
      setProfileData(data);

    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">🔍 User Debug Page</h1>
          <p className="text-red-600">Not logged in. Please sign in first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">🔍 User Debug Information</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {/* Clerk Data */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-blue-600">📋 Clerk Data</h2>
            <div className="bg-blue-50 rounded p-4 space-y-2 font-mono text-sm">
              <div><strong>User ID:</strong> {clerkData?.userId || 'N/A'}</div>
              <div><strong>Email:</strong> {clerkData?.email || 'N/A'}</div>
              <div><strong>Full Name:</strong> {clerkData?.fullName || 'N/A'}</div>
              <div><strong>First Name:</strong> {clerkData?.firstName || 'N/A'}</div>
              <div><strong>Last Name:</strong> {clerkData?.lastName || 'N/A'}</div>
              <div><strong>Role (Metadata):</strong> {clerkData?.role || 'Not Set'}</div>
              <div><strong>Email Verified:</strong> {clerkData?.emailVerified || 'N/A'}</div>
              <div><strong>Created:</strong> {clerkData?.createdAt ? new Date(clerkData.createdAt).toLocaleString() : 'N/A'}</div>
              <div><strong>Last Sign In:</strong> {clerkData?.lastSignInAt ? new Date(clerkData.lastSignInAt).toLocaleString() : 'Never'}</div>
            </div>
          </div>

          {/* Supabase Profile */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-green-600">🗄️ Supabase Profile</h2>
            <div className="bg-green-50 rounded p-4 space-y-2 font-mono text-sm">
              {profileData ? (
                <>
                  <div><strong>Success:</strong> {profileData.success ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Profile Exists:</strong> {profileData.profile ? '✅ Yes' : '❌ No'}</div>
                  {profileData.profile && (
                    <>
                      <div><strong>Profile ID:</strong> {profileData.profile.id}</div>
                      <div><strong>Clerk User ID:</strong> {profileData.profile.clerk_user_id}</div>
                      <div><strong>Email:</strong> {profileData.profile.email}</div>
                      <div><strong>Full Name:</strong> {profileData.profile.full_name}</div>
                      <div><strong>Role:</strong> {profileData.profile.role}</div>
                      <div><strong>Created:</strong> {new Date(profileData.profile.created_at).toLocaleString()}</div>
                      <div><strong>Updated:</strong> {new Date(profileData.profile.updated_at).toLocaleString()}</div>
                    </>
                  )}
                  {profileData.created && (
                    <div className="text-yellow-600"><strong>⚠️ Profile was just created!</strong></div>
                  )}
                </>
              ) : (
                <div>Loading...</div>
              )}
            </div>
          </div>

          {/* Raw JSON */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-600">📦 Raw Data (JSON)</h2>
            <details className="bg-gray-50 rounded p-4">
              <summary className="cursor-pointer font-semibold mb-2">Click to expand</summary>
              <pre className="text-xs overflow-auto max-h-96 bg-gray-800 text-green-400 p-4 rounded">
                {JSON.stringify({ clerk: clerkData, profile: profileData }, null, 2)}
              </pre>
            </details>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 Troubleshooting Tips:</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>If "Last Sign In" shows "Never", the user has never logged in</li>
              <li>Check if Clerk User ID matches Supabase clerk_user_id</li>
              <li>Check if role in Clerk metadata matches Supabase role</li>
              <li>If profile doesn't exist, it will be auto-created on next page load</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
