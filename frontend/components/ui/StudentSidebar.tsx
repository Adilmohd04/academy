'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  User, 
  ChevronLeft, 
  ChevronRight,
  PlusCircle,
  CalendarPlus,
  LogOut,
  Bell,
  Search,
  Award
} from 'lucide-react';
import { useClerk, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'My Garden', href: '/student', icon: LayoutDashboard },
  { label: 'My Schedule', href: '/student/meetings', icon: Calendar },
  { label: 'Browse Courses', href: '/student/courses/browse', icon: Search },
  { label: 'My Courses', href: '/student/courses', icon: BookOpen },
  { label: 'Library', href: '/student/library', icon: BookOpen },
  { label: 'Certificates', href: '/student/certificates', icon: Award },
  { label: 'Announcements', href: '/student/announcements', icon: Bell },
  { label: 'Profile', href: '/student/profile', icon: User },
];

export const StudentSidebar = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <motion.div 
      initial={{ width: 260 }}
      animate={{ width: collapsed ? 80 : 260 }}
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-[#D1E7DD] z-50",
        "bg-[#F0F7F4] text-[#1e1b4b] relative overflow-visible shadow-xl"
      )}
    >
      {/* Islamic Pattern Overlay - Subtle */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e1b4b' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <div className="p-6 flex items-center justify-between relative z-10 border-b border-[#D1E7DD]">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              {/* Logo Placeholder */}
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#10B981] font-bold shadow-sm border border-[#D1E7DD]">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-serif text-lg text-[#1e1b4b] tracking-wide font-bold leading-none">Little Muslim</h1>
                <span className="text-[10px] text-[#64748B] uppercase tracking-[0.2em] mt-1">Academy</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#94A3B8] hover:text-[#10B981] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-6 flex flex-col gap-2 relative z-10 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="block group">
              <div className={cn(
                "flex items-center gap-4 transition-all duration-300 px-4 py-3.5 rounded-xl mx-1",
                collapsed ? "justify-center" : "",
                isActive 
                  ? "bg-white text-[#1e1b4b] border border-[#D1E7DD] shadow-sm font-bold" 
                  : "text-[#64748B] hover:bg-white/50 hover:text-[#1e1b4b]"
              )}>
                <item.icon className={cn(
                  "w-6 h-6 flex-shrink-0",
                  isActive ? "text-[#10B981]" : "text-[#94A3B8] group-hover:text-[#10B981]"
                )} strokeWidth={isActive ? 2 : 1.5} />
                
                {!collapsed && (
                  <span className="text-sm tracking-wide">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Spacer to push Book Session to bottom */}
        <div className="flex-1" />

        {/* Book Session */}
        <div className="px-1 mb-2">
          <Link href="/student/meetings/select-teacher" className="block group">
            <div className={cn(
              "flex items-center gap-4 transition-all duration-300 px-4 py-3.5 rounded-xl mx-1",
              collapsed 
                ? "justify-center bg-transparent text-[#10B981] hover:bg-[#10B981]/10" 
                : "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/10"
            )}>
              <CalendarPlus className={cn(
                "w-6 h-6 flex-shrink-0", 
                collapsed ? "text-[#10B981]" : "text-white"
              )} strokeWidth={2} />
              {!collapsed && (
                <span className="text-sm font-bold tracking-wide">Book Session</span>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Footer - User Profile with Hover Menu */}
      <div 
        className="p-4 border-t border-[#D1E7DD] bg-[#F0F7F4] relative z-20"
        onMouseEnter={() => setShowProfileMenu(true)}
        onMouseLeave={() => setShowProfileMenu(false)}
      >
        {/* Dropdown Menu */}
        <AnimatePresence>
          {showProfileMenu && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-[#D1E7DD] rounded-xl shadow-xl overflow-hidden"
            >
              <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 text-[#64748B] hover:text-[#1e1b4b] hover:bg-[#F0F7F4] transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer hover:bg-white/50",
          collapsed ? "justify-center" : ""
        )}>
          <div className="relative flex-shrink-0">
            <img 
              src={user?.imageUrl} 
              alt={user?.fullName || "Profile"} 
              className="w-10 h-10 rounded-full border-2 border-[#10B981] object-cover"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#F0F7F4] rounded-full"></div>
          </div>
          
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold text-[#1e1b4b] truncate font-serif">
                {user?.fullName || 'Student'}
              </p>
              <p className="text-[10px] text-[#64748B] truncate">
                {user?.primaryEmailAddress?.emailAddress || ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
