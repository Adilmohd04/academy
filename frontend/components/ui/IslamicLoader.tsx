'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const IslamicLoader = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Ring - Geometric Pattern */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className={`${sizeClasses[size]} absolute opacity-20`}
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-amber-600">
          <path d="M50 0L61.2 38.8L100 50L61.2 61.2L50 100L38.8 61.2L0 50L38.8 38.8L50 0Z" fill="currentColor" />
        </svg>
      </motion.div>

      {/* Middle Ring - Crescent */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className={`${sizeClasses[size]} p-2`}
      >
        <div className="w-full h-full rounded-full border-4 border-transparent border-t-amber-500 border-r-amber-500/50" />
      </motion.div>

      {/* Inner Star */}
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute text-emerald-600"
      >
        <svg width={size === 'sm' ? 12 : size === 'md' ? 24 : 32} height={size === 'sm' ? 12 : size === 'md' ? 24 : 32} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </motion.div>
    </div>
  );
};
