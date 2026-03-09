'use client';

import { useState, useCallback } from 'react';
import { NotificationType } from '@/components/shared/StunningNotification';

interface Notification {
  type: NotificationType;
  message: string;
  isVisible: boolean;
}

export function useNotification() {
  const [notification, setNotification] = useState<Notification>({
    type: 'info',
    message: '',
    isVisible: false,
  });

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message, isVisible: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return {
    notification,
    showNotification,
    hideNotification,
    success: (message: string) => showNotification('success', message),
    error: (message: string) => showNotification('error', message),
    warning: (message: string) => showNotification('warning', message),
    info: (message: string) => showNotification('info', message),
  };
}
