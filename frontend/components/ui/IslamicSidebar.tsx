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
import { BrandLogo } from '@/components/ui/BrandLogo';
import { SidebarTooltip, useSidebarTooltip } from '@/components/ui/SidebarTooltip';

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
  const { tooltip, show: showTooltip, hide: hideTooltip } = useSidebarTooltip(collapsed);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const roleConfig = {
    admin: {
      surface: 'bg-[#17342b]',
      surfaceGlow: 'rgba(199, 169, 107, 0.22)',
      activeItem: 'bg-[rgba(199,169,107,0.18)] border border-[rgba(199,169,107,0.38)] text-[#f5ecd9]',
      hoverItem: 'hover:bg-[rgba(255,255,255,0.08)] hover:text-[#fdf8ec]',
      badgeClass: 'bg-[#c7a96b] text-[#163229]',
      title: 'Little Muslimah Academy',
      arabicTitle: 'أكاديمية المسلمة الصغيرة'
    },
    teacher: {
      surface: 'bg-[#154138]',
      surfaceGlow: 'rgba(92, 167, 141, 0.2)',
      activeItem: 'bg-[rgba(92,167,141,0.2)] border border-[rgba(123,197,172,0.35)] text-[#f2fbf8]',
      hoverItem: 'hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f2fbf8]',
      badgeClass: 'bg-[#8ad2bb] text-[#143a31]',
      title: 'Little Muslimah Academy',
      arabicTitle: 'بوابة المعلم'
    },
    student: {
      surface: 'bg-[#1f2e47]',
      surfaceGlow: 'rgba(137, 154, 201, 0.2)',
      activeItem: 'bg-[rgba(137,154,201,0.2)] border border-[rgba(174,188,224,0.35)] text-[#f4f6fb]',
      hoverItem: 'hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f4f6fb]',
      badgeClass: 'bg-[#bcc8ea] text-[#1f2e47]',
      title: 'Little Muslimah Academy',
      arabicTitle: 'أكاديمية المسلمة الصغيرة'
    }
  };

  const config = roleConfig[userRole];

  return (
    <>
      <div
        className={`${
          collapsed ? 'w-[115px]' : 'w-[320px]'
        } h-screen ${config.surface} text-white sticky top-0 z-50 transition-all duration-300 shadow-[0_18px_45px_rgba(12,24,20,0.34)] overflow-hidden flex flex-col flex-shrink-0 border-r border-white/10`}
      >
      <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: `radial-gradient(circle at 18% 10%, ${config.surfaceGlow} 0, transparent 36%), radial-gradient(circle at 86% 2%, rgba(255,255,255,0.08) 0, transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.01) 100%)` }} />
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

      {/* Header */}
      <div className="relative p-3 lg:p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm flex-shrink-0">
        {!collapsed && (
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <BrandLogo href="/" variant="shield" showText className="text-white" />
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 lg:p-2.5 hover:bg-white/15 active:bg-white/20 rounded-lg transition-all duration-200 flex-shrink-0 group"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-white/80 group-hover:text-white transition-colors" />
            </button>
          </div>
        )}
        
        {!collapsed && (
          <div className="space-y-1">
            <p className="text-[9px] text-white/60 tracking-[0.16em] mt-2 font-semibold">Since 2024</p>
          </div>
        )}
        
        {collapsed && (
          <div className="flex items-center justify-center py-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="relative p-3 hover:bg-white/15 active:bg-white/20 rounded-lg transition-all duration-200 group flex-shrink-0 flex items-center justify-center"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <div style={{ width: 40, height: 40 }} className="flex items-center justify-center">
                <img 
                  src="/academy-logo-shield.jpg" 
                  alt="Academy"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -right-1 -bottom-1 bg-white/20 rounded-full p-1.5 group-hover:bg-white/30 transition-all">
                <ChevronRight className="w-4 h-4 text-white transition-colors" />
              </div>
            </button>
          </div>
        )}
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
                      ? `${config.activeItem} shadow-[0_8px_20px_rgba(7,12,10,0.2)]`
                      : `text-white/80 ${config.hoverItem}`
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  aria-label={item.label}
                  onMouseEnter={showTooltip(item.label)}
                  onMouseLeave={hideTooltip}
                  onFocus={showTooltip(item.label)}
                  onBlur={hideTooltip}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'scale-105' : 'group-hover:scale-105'} transition-transform`} />
                  
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
                            ? 'bg-white/15 text-white font-medium border border-white/10'
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
      <div className="relative p-3 border-t border-white/20 bg-white/[0.03]">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
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

    <SidebarTooltip tooltip={tooltip} />
    </>
  );
};
