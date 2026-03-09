'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface StunningNotificationProps {
  type: NotificationType;
  message: string;
  isVisible: boolean;
  onClose: () => void;
  autoCloseMs?: number;
}

const notificationConfig = {
  success: {
    icon: CheckCircle,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-900',
  },
  error: {
    icon: XCircle,
    gradient: 'from-rose-500 to-red-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconColor: 'text-rose-600',
    textColor: 'text-rose-900',
  },
  warning: {
    icon: AlertCircle,
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-900',
  },
  info: {
    icon: Info,
    gradient: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-900',
  },
};

export default function StunningNotification({
  type,
  message,
  isVisible,
  onClose,
  autoCloseMs = 4000,
}: StunningNotificationProps) {
  const config = notificationConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (isVisible && autoCloseMs > 0) {
      const timer = setTimeout(onClose, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <div
            className={`${config.bg} ${config.border} border-2 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden`}
          >
            {/* Progress Bar */}
            {autoCloseMs > 0 && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
                className={`h-1 bg-gradient-to-r ${config.gradient}`}
              />
            )}

            <div className="p-4 flex items-start gap-3">
              {/* Animated Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className={`${config.iconColor} flex-shrink-0`}
              >
                <Icon className="w-6 h-6" />
              </motion.div>

              {/* Message */}
              <p className={`${config.textColor} font-medium text-sm flex-1 leading-relaxed`}>
                {message}
              </p>

              {/* Close Button */}
              <button
                onClick={onClose}
                className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
