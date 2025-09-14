'use client';

import { useEffect, useState } from 'react';
import { WifiIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Automatically redirect when back online
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    
    // Force refresh to check connection
    if (navigator.onLine) {
      window.location.reload();
    } else {
      // Show feedback that we're still offline
      setTimeout(() => setRetryCount(prev => prev - 1), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-8">
          {isOnline ? (
            <WifiIcon className="w-12 h-12 text-green-600" />
          ) : (
            <div className="relative">
              <WifiIcon className="w-12 h-12 text-gray-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-12 bg-red-500 rotate-45 rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isOnline ? 'Back Online!' : 'You\'re Offline'}
          </h1>
          
          {isOnline ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">
                ✅ Connection restored
              </p>
              <p className="text-gray-600">
                Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-600">
                No internet connection detected. Some features may be limited, 
                but you can still access cached patient data and appointments.
              </p>
              <div className="text-sm text-gray-500 mt-4">
                <p>✅ View cached appointments</p>
                <p>✅ Access patient records</p>
                <p>⏳ WhatsApp messages (will sync when online)</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={handleRetry}
            disabled={retryCount > 0}
            className={`w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white transition-colors ${
              retryCount > 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {retryCount > 0 ? (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                Checking Connection...
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                Try Again
              </>
            )}
          </button>

          {!isOnline && (
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue Offline
            </button>
          )}
        </div>

        {/* Offline Features */}
        {!isOnline && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-3">
              🏥 Available Offline
            </h3>
            <ul className="text-left text-sm text-blue-800 space-y-2">
              <li>• View recent appointments and schedules</li>
              <li>• Access patient contact information</li>
              <li>• Review cached medical notes</li>
              <li>• Browse organization settings</li>
            </ul>
            <p className="text-xs text-blue-700 mt-3">
              Data will automatically sync when connection is restored.
            </p>
          </div>
        )}

        {/* Network Status Indicator */}
        <div className="mt-8 flex items-center justify-center text-sm text-gray-500">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
    </div>
  );
}