'use client';

import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  compact?: boolean;
  href?: string;
  showText?: boolean;
  className?: string;
  variant?: 'shield' | 'circular' | 'text-only';
}

export function BrandLogo({ 
  compact = false, 
  href = '/', 
  showText = true, 
  className = '',
  variant = 'shield'
}: BrandLogoProps) {
  const logoSize = compact ? 44 : 60;

  const content = (
    <div className={`flex items-center ${compact ? 'justify-center' : 'gap-4'} min-w-0 ${className}`}>
      <div style={{ width: logoSize, height: logoSize, flexShrink: 0 }} className="relative flex items-center justify-center">
        <Image
          src={variant === 'circular' ? '/academy-logo-circular.jpg' : '/academy-logo-shield.jpg'}
          alt="Little Muslimah Academy"
          width={logoSize}
          height={logoSize}
          priority
          className="w-full h-full object-contain"
        />
      </div>
      
      {showText && !compact && (
        <div className="min-w-0 flex flex-col justify-center">
          <div className="font-bold text-[20px] leading-tight tracking-[0.02em] text-inherit">
            Little Muslimah
          </div>
          <div className="text-[12px] tracking-[0.12em] uppercase font-semibold opacity-85 text-inherit">
            Academy
          </div>
        </div>
      )}

      {showText && compact && variant !== 'text-only' && (
        <div className="hidden sm:flex flex-col justify-center">
          <div className="font-bold text-[14px] leading-tight text-inherit">
            LMA
          </div>
        </div>
      )}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex items-center min-w-0">
      {content}
    </Link>
  );
}