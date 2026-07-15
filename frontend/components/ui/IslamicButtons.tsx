/**
 * Islamic-Themed Buttons
 * Professional, elegant buttons with Islamic design principles
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'gold' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const IslamicButton: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}) => {
  const baseClasses = "font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variantClasses = {
    primary: "bg-[#1B365D] text-white hover:bg-[#152C4E] border border-transparent shadow hover:shadow-lg hover:shadow-[#1B365D]/10",
    secondary: "bg-white text-[#1B365D] hover:bg-[#F0F7F4] border-2 border-[#E2E8F0] hover:border-[#10B981]/30",
    gold: "bg-[#C5A059] text-white hover:bg-[#B8960F] shadow hover:shadow-lg hover:shadow-[#C5A059]/20",
    success: "bg-[#10B981] text-white hover:bg-[#059669] shadow hover:shadow-lg hover:shadow-[#10B981]/20",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow hover:shadow-lg",
    outline: "bg-transparent border-2 border-[#1B365D] text-[#1B365D] hover:bg-[#FDFBF7]"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
        </>
      )}
    </button>
  );
};

// Icon Button (square, icon only)
interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  className?: string;
}

export const IslamicIconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  variant = 'primary',
  size = 'md',
  tooltip,
  className = ''
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const variantClasses = {
    primary: "bg-[#1B365D] text-white hover:bg-[#152C4E]",
    secondary: "bg-[#C5A059] text-white hover:bg-[#B8960F]",
    ghost: "bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1B365D]"
  };

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-xl flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg active:scale-90 ${className}`}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );
};
