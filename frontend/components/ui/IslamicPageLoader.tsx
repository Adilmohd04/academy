'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IslamicLoader } from './IslamicLoader';

interface IslamicPageLoaderProps {
  message?: string;
  arabicMessage?: string;
}

export const IslamicPageLoader: React.FC<IslamicPageLoaderProps> = ({
  message = 'Loading...',
  arabicMessage = 'جاري التحميل...'
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-islamic-primary-50 via-white to-islamic-gold-50 flex items-center justify-center z-50">
      {/* Islamic Pattern Background */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="islamic-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 0L61.2 38.8L100 50L61.2 61.2L50 100L38.8 61.2L0 50L38.8 38.8L50 0Z" 
                    fill="currentColor" 
                    className="text-islamic-primary-600" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo/Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-islamic-primary-600 to-islamic-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-3xl">ل</span>
          </div>
          <h2 className="text-2xl font-bold text-islamic-primary-700">Little Muslim Academy</h2>
          <p className="text-sm text-islamic-gold-600 font-medium mt-1" dir="rtl">{arabicMessage}</p>
        </motion.div>

        {/* Loader */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <IslamicLoader size="lg" />
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-lg text-islamic-midnight-600 font-medium">{message}</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 rounded-full bg-islamic-primary-500"
            />
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 rounded-full bg-islamic-primary-500"
            />
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 rounded-full bg-islamic-primary-500"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default IslamicPageLoader;
