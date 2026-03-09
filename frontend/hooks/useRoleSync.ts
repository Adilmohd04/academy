'use client'

/**
 * Hook to automatically sync user role from Supabase to Clerk on page load
 * TEMPORARILY DISABLED - Causing auth issues
 * 
 * This ensures Clerk's publicMetadata is always up-to-date with database
 * Also auto-creates profile if it doesn't exist
 */
export function useRoleSync() {
  // Role sync disabled - users will get their role from middleware's Supabase query
  // The middleware already fetches role from Supabase on every request
  return { isLoading: false }
}
