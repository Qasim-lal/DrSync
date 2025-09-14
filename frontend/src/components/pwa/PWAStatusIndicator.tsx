'use client';

import React from 'react';
import { 
  WifiIcon, 
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useOnlineStatus, usePWAUpdates, useOfflineWorkflow } from '../../hooks/usePWA';

interface PWAStatusIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showOfflineActions?: boolean;
  className?: string;
}

export default function PWAStatusIndicator({ 
  position = 'bottom-right', 
  showOfflineActions = true,
  className = '' 
}: PWAStatusIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { updateAvailable, isUpdating, applyUpdate } = usePWAUpdates();
  const { queuedActions, clearQueue } = useOfflineWorkflow();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (updateAvailable) return 'bg-yellow-500';
    if (wasOffline) return 'bg-green-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiIcon className="icon-small text-white" />;
    }
    if (updateAvailable) {
      return <CloudArrowDownIcon className="icon-small text-white" />;
    }
    if (wasOffline) {
      return <CheckCircleIcon className="icon-small text-white" />;
    }
    return <WifiIcon className="icon-small text-white" />;
  };

  const getStatusMessage = () => {
    if (!isOnline) return 'Offline Mode';
    if (updateAvailable) return 'Update Available';
    if (wasOffline) return 'Back Online';
    return 'Online';
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <div className="flex flex-col items-end space-y-2">
        {/* Update Available Banner */}
        {updateAvailable && (
          <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
            <CloudArrowDownIcon className="icon-small" />
            <span className="text-sm font-medium">Update Available</span>
            <button
              onClick={applyUpdate}
              disabled={isUpdating}
              className="ml-2 px-2 py-1 bg-white text-yellow-600 rounded text-xs font-medium hover:bg-yellow-50 transition-colors disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
        )}

        {/* Offline Actions Queue */}
        {showOfflineActions && queuedActions > 0 && (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <ArrowPathIcon className="icon-small" />
            <span className="text-sm">
              {queuedActions} action{queuedActions > 1 ? 's' : ''} queued
            </span>
            {isOnline && (
              <button
                onClick={clearQueue}
                className="ml-2 px-2 py-1 bg-white text-blue-600 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Main Status Indicator */}
        <div className="flex items-center space-x-2">
          {/* Status Dot */}
          <div className={`w-8 h-8 ${getStatusColor()} rounded-full flex items-center justify-center shadow-lg`}>
            {getStatusIcon()}
          </div>
          
          {/* Status Text (shown on hover) */}
          <div className="group relative">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg">
              {getStatusMessage()}
              
              {/* Connection Details */}
              <div className="mt-1 pt-1 border-t border-gray-700 text-xs text-gray-300">
                {!isOnline && (
                  <div className="space-y-1">
                    <div>📱 Offline mode active</div>
                    <div>💾 Using cached data</div>
                    {queuedActions > 0 && (
                      <div>⏳ {queuedActions} actions queued</div>
                    )}
                  </div>
                )}
                
                {isOnline && wasOffline && (
                  <div className="space-y-1">
                    <div>🔄 Syncing data...</div>
                    <div>✅ Connection restored</div>
                  </div>
                )}
                
                {updateAvailable && (
                  <div className="space-y-1">
                    <div>📦 New version available</div>
                    <div>🚀 Click to update</div>
                  </div>
                )}
              </div>
              
              {/* Tooltip Arrow */}
              <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified status indicator for mobile
export function PWAMobileStatusIndicator() {
  const { isOnline } = useOnlineStatus();
  const { queuedActions } = useOfflineWorkflow();
  
  if (isOnline && queuedActions === 0) {
    return null; // Don't show when everything is normal
  }

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        {!isOnline ? (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>Offline - Using cached data</span>
          </>
        ) : queuedActions > 0 ? (
          <>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Syncing {queuedActions} actions...</span>
          </>
        ) : null}
      </div>
    </div>
  );
}