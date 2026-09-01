/**
 * Islamic-Themed Card Components
 * Elegant, professional cards with Islamic design elements
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IslamicCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  border?: boolean;
}

// Base Islamic Card
export const IslamicCard: React.FC<IslamicCardProps> = ({ 
  children, 
  className = "", 
  hover = true,
  gradient = false,
  border = true 
}) => {
  const baseClasses = "rounded-2xl transition-all duration-300 overflow-hidden relative shadow-sm";
  const hoverClasses = hover ? "hover:shadow-xl hover:border-[#1B365D]/20 hover:-translate-y-0.5" : "";
  const borderClasses = border ? "border border-[#E2E8F0]" : "";
  const gradientClasses = gradient 
    ? "bg-gradient-to-br from-[#FDFBF7] to-white" 
    : "bg-white";
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${borderClasses} ${gradientClasses} ${className}`}>
      {children}
    </div>
  );
};

// Stat Card with Icon
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  iconColor?: string;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const IslamicStatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  subtext,
  iconColor = "text-islamic-primary-600",
  iconBg = "bg-islamic-primary-50",
  trend,
  trendValue
}) => {
  return (
    <IslamicCard className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`${iconBg} ${iconColor} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
            <Icon className="w-6 h-6" />
          </div>
          <p className="text-gray-600 text-sm font-medium mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-gray-500 text-xs mt-1">{subtext}</p>
          )}
        </div>
        
        {trend && trendValue && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            trend === 'up' ? 'bg-green-100 text-green-700' :
            trend === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '='} {trendValue}
          </div>
        )}
      </div>
    </IslamicCard>
  );
};

// Action Card (clickable with hover effects)
interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  gradient?: string;
}

export const IslamicActionCard: React.FC<ActionCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
  href,
  gradient = "from-[#1B365D] to-[#152C4E]"
}) => {
  const content = (
    <div className={`group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${gradient} text-white cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}>
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="card-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#card-pattern)" />
        </svg>
      </div>
      
      <div className="relative z-10">
        <Icon className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform duration-300" />
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-white/90 text-sm">{description}</p>
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return <div onClick={onClick}>{content}</div>;
};

// Info Card with Islamic Border
interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'neutral';
  icon?: LucideIcon;
}

export const IslamicInfoCard: React.FC<InfoCardProps> = ({
  title,
  children,
  variant = 'neutral',
  icon: Icon
}) => {
  const variantStyles = {
    info: {
      border: 'border-blue-300',
      bg: 'bg-blue-50/80',
      icon: 'text-blue-600',
      title: 'text-blue-900'
    },
    success: {
      border: 'border-green-300',
      bg: 'bg-green-50/80',
      icon: 'text-green-600',
      title: 'text-green-900'
    },
    warning: {
      border: 'border-amber-300',
      bg: 'bg-amber-50/80',
      icon: 'text-amber-600',
      title: 'text-amber-900'
    },
    neutral: {
      border: 'border-[#1B365D]/30',
      bg: 'bg-[#FDFBF7]',
      icon: 'text-[#1B365D]',
      title: 'text-[#1B365D]'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`${styles.border} ${styles.bg} border-l-4 rounded-xl p-6 backdrop-blur-sm shadow-md`}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={`${styles.icon} mt-1`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div className="flex-1">
          <h4 className={`${styles.title} font-bold mb-3 text-lg`}>{title}</h4>
          <div className="text-gray-700 space-y-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
