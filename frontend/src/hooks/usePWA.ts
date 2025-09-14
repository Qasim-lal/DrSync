'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PWAInstallPrompt,
  PWACapabilities,
  getPWACapabilities,
  showInstallPrompt,
  requestNotificationPermission,
  subscribeToPushNotifications,
  checkForUpdates,
  applyServiceWorkerUpdate,
  getCachedHealthcareData,
  cacheHealthcareData,
  handleOfflineWorkflow,
  shareHealthcareData
} from '../utils/pwa';

/**
 * Hook for managing PWA installation
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    const capabilities = getPWACapabilities();
    setIsInstalled(capabilities.isInstalled);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
      console.log('[PWA Hook] Install prompt available');
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log('[PWA Hook] App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      console.warn('[PWA Hook] No install prompt available');
      return false;
    }

    setIsInstalling(true);
    
    try {
      const accepted = await showInstallPrompt(installPrompt);
      if (accepted) {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
      }
      return accepted;
    } catch (error) {
      console.error('[PWA Hook] Install failed:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  return {
    isInstallable,
    isInstalled,
    isInstalling,
    install
  };
}

/**
 * Hook for detecting online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        console.log('[PWA Hook] Back online');
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      console.log('[PWA Hook] Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

/**
 * Hook for managing push notifications
 */
export function usePWANotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    return newPermission;
  }, []);

  const subscribe = useCallback(async (vapidPublicKey: string): Promise<PushSubscription | null> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA Hook] Service Worker not supported');
      return null;
    }

    setIsSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const newSubscription = await subscribeToPushNotifications(registration, vapidPublicKey);
      setSubscription(newSubscription);
      return newSubscription;
    } catch (error) {
      console.error('[PWA Hook] Subscription failed:', error);
      return null;
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.warn('[PWA Hook] Notification permission not granted');
      return;
    }

    try {
      // Try service worker notification first
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'drsync-notification',
          requireInteraction: false,
          ...options
        });
        console.log('[PWA Hook] Service worker notification sent');
      } else {
        // Fallback to regular notification if service worker not ready
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          tag: 'drsync-notification',
          ...options
        });
        console.log('[PWA Hook] Regular notification sent');
      }
    } catch (error) {
      console.error('[PWA Hook] Show notification failed:', error);
      // Final fallback to regular notification
      try {
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          tag: 'drsync-notification',
          ...options
        });
        console.log('[PWA Hook] Fallback notification sent');
      } catch (fallbackError) {
        console.error('[PWA Hook] All notification methods failed:', fallbackError);
      }
    }
  }, [permission]);

  return {
    permission,
    subscription,
    isSubscribing,
    requestPermission,
    subscribe,
    showNotification
  };
}

/**
 * Hook for managing service worker updates
 */
export function usePWAUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkUpdates = async () => {
      const hasUpdate = await checkForUpdates();
      setUpdateAvailable(hasUpdate);
    };

    // Check for updates every 5 minutes
    checkUpdates();
    interval = setInterval(checkUpdates, 5 * 60 * 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    applyServiceWorkerUpdate();
  }, []);

  return {
    updateAvailable,
    isUpdating,
    applyUpdate
  };
}

/**
 * Hook for caching healthcare data
 */
export function useHealthcareCache() {
  const [isCaching, setIsCaching] = useState(false);

  const getCachedData = useCallback(async (key: string): Promise<any | null> => {
    try {
      return await getCachedHealthcareData(key);
    } catch (error) {
      console.error('[PWA Hook] Error getting cached data:', error);
      return null;
    }
  }, []);

  const cacheData = useCallback(async (url: string, data: any): Promise<boolean> => {
    setIsCaching(true);
    try {
      const success = await cacheHealthcareData(url, data);
      return success;
    } catch (error) {
      console.error('[PWA Hook] Error caching data:', error);
      return false;
    } finally {
      setIsCaching(false);
    }
  }, []);

  return {
    isCaching,
    getCachedData,
    cacheData
  };
}

/**
 * Hook for managing offline healthcare workflows
 */
export function useOfflineWorkflow() {
  const { isOnline } = useOnlineStatus();
  const [queuedActions, setQueuedActions] = useState<any[]>([]);

  useEffect(() => {
    // Load queued actions from localStorage
    const actions = JSON.parse(localStorage.getItem('offline_healthcare_actions') || '[]');
    setQueuedActions(actions);
  }, []);

  const queueAction = useCallback((action: string, data: any) => {
    handleOfflineWorkflow(action, data);
    
    // Update state
    const updatedActions = JSON.parse(localStorage.getItem('offline_healthcare_actions') || '[]');
    setQueuedActions(updatedActions);
    
    console.log(`[PWA Hook] Queued offline action: ${action}`);
  }, []);

  const clearQueue = useCallback(() => {
    localStorage.setItem('offline_healthcare_actions', '[]');
    setQueuedActions([]);
  }, []);

  return {
    isOnline,
    queuedActions: queuedActions.length,
    queueAction,
    clearQueue
  };
}

/**
 * Hook for sharing healthcare data
 */
export function useHealthcareShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported('share' in navigator || 'clipboard' in navigator);
  }, []);

  const share = useCallback(async (data: {
    title: string;
    text: string;
    url?: string;
  }): Promise<boolean> => {
    if (!shareSupported) {
      console.warn('[PWA Hook] Share not supported');
      return false;
    }

    setIsSharing(true);
    try {
      const success = await shareHealthcareData(data);
      return success;
    } catch (error) {
      console.error('[PWA Hook] Share failed:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [shareSupported]);

  return {
    shareSupported,
    isSharing,
    share
  };
}

/**
 * Main PWA hook that combines all PWA functionality
 */
export function usePWA() {
  const install = usePWAInstall();
  const online = useOnlineStatus();
  const notifications = usePWANotifications();
  const updates = usePWAUpdates();
  const cache = useHealthcareCache();
  const offline = useOfflineWorkflow();
  const sharing = useHealthcareShare();

  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    hasServiceWorker: false,
    canReceiveNotifications: false
  });

  useEffect(() => {
    const caps = getPWACapabilities();
    setCapabilities(caps);
  }, [install.isInstalled, online.isOnline]);

  return {
    capabilities,
    install,
    online,
    notifications,
    updates,
    cache,
    offline,
    sharing
  };
}