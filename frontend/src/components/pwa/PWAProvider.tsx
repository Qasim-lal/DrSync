'use client';

import React, { useEffect, useState } from 'react';
import { initializePWA } from '../../utils/pwa';
import PWAInstallPrompt from './PWAInstallPrompt';
import PWAStatusIndicator, { PWAMobileStatusIndicator } from './PWAStatusIndicator';

interface PWAProviderProps {
  children: React.ReactNode;
}

export default function PWAProvider({ children }: PWAProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Initialize PWA functionality when component mounts
    const initPWA = async () => {
      try {
        await initializePWA();
        setIsInitialized(true);
        
        // Show install prompt after a delay if not dismissed before
        const installPromptDismissed = localStorage.getItem('pwa-install-prompt-dismissed');
        if (!installPromptDismissed) {
          setTimeout(() => {
            setShowInstallPrompt(true);
          }, 3000); // Show after 3 seconds
        }
      } catch (error) {
        console.error('[PWA Provider] Initialization failed:', error);
        setIsInitialized(true); // Continue even if PWA features fail
      }
    };

    initPWA();
  }, []);

  const handleInstallPromptDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', 'true');
  };

  return (
    <>
      {children}
      
      {/* PWA Features - only render when initialized */}
      {isInitialized && (
        <>
          {/* Mobile status indicator */}
          <PWAMobileStatusIndicator />
          
          {/* Desktop/tablet status indicator */}
          <PWAStatusIndicator position="bottom-right" />
          
          {/* Install prompt - show after delay and not on mobile install banner */}
          {showInstallPrompt && (
            <div className="fixed bottom-0 left-0 right-0 p-4 z-40 md:bottom-auto md:top-4 md:left-4 md:right-auto md:max-w-md">
              <PWAInstallPrompt 
                onDismiss={handleInstallPromptDismiss}
                className="relative"
              />
            </div>
          )}
        </>
      )}
    </>
  );
}