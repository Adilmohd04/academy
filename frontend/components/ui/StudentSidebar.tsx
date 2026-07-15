'use client';

import React, { useEffect } from 'react';
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
  Award,
  Bookmark
} from 'lucide-react';
import { useClerk, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useCollapsedState } from '@/contexts/CollapsedStateContext';

const navItems = [
  { label: 'My Garden', href: '/student', icon: LayoutDashboard },
  { label: 'My Schedule', href: '/student/meetings', icon: Calendar },
  { label: 'Browse Courses', href: '/student/courses/browse', icon: Search },
  { label: 'My Courses', href: '/student/courses', icon: BookOpen },
  { label: 'Library', href: '/student/library', icon: Bookmark },
  { label: 'Certificates', href: '/student/certificates', icon: Award },
  { label: 'Announcements', href: '/student/announcements', icon: Bell },
  { label: 'Profile', href: '/student/profile', icon: User },
];

export const StudentSidebar = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { collapsed, setCollapsed } = useCollapsedState();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  return (
    <motion.div 
      initial={{ width: 260 }}
      animate={{ width: collapsed ? 95 : 260 }}
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
              <BrandLogo href="/student" className="text-[#1e1b4b]" />
            </motion.div>
          )}
          {collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center"
            >
              <BrandLogo href="/student" compact showText={false} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 text-[#94A3B8] hover:text-[#10B981] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 pt-3 pb-2 flex-1 flex flex-col gap-2 relative z-10 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="block group relative z-20 pointer-events-auto">
              <div className={cn(
                "flex items-center gap-4 transition-all duration-300 px-4 py-3.5 rounded-xl mx-1 cursor-pointer",
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
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="relative">
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-[#1e1b4b]"></div>
                    <div className="px-3 py-2.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-white whitespace-nowrap shadow-lg border border-white/20 backdrop-blur-sm">
                      {item.label}
                    </div>
                  </div>
                </div>
              )}
            </Link>
          );
        })}

        {/* Book Session */}
        <div className="px-1 mt-1">
          <Link href="/student/meetings/select-teacher" className="block group relative z-20 pointer-events-auto">
            <div className={cn(
              "flex items-center gap-4 transition-all duration-300 px-4 py-3.5 rounded-xl mx-1 cursor-pointer",
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
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="relative">
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-[#1e1b4b]"></div>
                  <div className="px-3 py-2.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-white whitespace-nowrap shadow-lg border border-white/20 backdrop-blur-sm">
                    Book Session
                  </div>
                </div>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Footer - User Profile with Hover Menu */}
      <div 
        className="mt-auto px-4 pt-2 pb-3 bg-[#F0F7F4] relative z-20"
        onMouseEnter={() => setShowProfileMenu(true)}
        onMouseLeave={() => setShowProfileMenu(false)}
      >
        {/* Simple Line Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#10B981]/40 to-transparent mb-2"></div>

        {/* Dropdown Menu - appears on hover */}
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Section */}
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/40 cursor-pointer relative group",
          collapsed ? "justify-center" : ""
        )}>
          <div className="relative flex-shrink-0">
            {user?.imageUrl ? (
              <img 
                src={user.imageUrl} 
                alt={user?.fullName || "Profile"} 
                className="w-9 h-9 rounded-full border-2 border-[#10B981] object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full border-2 border-[#10B981] bg-white text-[#1e1b4b] flex items-center justify-center font-bold text-sm">
                {(user?.firstName?.[0] || user?.fullName?.[0] || 'S').toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-[#F0F7F4] rounded-full"></div>
          </div>
          
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold text-[#1e1b4b] truncate font-serif">
                {user?.fullName || 'Student'}
              </p>
              <p className="text-[9px] text-[#64748B] truncate">
                {user?.primaryEmailAddress?.emailAddress || ''}
              </p>
            </div>
          )}
          {collapsed && (
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-white whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Profile
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
