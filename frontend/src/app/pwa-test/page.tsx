'use client';

import React, { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { 
  DevicePhoneMobileIcon,
  WifiIcon,
  BellIcon,
  ArrowPathIcon,
  ShareIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';

export default function PWATestPage() {
  const pwa = usePWA();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testNotification = async () => {
    if (pwa.notifications.permission !== 'granted') {
      const permission = await pwa.notifications.requestPermission();
      addTestResult(`Notification permission: ${permission}`);
    }
    
    if (pwa.notifications.permission === 'granted') {
      await pwa.notifications.showNotification('DrSync Test', {
        body: 'This is a test notification from DrSync PWA!',
        icon: '/icons/icon-192x192.png'
      });
      addTestResult('Test notification sent');
    }
  };

  const testOfflineAction = () => {
    pwa.offline.queueAction('test_action', { 
      message: 'Test offline action',
      timestamp: Date.now()
    });
    addTestResult('Offline action queued');
  };

  const testShare = async () => {
    const success = await pwa.sharing.share({
      title: 'DrSync PWA Test',
      text: 'Testing the DrSync Progressive Web App functionality!',
      url: window.location.href
    });
    addTestResult(`Share ${success ? 'successful' : 'failed'}`);
  };

  const testCache = async () => {
    const testData = { test: 'data', timestamp: Date.now() };
    const cacheSuccess = await pwa.cache.cacheData('/test-url', testData);
    addTestResult(`Cache operation: ${cacheSuccess ? 'success' : 'failed'}`);
    
    if (cacheSuccess) {
      const cachedData = await pwa.cache.getCachedData('/test-url');
      addTestResult(`Retrieved cached data: ${cachedData ? 'success' : 'failed'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Navigation */}
          <div className="mb-6">
            <a 
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              ← Back to Main Page
            </a>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🏥 DrSync PWA Test Page
          </h1>

          {/* PWA Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <DevicePhoneMobileIcon className="icon-small text-blue-600 mr-2" />
                <h3 className="font-medium text-blue-900">Installation</h3>
              </div>
              <p className="text-sm text-blue-700 mb-2">
                Installable: {pwa.capabilities.isInstallable ? '✅' : '❌'}
              </p>
              <p className="text-sm text-blue-700">
                Installed: {pwa.capabilities.isInstalled ? '✅' : '❌'}
              </p>
              {pwa.install.isInstallable && !pwa.install.isInstalled && (
                <button
                  onClick={pwa.install.install}
                  disabled={pwa.install.isInstalling}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {pwa.install.isInstalling ? 'Installing...' : 'Install App'}
                </button>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <WifiIcon className="icon-small text-green-600 mr-2" />
                <h3 className="font-medium text-green-900">Connection</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">
                Online: {pwa.online.isOnline ? '✅' : '❌'}
              </p>
              <p className="text-sm text-green-700">
                Was Offline: {pwa.online.wasOffline ? '✅' : '❌'}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <BellIcon className="icon-small text-purple-600 mr-2" />
                <h3 className="font-medium text-purple-900">Notifications</h3>
              </div>
              <p className="text-sm text-purple-700 mb-2">
                Supported: {pwa.capabilities.canReceiveNotifications ? '✅' : '❌'}
              </p>
              <p className="text-sm text-purple-700">
                Permission: {pwa.notifications.permission}
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <CloudArrowDownIcon className="icon-small text-yellow-600 mr-2" />
                <h3 className="font-medium text-yellow-900">Updates</h3>
              </div>
              <p className="text-sm text-yellow-700 mb-2">
                Available: {pwa.updates.updateAvailable ? '✅' : '❌'}
              </p>
              <p className="text-sm text-yellow-700">
                Updating: {pwa.updates.isUpdating ? '✅' : '❌'}
              </p>
              {pwa.updates.updateAvailable && (
                <button
                  onClick={pwa.updates.applyUpdate}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Apply Update
                </button>
              )}
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <ArrowPathIcon className="icon-small text-red-600 mr-2" />
                <h3 className="font-medium text-red-900">Offline Queue</h3>
              </div>
              <p className="text-sm text-red-700 mb-2">
                Queued Actions: {pwa.offline.queuedActions}
              </p>
              <p className="text-sm text-red-700">
                Online: {pwa.offline.isOnline ? '✅' : '❌'}
              </p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <ShareIcon className="icon-small text-indigo-600 mr-2" />
                <h3 className="font-medium text-indigo-900">Sharing</h3>
              </div>
              <p className="text-sm text-indigo-700 mb-2">
                Supported: {pwa.sharing.shareSupported ? '✅' : '❌'}
              </p>
              <p className="text-sm text-indigo-700">
                Sharing: {pwa.sharing.isSharing ? '✅' : '❌'}
              </p>
            </div>
          </div>

          {/* Test Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">PWA Feature Tests</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testNotification}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Test Notifications
              </button>
              
              <button
                onClick={testOfflineAction}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Test Offline Queue
              </button>
              
              <button
                onClick={testShare}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Test Sharing
              </button>
              
              <button
                onClick={testCache}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Test Caching
              </button>

              <button
                onClick={() => {
                  if (pwa.offline.queuedActions > 0) {
                    pwa.offline.clearQueue();
                    addTestResult('Offline queue cleared');
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Queue
              </button>

              <button
                onClick={() => setTestResults([])}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Clear Results
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-3">Test Results</h3>
            <div className="max-h-60 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 italic">No test results yet. Try running some tests above.</p>
              ) : (
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono bg-white p-2 rounded border-l-4 border-blue-500">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Testing Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Open this page in Chrome/Edge on desktop to see install prompt</li>
              <li>• Try going offline to test offline functionality</li>
              <li>• Install the app and test it in standalone mode</li>
              <li>• Test notifications (requires permission)</li>
              <li>• Test sharing on mobile devices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}