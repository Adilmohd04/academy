/**
 * Islamic Geometric Patterns - SVG Components
 * Subtle, elegant patterns for backgrounds and decorative elements
 */

import React from 'react';

export interface IslamicPatternProps {
  className?: string;
  opacity?: number;
  color?: string;
}

// Geometric Star Pattern (8-pointed star - common in Islamic architecture)
export const GeometricStarPattern = ({ 
  className = "", 
  opacity = 0.05,
  color = "#0F4C3A" 
}: IslamicPatternProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <pattern id="islamic-star" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <g fill={color} opacity={opacity}>
          <path d="M40 10 L45 25 L60 25 L48 34 L53 49 L40 40 L27 49 L32 34 L20 25 L35 25 Z" />
          <circle cx="40" cy="40" r="3" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#islamic-star)" />
  </svg>
);

// Mashrabiya (traditional Islamic lattice) Pattern
export const MashrabiyaPattern = ({ 
  className = "", 
  opacity = 0.03,
  color = "#0F4C3A" 
}: IslamicPatternProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <pattern id="mashrabiya" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <g fill="none" stroke={color} strokeWidth="1" opacity={opacity}>
          <circle cx="30" cy="30" r="15" />
          <circle cx="30" cy="30" r="10" />
          <line x1="15" y1="30" x2="45" y2="30" />
          <line x1="30" y1="15" x2="30" y2="45" />
          <line x1="18" y1="18" x2="42" y2="42" />
          <line x1="42" y1="18" x2="18" y2="42" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#mashrabiya)" />
  </svg>
);

// Arabesque Pattern (flowing geometric design)
export const ArabesquePattern = ({ 
  className = "", 
  opacity = 0.04,
  color = "#0F4C3A" 
}: IslamicPatternProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <pattern id="arabesque" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <g fill={color} opacity={opacity}>
          <path d="M50 10 Q60 20 50 30 Q40 20 50 10 Z" />
          <path d="M50 70 Q60 80 50 90 Q40 80 50 70 Z" />
          <path d="M10 50 Q20 40 30 50 Q20 60 10 50 Z" />
          <path d="M70 50 Q80 40 90 50 Q80 60 70 50 Z" />
          <circle cx="50" cy="50" r="8" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#arabesque)" />
  </svg>
);

// Hexagonal Tessellation (honeycomb Islamic pattern)
export const HexagonalPattern = ({ 
  className = "", 
  opacity = 0.03,
  color = "#0F4C3A" 
}: IslamicPatternProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <pattern id="hexagon" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
        <g fill="none" stroke={color} strokeWidth="1" opacity={opacity}>
          <path d="M28 0 L56 25 L56 75 L28 100 L0 75 L0 25 Z" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hexagon)" />
  </svg>
);

// Simplified Zellige Pattern (Moroccan tilework)
export const ZelligePattern = ({ 
  className = "", 
  opacity = 0.05,
  color = "#0F4C3A" 
}: IslamicPatternProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <pattern id="zellige" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <g fill={color} opacity={opacity}>
          <path d="M0 30 L15 15 L30 0 L45 15 L60 30 L45 45 L30 60 L15 45 Z" />
          <path d="M30 30 L37 23 L30 16 L23 23 Z" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#zellige)" />
  </svg>
);

// Islamic Border Pattern (for decorative dividers)
export const IslamicBorder = ({ 
  className = "", 
  color = "#D4AF37",
  height = "4px" 
}: { 
  className?: string; 
  color?: string;
  height?: string;
}) => (
  <div className={`w-full ${className}`} style={{ height }}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="border-pattern" x="0" y="0" width="40" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="20" height="4" fill={color} />
          <circle cx="10" cy="2" r="1.5" fill="white" />
          <circle cx="30" cy="2" r="1.5" fill="white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#border-pattern)" />
    </svg>
  </div>
);

export interface IslamicPatternBackgroundProps {
  children: React.ReactNode;
  pattern?: "star" | "mashrabiya" | "arabesque" | "hexagon" | "zellige";
  className?: string;
  opacity?: number;
  color?: string;
}

// Background Wrapper Component
export const IslamicPatternBackground = ({ 
  children, 
  pattern = "star",
  className = "",
  opacity = 0.05,
  color
}: IslamicPatternBackgroundProps) => {
  const PatternComponent = {
    star: GeometricStarPattern,
    mashrabiya: MashrabiyaPattern,
    arabesque: ArabesquePattern,
    hexagon: HexagonalPattern,
    zellige: ZelligePattern,
  }[pattern];

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <PatternComponent opacity={opacity} color={color} />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
