'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

/**
 * Hook to automatically sync user role from Supabase to Clerk on page load
 * This ensures Clerk's publicMetadata is always up-to-date with database
 * Also auto-creates profile if it doesn't exist
 */
export function useRoleSync() {
  const { userId, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded && userId) {
      // First ensure profile exists in database
      fetch('/api/ensure-profile', {
        method: 'POST',
      })
        .then((res) => res.json())
        .then((profileData) => {
          if (profileData.success || profileData.profile) {
            console.log('✅ Profile exists:', profileData.profile?.role)
            
            // Then sync role from Supabase to Clerk
            return fetch('/api/sync-role', {
              method: 'POST',
            })
          } else {
            console.error('❌ Failed to ensure profile exists')
            return Promise.reject('Profile creation failed')
          }
        })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log('✅ Role synced:', data.role)
          }
        })
        .catch((error) => {
          console.error('Failed to sync role:', error)
        })
    }
  }, [isLoaded, userId])
}
