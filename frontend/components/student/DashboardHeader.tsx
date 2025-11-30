'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface DashboardHeaderProps {
  user: {
    firstName: string | null
    lastName: string | null
    imageUrl: string
  }
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <div className="relative w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg ring-1 ring-black/5">
                <span className="text-2xl">🕌</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-purple-900">
                Islamic Academy
              </h1>
              <p className="text-xs font-medium text-gray-500">
                Welcome back, <span className="text-indigo-600">{user.firstName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/student/meetings/select-teacher"
              className="hidden md:flex group relative px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center space-x-2">
                <span>📅</span>
                <span>Book Session</span>
              </span>
            </Link>
            
            <div className="pl-4 border-l border-gray-200">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 ring-2 ring-white shadow-md hover:scale-105 transition-transform"
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
