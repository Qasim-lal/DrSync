/**
 * PWA Utilities for DrSync Healthcare App
 * Handles service worker registration, app installation, and offline functionality
 */

export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

export interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasServiceWorker: boolean;
  canReceiveNotifications: boolean;
}

// Global interface extension for beforeinstallprompt
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
  }
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('[PWA] Service Worker registered successfully:', registration.scope);

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('[PWA] New service worker found, installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New content available, will update after refresh');
            // Notify user about update availability
            notifyServiceWorkerUpdate();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check PWA capabilities
 */
export function getPWACapabilities(): PWACapabilities {
  // Check multiple ways to detect if app is installed
  const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  const androidApp = document.referrer.includes('android-app://');
  const fullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;
  const minimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  
  const isInstalled = standaloneMode || iosStandalone || androidApp || fullscreenMode || minimalUI;
  
  // Debug logging
  console.log('[PWA Capabilities] Detection results:', {
    standaloneMode,
    iosStandalone,
    androidApp,
    fullscreenMode,
    minimalUI,
    finalIsInstalled: isInstalled,
    userAgent: navigator.userAgent,
    referrer: document.referrer
  });

  const isInstallable = 'beforeinstallprompt' in window && !isInstalled;

  return {
    isInstallable,
    isInstalled,
    isOnline: navigator.onLine,
    hasServiceWorker: 'serviceWorker' in navigator,
    canReceiveNotifications: 'Notification' in window && 'serviceWorker' in navigator
  };
}

/**
 * Show PWA install prompt
 */
export async function showInstallPrompt(promptEvent: PWAInstallPrompt): Promise<boolean> {
  if (!promptEvent) {
    console.warn('[PWA] No install prompt available');
    return false;
  }

  try {
    await promptEvent.prompt();
    const choiceResult = await promptEvent.userChoice;
    
    const accepted = choiceResult.outcome === 'accepted';
    console.log(`[PWA] Install prompt ${accepted ? 'accepted' : 'dismissed'}`);
    
    // Track installation analytics
    if (accepted) {
      trackPWAEvent('install_prompt_accepted');
    } else {
      trackPWAEvent('install_prompt_dismissed');
    }
    
    return accepted;
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error);
    return false;
  }
}

/**
 * Request notification permission for appointment reminders
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log(`[PWA] Notification permission: ${permission}`);
  
  trackPWAEvent(`notification_permission_${permission}`);
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('[PWA] Push notification subscription successful');
    trackPWAEvent('push_subscription_successful');
    
    return subscription;
  } catch (error) {
    console.error('[PWA] Push notification subscription failed:', error);
    trackPWAEvent('push_subscription_failed');
    return null;
  }
}

/**
 * Check if app needs update
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    
    return registration.waiting !== null;
  } catch (error) {
    console.error('[PWA] Error checking for updates:', error);
    return false;
  }
}

/**
 * Apply pending service worker update
 */
export function applyServiceWorkerUpdate(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then(registration => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  });
}

/**
 * Get cached healthcare data for offline use
 */
export async function getCachedHealthcareData(cacheKey: string): Promise<any | null> {
  if (!('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open('drsync-v1');
    const response = await cache.match(cacheKey);
    
    if (response) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('[PWA] Error getting cached data:', error);
    return null;
  }
}

/**
 * Cache critical healthcare data
 */
export async function cacheHealthcareData(url: string, data: any): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cache = await caches.open('drsync-v1');
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'sw-cache-date': Date.now().toString()
      }
    });
    
    await cache.put(url, response);
    console.log(`[PWA] Cached healthcare data for: ${url}`);
    return true;
  } catch (error) {
    console.error('[PWA] Error caching healthcare data:', error);
    return false;
  }
}

/**
 * Clear old cached data
 */
export async function clearOldCache(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    const currentCache = 'drsync-v1';
    
    await Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== currentCache) {
          console.log(`[PWA] Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        }
      })
    );
  } catch (error) {
    console.error('[PWA] Error clearing old cache:', error);
  }
}

/**
 * Share healthcare data (using Web Share API)
 */
export async function shareHealthcareData(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  if (!navigator.share) {
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(`${data.title}\n${data.text}\n${data.url || ''}`);
      console.log('[PWA] Data copied to clipboard');
      return true;
    } catch (error) {
      console.error('[PWA] Share fallback failed:', error);
      return false;
    }
  }

  try {
    await navigator.share(data);
    console.log('[PWA] Data shared successfully');
    trackPWAEvent('healthcare_data_shared');
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[PWA] Share failed:', error);
    }
    return false;
  }
}

/**
 * Handle offline healthcare workflows
 */
export function handleOfflineWorkflow(action: string, data: any): void {
  const offlineActions = JSON.parse(
    localStorage.getItem('offline_healthcare_actions') || '[]'
  );
  
  offlineActions.push({
    action,
    data,
    timestamp: Date.now(),
    id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });
  
  localStorage.setItem('offline_healthcare_actions', JSON.stringify(offlineActions));
  console.log(`[PWA] Queued offline healthcare action: ${action}`);
}

/**
 * Process queued offline actions when back online
 */
export async function processOfflineActions(): Promise<void> {
  const offlineActions = JSON.parse(
    localStorage.getItem('offline_healthcare_actions') || '[]'
  );
  
  if (offlineActions.length === 0) {
    return;
  }
  
  console.log(`[PWA] Processing ${offlineActions.length} offline actions`);
  
  for (const action of offlineActions) {
    try {
      // Process each action based on type
      await processOfflineAction(action);
      
      // Remove processed action
      const remainingActions = offlineActions.filter((a: any) => a.id !== action.id);
      localStorage.setItem('offline_healthcare_actions', JSON.stringify(remainingActions));
      
    } catch (error) {
      console.error(`[PWA] Failed to process offline action ${action.id}:`, error);
    }
  }
}

/**
 * Process individual offline action
 */
async function processOfflineAction(action: any): Promise<void> {
  const { action: actionType, data } = action;
  
  switch (actionType) {
    case 'create_appointment':
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      break;
      
    case 'update_patient':
      await fetch(`/api/patients/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      break;
      
    case 'send_whatsapp':
      await fetch('/api/communications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      break;
      
    default:
      console.warn(`[PWA] Unknown offline action type: ${actionType}`);
  }
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function notifyServiceWorkerUpdate(): void {
  // This could trigger a toast notification or modal
  if (window.confirm('A new version of DrSync is available. Update now?')) {
    applyServiceWorkerUpdate();
  }
}

function trackPWAEvent(event: string): void {
  // Track PWA events for analytics
  console.log(`[PWA Analytics] ${event}`);
  
  // You can integrate with analytics services here
  if (typeof gtag !== 'undefined') {
    gtag('event', 'pwa_interaction', {
      event_category: 'PWA',
      event_label: event
    });
  }
}

/**
 * Initialize PWA functionality
 */
export async function initializePWA(): Promise<void> {
  console.log('[PWA] Initializing DrSync PWA...');
  
  // Register service worker
  await registerServiceWorker();
  
  // Check and process offline actions if online
  if (navigator.onLine) {
    await processOfflineActions();
  }
  
  // Set up online/offline listeners
  window.addEventListener('online', () => {
    console.log('[PWA] Back online, processing queued actions');
    processOfflineActions();
    trackPWAEvent('back_online');
  });
  
  window.addEventListener('offline', () => {
    console.log('[PWA] Gone offline, enabling offline mode');
    trackPWAEvent('gone_offline');
  });
  
  // Clear old cache
  await clearOldCache();
  
  console.log('[PWA] DrSync PWA initialized successfully');
}