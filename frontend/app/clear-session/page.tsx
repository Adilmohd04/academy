'use client'

import { useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function ClearSessionPage() {
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    const clearSession = async () => {
      try {
        // Clear Clerk session
        await signOut()
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
        
        // Clear localStorage
        localStorage.clear()
        
        // Clear sessionStorage
        sessionStorage.clear()
        
        console.log('✅ Session cleared successfully')
        
        // Wait a moment then redirect
        setTimeout(() => {
          router.push('/sign-in')
        }, 1000)
      } catch (error) {
        console.error('Error clearing session:', error)
      }
    }
    
    clearSession()
  }, [signOut, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          Clearing Session...
        </h1>
        <p className="text-gray-600">
          Please wait while we reset your authentication
        </p>
      </div>
    </div>
  )
}
