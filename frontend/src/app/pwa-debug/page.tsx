'use client';

import { useEffect, useState } from 'react';

export default function PWADebugPage() {
  const [installPromptDismissed, setInstallPromptDismissed] = useState<string | null>(null);
  const [beforeInstallPrompt, setBeforeInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check localStorage flag
    const dismissed = localStorage.getItem('pwa-install-prompt-dismissed');
    setInstallPromptDismissed(dismissed);

    // Check if beforeinstallprompt event is available
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('[PWA Debug] BeforeInstallPrompt event fired:', e);
      e.preventDefault();
      setBeforeInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA Debug] App is already installed');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const clearLocalStorage = () => {
    localStorage.removeItem('pwa-install-prompt-dismissed');
    setInstallPromptDismissed(null);
    window.location.reload();
  };

  const forceInstallPrompt = async () => {
    if (beforeInstallPrompt) {
      try {
        const result = await beforeInstallPrompt.prompt();
        console.log('[PWA Debug] Install prompt result:', result);
        setBeforeInstallPrompt(null);
        setIsInstallable(false);
      } catch (error) {
        console.error('[PWA Debug] Install prompt error:', error);
      }
    }
  };

  const checkPWAStatus = () => {
    console.log('=== PWA Debug Status ===');
    console.log('localStorage dismissed:', localStorage.getItem('pwa-install-prompt-dismissed'));
    console.log('Service Worker:', 'serviceWorker' in navigator ? 'Supported' : 'Not supported');
    console.log('Is Standalone:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('User Agent:', navigator.userAgent);
    console.log('BeforeInstallPrompt available:', !!beforeInstallPrompt);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('Service Worker registrations:', registrations);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">PWA Debug Console</h1>
          
          <div className="grid gap-6">
            {/* Status Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">PWA Status</h2>
              <div className="space-y-2 text-sm">
                {isClient ? (
                  <>
                    <div className="flex justify-between">
                      <span>Install Prompt Dismissed:</span>
                      <span className={`font-mono ${installPromptDismissed ? 'text-red-600' : 'text-green-600'}`}>
                        {installPromptDismissed || 'false'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Installable:</span>
                      <span className={`font-mono ${isInstallable ? 'text-green-600' : 'text-red-600'}`}>
                        {isInstallable ? 'true' : 'false'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Worker:</span>
                      <span className={`font-mono ${'serviceWorker' in navigator ? 'text-green-600' : 'text-red-600'}`}>
                        {'serviceWorker' in navigator ? 'Supported' : 'Not supported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Standalone Mode:</span>
                      <span className={`font-mono ${window.matchMedia('(display-mode: standalone)').matches ? 'text-green-600' : 'text-orange-600'}`}>
                        {window.matchMedia('(display-mode: standalone)').matches ? 'true' : 'false'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                    <span>Loading client-side data...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={clearLocalStorage}
                disabled={!isClient}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isClient
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Clear localStorage & Reload
              </button>
              
              <button
                onClick={forceInstallPrompt}
                disabled={!isInstallable || !isClient}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isInstallable && isClient
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Force Install Prompt
              </button>
              
              <button
                onClick={checkPWAStatus}
                disabled={!isClient}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isClient
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Log Debug Info
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-yellow-900 mb-4">Troubleshooting Steps</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                <li>Open Chrome DevTools (F12) and check the Console for errors</li>
                <li>Go to Application tab → Service Workers to verify registration</li>
                <li>Check Application tab → Manifest to ensure manifest.json is loaded</li>
                <li>Verify you're using Chrome/Edge (Firefox doesn't support install prompts well)</li>
                <li>Make sure you're not in Incognito mode</li>
                <li>The install prompt may only show after meeting PWA criteria</li>
                <li>Try clicking "Clear localStorage & Reload" to reset the prompt</li>
              </ol>
            </div>

            {/* Browser Requirements */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-4">PWA Install Requirements</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-green-800">
                <li>Valid manifest.json with required fields</li>
                <li>Service worker registered and active</li>
                <li>HTTPS (localhost is treated as secure)</li>
                <li>User engagement (may require multiple visits)</li>
                <li>Compatible browser (Chrome, Edge, Safari on iOS)</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              Use the browser console (F12) to see detailed PWA debug information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}