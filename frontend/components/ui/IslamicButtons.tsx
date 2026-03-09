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
  const baseClasses = "font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-islamic-primary-600 to-islamic-emerald-600 text-white hover:from-islamic-primary-700 hover:to-islamic-emerald-700",
    secondary: "bg-gradient-to-r from-islamic-midnight-500 to-islamic-primary-700 text-white hover:from-islamic-midnight-600 hover:to-islamic-primary-800",
    gold: "bg-gradient-to-r from-islamic-gold-500 to-islamic-gold-400 text-islamic-midnight-900 hover:from-islamic-gold-600 hover:to-islamic-gold-500",
    success: "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700",
    outline: "bg-transparent border-2 border-islamic-primary-600 text-islamic-primary-600 hover:bg-islamic-primary-50"
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
    primary: "bg-islamic-primary-600 text-white hover:bg-islamic-primary-700",
    secondary: "bg-islamic-gold-500 text-islamic-midnight-900 hover:bg-islamic-gold-600",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
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
