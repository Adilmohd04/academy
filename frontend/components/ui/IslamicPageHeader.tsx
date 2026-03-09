/**
 * Islamic Page Header Component
 * Reusable header for all pages with breadcrumbs and actions
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { IslamicButton } from './IslamicButtons';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'gold';
}

interface IslamicPageHeaderProps {
  title: string;
  subtitle?: string;
  arabicTitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: PageAction[];
  icon?: LucideIcon;
  className?: string;
}

export const IslamicPageHeader: React.FC<IslamicPageHeaderProps> = ({
  title,
  subtitle,
  arabicTitle,
  breadcrumbs,
  actions,
  icon: Icon,
  className = ''
}) => {
  return (
    <div className={`bg-white/80 backdrop-blur-md border-b border-islamic-primary-100/50 sticky top-0 z-40 ${className}`}>
      <div className="px-8 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <Link 
                    href={crumb.href}
                    className="text-gray-600 hover:text-islamic-primary-600 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-islamic-primary-700 font-medium">
                    {crumb.label}
                  </span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Main Header Content */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-islamic-primary-600 to-islamic-emerald-600 flex items-center justify-center text-white shadow-lg">
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-islamic-primary-900 flex items-center gap-3">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-600 mt-1">{subtitle}</p>
              )}
              {arabicTitle && (
                <p className="text-sm text-islamic-gold-600 font-arabic mt-1">
                  {arabicTitle}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-3">
              {actions.map((action, index) => (
                action.href ? (
                  <Link key={index} href={action.href}>
                    <IslamicButton
                      variant={action.variant || 'primary'}
                      icon={action.icon}
                    >
                      {action.label}
                    </IslamicButton>
                  </Link>
                ) : (
                  <IslamicButton
                    key={index}
                    variant={action.variant || 'primary'}
                    icon={action.icon}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </IslamicButton>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
