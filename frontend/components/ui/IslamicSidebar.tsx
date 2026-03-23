/**
 * Islamic-Themed Sidebar Navigation
 * Elegant sidebar with Islamic design elements
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  subItems?: Array<{
    label: string;
    href: string;
  }>;
}

interface IslamicSidebarProps {
  navItems: NavItem[];
  userRole: 'admin' | 'teacher' | 'student';
  userName?: string;
  userEmail?: string;
}

export const IslamicSidebar: React.FC<IslamicSidebarProps> = ({
  navItems,
  userRole,
  userName,
  userEmail
}) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const roleConfig = {
    admin: {
      gradient: 'from-slate-900 via-slate-800 to-slate-900',
      activeItem: 'bg-amber-400/15 border border-amber-300/30 text-white',
      hoverItem: 'hover:bg-white/10 hover:text-white',
      badgeClass: 'bg-amber-300 text-slate-900',
      title: 'Little Muslimah Academy',
      arabicTitle: 'أكاديمية المسلمة الصغيرة'
    },
    teacher: {
      gradient: 'from-emerald-900 via-teal-800 to-emerald-900',
      activeItem: 'bg-white/20 border border-emerald-200/30 text-white',
      hoverItem: 'hover:bg-white/10 hover:text-white',
      badgeClass: 'bg-emerald-200 text-emerald-900',
      title: 'Little Muslimah Academy',
      arabicTitle: 'بوابة المعلم'
    },
    student: {
      gradient: 'from-slate-900 via-slate-800 to-slate-900',
      activeItem: 'bg-violet-400/15 border border-violet-300/30 text-white',
      hoverItem: 'hover:bg-white/10 hover:text-white',
      badgeClass: 'bg-violet-300 text-slate-900',
      title: 'Little Muslimah Academy',
      arabicTitle: 'أكاديمية المسلمة الصغيرة'
    }
  };

  const config = roleConfig[userRole];

  return (
    <>
      <div
        className={`${
          collapsed ? 'w-[88px]' : 'w-[280px]'
        } h-screen bg-gradient-to-b ${config.gradient} text-white sticky top-0 z-50 transition-all duration-300 shadow-xl overflow-hidden flex flex-col flex-shrink-0 border-r border-white/10`}
      >
      {/* Header */}
      <div className="relative p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold tracking-wide text-white">Little Muslimah</h2>
              </div>
              <p className="text-[11px] text-white/60 tracking-[0.18em]">ACADEMY</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:shadow-lg"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="space-y-1">
          {navItems.map((item) => {
            // Handle dashboard links (exact match only)
            const isDashboard = item.href === '/teacher' || item.href === '/admin' || item.href === '/student';
            
            const isActive = isDashboard
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            
            const isExpanded = expandedItems.includes(item.label);
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <div key={item.label}>
                {/* Main Nav Item */}
                <Link
                  href={hasSubItems && !collapsed ? '#' : item.href}
                  onClick={(e) => {
                    if (hasSubItems && !collapsed) {
                      e.preventDefault();
                      toggleExpand(item.label);
                    }
                  }}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? `${config.activeItem} shadow-sm`
                      : `text-white/80 ${config.hoverItem}`
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? item.label : ''}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                  
                  {!collapsed && (
                    <>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${config.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                      {hasSubItems && (
                        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </>
                  )}
                </Link>

                {/* Sub Items */}
                {hasSubItems && !collapsed && isExpanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.subItems!.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors
                          ${pathname === subItem.href
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section - Bottom */}
      <div className="relative p-3 border-t border-white/20">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 rounded-full border-2 border-white/50"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{userName || 'User'}</p>
              <p className="text-xs text-white/70 truncate">{userEmail || ''}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 rounded-full border-2 border-white/50"
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
};
