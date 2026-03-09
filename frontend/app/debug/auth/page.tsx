'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DebugAuthPage() {
  const { userId, isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('student')

  const checkProfile = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/sync-role', { 
        method: 'GET',
        credentials: 'include' 
      })
      const data = await response.json()
      setProfile(data)
    } catch (error) {
      console.error('Error checking profile:', error)
    }
    setLoading(false)
  }

  const createProfileDirect = async () => {
    if (!userId || !user) return
    
    setLoading(true)
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      
      // Create profile directly in Supabase
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            clerk_user_id: userId,
            email: user.emailAddresses[0]?.emailAddress,
            full_name: user.fullName || user.emailAddresses[0]?.emailAddress,
            role: selectedRole
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Profile created successfully!\n\nRole: ${selectedRole}\nEmail: ${user.emailAddresses[0]?.emailAddress}`)
        setProfile({ success: true, profile: data[0] })
        
        // Redirect to appropriate dashboard after 2 seconds
        setTimeout(() => {
          if (selectedRole === 'admin') {
            router.push('/admin')
          } else if (selectedRole === 'teacher') {
            router.push('/teacher')
          } else {
            router.push('/student')
          }
        }, 2000)
      } else {
        const error = await response.text()
        alert('❌ Failed to create profile: ' + error)
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      alert('❌ Error: ' + error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      checkProfile()
    }
  }, [isLoaded, isSignedIn, userId])

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>
  }

  if (!isSignedIn) {
    return <div className="p-8">Please sign in first</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Debug & Profile Setup</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Clerk Session</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify({
              userId,
              isSignedIn,
              email: user?.emailAddresses[0]?.emailAddress,
              fullName: user?.fullName,
              publicMetadata: user?.publicMetadata,
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Supabase Profile</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={checkProfile}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Profile'}
            </button>
          </div>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm mb-4">
            {JSON.stringify(profile, null, 2)}
          </pre>

          {profile?.error === 'Profile not found' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ No Profile Found</h3>
              <p className="text-sm text-yellow-700 mb-4">
                Create your profile to access the portal:
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Role:
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded w-full"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                onClick={createProfileDirect}
                disabled={loading}
                className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 font-semibold"
              >
                {loading ? 'Creating...' : `Create Profile as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
