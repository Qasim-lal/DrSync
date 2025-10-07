'use client';

import React, { useState, useEffect } from 'react';
import { WizardStepProps } from '../../../../../components/wizard/WizardContainer';

export function SyncActivationStep({ data, onDataChange, onValidationChange }: WizardStepProps) {
  const [syncEnabled, setSyncEnabled] = useState(data.syncEnabled ?? true);
  const [syncInterval, setSyncInterval] = useState(data.syncInterval || 300); // 5 minutes default
  const [autoSync, setAutoSync] = useState(data.autoSync ?? true);
  const [notifyOnSync, setNotifyOnSync] = useState(data.notifyOnSync ?? false);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState('');

  const handleActivateSync = async () => {
    if (!data.selectedSheetId) {
      setError('No sheet selected');
      return;
    }

    setActivating(true);
    setError('');

    try {
      const response = await fetch('/api/configuration/google-sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          sheetId: data.selectedSheetId,
          syncEnabled,
          syncInterval,
          autoSync,
          notifyOnSync,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setActivated(true);
        onDataChange({
          syncEnabled,
          syncInterval,
          autoSync,
          notifyOnSync,
          syncActivated: true,
        });
      } else {
        setError(result.data.errors?.[0] || 'Failed to activate sync');
      }
    } catch (err: any) {
      setError('Error activating sync: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  // Update parent data when settings change
  useEffect(() => {
    onDataChange({
      syncEnabled,
      syncInterval,
      autoSync,
      notifyOnSync,
      syncActivated: activated,
    });
  }, [syncEnabled, syncInterval, autoSync, notifyOnSync, activated]);

  // Validation
  useEffect(() => {
    const errors = [];
    const warnings = [];

    if (!data.selectedSheetId) {
      errors.push('No sheet selected');
    }

    if (!data.structureConfigured) {
      errors.push('Sheet structure not configured');
    }

    if (!data.permissionsVerified) {
      errors.push('Permissions not verified');
    }

    if (!data.operationsTested) {
      errors.push('Operations not tested');
    }

    if (syncInterval < 60) {
      warnings.push('Sync interval is very short (less than 1 minute)');
    }

    if (!syncEnabled) {
      warnings.push('Sync is disabled. You will need to sync data manually.');
    }

    onValidationChange({
      isValid: errors.length === 0 && activated,
      errors,
      warnings,
    });
  }, [syncEnabled, syncInterval, activated, data, onValidationChange]);

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-green-900">Activate Sync Service</h3>
        <p className="text-sm text-green-800 mt-2">
          Configure and activate the synchronization service to keep your Google Sheet up to date.
        </p>
      </div>

      {/* Prerequisites Check */}
      {(!data.structureConfigured || !data.permissionsVerified || !data.operationsTested) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-900">Prerequisites Required</h4>
              <p className="text-sm text-yellow-800 mt-1">
                Please complete all previous steps before activating sync.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Sync Settings</h4>

        {/* Enable Sync Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <div>
            <label className="text-sm font-medium text-gray-700">Enable Automatic Sync</label>
            <p className="text-xs text-gray-500 mt-1">Automatically sync data with Google Sheets</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <div>
            <label className="text-sm font-medium text-gray-700">Auto-Sync on Changes</label>
            <p className="text-xs text-gray-500 mt-1">Sync immediately when data changes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              disabled={!syncEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Notify on Sync Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <div>
            <label className="text-sm font-medium text-gray-700">Notifications</label>
            <p className="text-xs text-gray-500 mt-1">Get notified when sync completes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnSync}
              onChange={(e) => setNotifyOnSync(e.target.checked)}
              disabled={!syncEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Sync Interval */}
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sync Interval: <span className="text-green-600 font-semibold">{formatInterval(syncInterval)}</span>
          </label>
          <input
            type="range"
            min="60"
            max="3600"
            step="60"
            value={syncInterval}
            onChange={(e) => setSyncInterval(Number(e.target.value))}
            disabled={!syncEnabled || autoSync}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 min</span>
            <span>30 min</span>
            <span>1 hour</span>
          </div>
          {autoSync && (
            <p className="text-xs text-blue-600 mt-2">
              Auto-sync is enabled. Interval setting is ignored.
            </p>
          )}
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Configuration Summary</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <div className="flex justify-between">
            <span>Sheet:</span>
            <span className="font-medium">{data.sheetUrl ? 'Selected' : 'Not selected'}</span>
          </div>
          <div className="flex justify-between">
            <span>Structure:</span>
            <span className="font-medium">{data.structureConfigured ? '✓ Configured' : '✗ Not configured'}</span>
          </div>
          <div className="flex justify-between">
            <span>Permissions:</span>
            <span className="font-medium">{data.permissionsVerified ? '✓ Verified' : '✗ Not verified'}</span>
          </div>
          <div className="flex justify-between">
            <span>Operations:</span>
            <span className="font-medium">{data.operationsTested ? '✓ Tested' : '✗ Not tested'}</span>
          </div>
          <div className="flex justify-between">
            <span>Sync Status:</span>
            <span className="font-medium">{syncEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Activate Button */}
      <button
        onClick={handleActivateSync}
        disabled={
          activating ||
          activated ||
          !data.structureConfigured ||
          !data.permissionsVerified ||
          !data.operationsTested
        }
        className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {activating ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin icon-small mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Activating Sync...
          </span>
        ) : activated ? (
          <span className="flex items-center justify-center">
            <svg className="icon-small mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sync Activated ✓
          </span>
        ) : (
          'Activate Sync Service'
        )}
      </button>

      {/* Success Message */}
      {activated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-900">Sync Service Activated Successfully!</h4>
              <p className="text-sm text-green-800 mt-1">
                Your Google Sheets integration is now active and ready to use.
                {syncEnabled && autoSync && ' Data will sync automatically when changes occur.'}
                {syncEnabled && !autoSync && ` Data will sync every ${formatInterval(syncInterval)}.`}
                {!syncEnabled && ' Remember to manually sync when needed.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="icon-small text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> After activation, you can modify these settings anytime from
          the integrations settings page. Your Google Sheet will start receiving appointment data
          according to the configured sync schedule.
        </p>
      </div>
    </div>
  );
}
