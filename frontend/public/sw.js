const CACHE_NAME = 'drsync-v1';
const OFFLINE_URL = '/offline';

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  // Critical healthcare data - Network First (fresh data priority)
  NETWORK_FIRST: 'network-first',
  // Static assets - Cache First (performance priority)
  CACHE_FIRST: 'cache-first',
  // Background sync data
  BACKGROUND_SYNC: 'background-sync'
};

// Define what to cache immediately on install
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/dashboard',
  '/dashboard/appointments',
  '/dashboard/patients',
  '/dashboard/communications',
  '/manifest.json',
  // Add critical static assets
  '/_next/static/css/',  // Next.js will replace with actual hash
  '/_next/static/js/',   // Next.js will replace with actual hash
];

// Critical API endpoints to cache for offline access
const CRITICAL_API_PATTERNS = [
  /^\/api\/appointments\/.*/,
  /^\/api\/patients\/.*/,
  /^\/api\/auth\/me$/,
  /^\/api\/organizations\/.*/,
  /^\/api\/dashboard\/stats$/
];

// Background sync patterns for data that can be synchronized later
const BACKGROUND_SYNC_PATTERNS = [
  /^\/api\/communications\/.*/,
  /^\/api\/analytics\/.*/,
  /^\/api\/reports\/.*/
];

// Healthcare-specific cache duration (shorter for critical data)
const CACHE_DURATION = {
  STATIC: 24 * 60 * 60 * 1000,      // 24 hours for static assets
  API: 5 * 60 * 1000,               // 5 minutes for API data
  CRITICAL: 2 * 60 * 1000,          // 2 minutes for critical healthcare data
  OFFLINE_FALLBACK: 7 * 24 * 60 * 60 * 1000  // 7 days for offline fallbacks
};

// Install event - Pre-cache critical resources
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[ServiceWorker] Pre-caching static resources');
      
      try {
        // Cache static resources
        await cache.addAll(STATIC_CACHE_URLS);
        console.log('[ServiceWorker] Static resources cached successfully');
      } catch (error) {
        console.error('[ServiceWorker] Failed to cache static resources:', error);
        // Cache individual resources that are available
        for (const url of STATIC_CACHE_URLS) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`[ServiceWorker] Failed to cache ${url}:`, err);
          }
        }
      }
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Take control of all pages immediately
      self.clients.claim();
    })()
  );
});

// Fetch event - Implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Healthcare data priority
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(request)) {
    // Static assets - Cache first
    event.respondWith(handleStaticAsset(request));
  } else {
    // Navigation requests - Network first with offline fallback
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with healthcare-focused caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Determine cache strategy based on endpoint importance
  if (isCriticalHealthcareData(url.pathname)) {
    return networkFirstWithTimeout(request, CACHE_DURATION.CRITICAL);
  } else if (isBackgroundSyncData(url.pathname)) {
    return handleBackgroundSyncRequest(request);
  } else {
    return networkFirstWithTimeout(request, CACHE_DURATION.API);
  }
}

// Network first strategy with timeout for critical healthcare data
async function networkFirstWithTimeout(request, maxAge = CACHE_DURATION.API) {
  try {
    // Try network first with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 3000)
      )
    ]);

    // If successful, update cache and return fresh data
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', error);
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Check if cached data is still valid for critical healthcare data
    const cacheDate = cachedResponse.headers.get('sw-cache-date');
    if (cacheDate && Date.now() - parseInt(cacheDate) > maxAge) {
      console.warn('[ServiceWorker] Cached healthcare data is stale');
    }
    return cachedResponse;
  }

  // If no cache, return error response
  return new Response(
    JSON.stringify({
      error: 'Network unavailable and no cached data',
      message: 'Please check your internet connection',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Handle static assets with cache first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    return cachedResponse;
  }

  try {
    // Fetch from network and cache
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[ServiceWorker] Failed to fetch static asset:', error);
    // Return offline fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#f3f4f6"/><text x="100" y="75" text-anchor="middle" fill="#6b7280">Image Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Always try network first for navigation
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Navigation request failed, serving offline page');
    
    // Serve cached page if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve offline page
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback offline HTML
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>DrSync - Offline</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; text-align: center; background: #f9fafb; }
            .container { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #2563eb; margin-bottom: 1rem; }
            p { color: #6b7280; line-height: 1.6; }
            .retry-btn { 
              background: #2563eb; color: white; border: none; padding: 0.75rem 1.5rem; 
              border-radius: 0.5rem; margin-top: 1rem; cursor: pointer; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🏥</div>
            <h1>DrSync Offline</h1>
            <p>You're currently offline. Some features may be limited, but you can still access cached patient data and appointments.</p>
            <button class="retry-btn" onclick="location.reload()">Try Again</button>
          </div>
          <script>
            // Auto-refresh when back online
            window.addEventListener('online', () => location.reload());
          </script>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Background sync for non-critical data
async function handleBackgroundSyncRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    // Queue for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await queueBackgroundSync(request);
    }
  }

  // Return cached version if available
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  return new Response(
    JSON.stringify({ error: 'Queued for sync when online' }),
    { 
      status: 202, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Background sync event
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'healthcare-data-sync') {
    event.waitUntil(syncHealthcareData());
  }
});

// Utility functions
function isCriticalHealthcareData(pathname) {
  return CRITICAL_API_PATTERNS.some(pattern => pattern.test(pathname));
}

function isBackgroundSyncData(pathname) {
  return BACKGROUND_SYNC_PATTERNS.some(pattern => pattern.test(pathname));
}

function isStaticAsset(request) {
  return request.destination === 'image' || 
         request.destination === 'script' || 
         request.destination === 'style' ||
         request.destination === 'font' ||
         request.url.includes('/_next/static/');
}

async function queueBackgroundSync(request) {
  // Store request for later sync
  const cache = await caches.open('background-sync');
  await cache.put(`bg-sync-${Date.now()}`, request);
  
  // Register background sync
  return self.registration.sync.register('healthcare-data-sync');
}

async function syncHealthcareData() {
  const cache = await caches.open('background-sync');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('bg-sync-')) {
      try {
        const originalRequest = await cache.match(request);
        await fetch(originalRequest);
        await cache.delete(request);
      } catch (error) {
        console.error('[ServiceWorker] Background sync failed:', error);
      }
    }
  }
}

// Push notification handling for appointment reminders
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push notification received');
  
  const options = {
    body: 'You have upcoming appointments to review.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Appointments',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('DrSync Notification', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to appointments page
    event.waitUntil(
      clients.openWindow('/dashboard/appointments')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[ServiceWorker] DrSync Healthcare PWA Service Worker loaded');