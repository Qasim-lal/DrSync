'use client';

import React, { useState } from 'react';
import { 
  DevicePhoneMobileIcon, 
  XMarkIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  WifiIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { usePWAInstall } from '../../hooks/usePWA';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  className?: string;
}

export default function PWAInstallPrompt({ onDismiss, className = '' }: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, isInstalling, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if already installed, not installable, or dismissed
  if (isInstalled || !isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      console.log('PWA installed successfully');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg rounded-lg p-6 ${className}`}>
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-blue-200 hover:text-white transition-colors"
        aria-label="Dismiss install prompt"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>

      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <DevicePhoneMobileIcon className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-2">
            Install DrSync App
          </h3>
          
          <p className="text-blue-100 text-sm mb-4">
            Install DrSync as an app on your device for faster access, offline functionality, 
            and a better healthcare management experience.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <WifiIcon className="w-4 h-4 text-blue-200" />
              <span>Works Offline</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <BellIcon className="w-4 h-4 text-blue-200" />
              <span>Push Notifications</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <SparklesIcon className="w-4 h-4 text-blue-200" />
              <span>App-like Experience</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isInstalling
                  ? 'bg-white/20 cursor-not-allowed'
                  : 'bg-white text-blue-800 hover:bg-blue-50 active:bg-blue-100'
              }`}
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full mr-2"></div>
                  Installing...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Install App
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-lg font-medium text-sm text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-specific styling */}
      <div className="sm:hidden mt-4 pt-4 border-t border-blue-500/30">
        <p className="text-xs text-blue-200 text-center">
          Perfect for mobile healthcare professionals on the go
        </p>
      </div>
    </div>
  );
}