/**
 * Notification Settings Admin Page - TASK-040A Phase 2
 * 
 * Test page for Phase 2 notification settings components:
 * - PresetSelector
 * - CostCalculator
 * - PresetComparison
 * - SpendingCapConfig
 * 
 * @version 1.0
 * @date October 21, 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import PresetSelector from '@/components/admin/settings/PresetSelector';
import CostCalculator from '@/components/admin/settings/CostCalculator';
import PresetComparison from '@/components/admin/settings/PresetComparison';
import SpendingCapConfig from '@/components/admin/settings/SpendingCapConfig';
import notificationSettingsService from '@/services/notificationSettingsService';

export default function NotificationSettingsPage() {
  const [organizationId, setOrganizationId] = useState<string>('test-org-phase2-settings');
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [organizationId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationSettingsService.getSettings(organizationId);
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetChange = () => {
    loadSettings(); // Reload settings after preset change
  };

  const handleSettingsUpdate = () => {
    loadSettings(); // Reload settings after update
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            WhatsApp Notification Settings
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your notification preferences and control messaging costs
          </p>
          
          {/* Organization Selector for Testing */}
          <div className="mt-4 max-w-md">
            <label htmlFor="orgId" className="block text-sm font-medium text-gray-700 mb-1">
              Test Organization ID:
            </label>
            <input
              type="text"
              id="orgId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter organization ID"
            />
            <p className="mt-1 text-xs text-gray-500">
              Default: test-org-dr-demo (from test data)
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Settings</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={loadSettings}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Components */}
        {!isLoading && settings && (
          <div className="space-y-8">
            {/* Preset Selector */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <PresetSelector
                organizationId={organizationId}
                currentPreset={settings.presetMode}
                onPresetChange={handlePresetChange}
              />
            </div>

            {/* Cost Calculator */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <CostCalculator
                organizationId={organizationId}
                defaultAppointments={settings.averageMonthlyAppointments || 800}
              />
            </div>

            {/* Preset Comparison */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <PresetComparison
                organizationId={organizationId}
                appointments={settings.averageMonthlyAppointments || 800}
              />
            </div>

            {/* Spending Cap Configuration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <SpendingCapConfig
                organizationId={organizationId}
                currentCap={settings.monthlyCap}
                currentSpend={settings.currentMonthSpend}
                alertThreshold={settings.alertThreshold}
                onUpdate={handleSettingsUpdate}
              />
            </div>

            {/* Debug Info */}
            <div className="bg-gray-900 rounded-lg p-6 text-white">
              <h3 className="text-lg font-medium mb-4">Debug Information</h3>
              <div className="space-y-2 text-sm font-mono">
                <div><span className="text-gray-400">Organization ID:</span> {organizationId}</div>
                <div><span className="text-gray-400">Current Preset:</span> {settings.presetMode}</div>
                <div><span className="text-gray-400">Monthly Appointments:</span> {settings.averageMonthlyAppointments || 'Not set'}</div>
                <div><span className="text-gray-400">Cost per Message:</span> PKR {settings.costPerMessage}</div>
                <div><span className="text-gray-400">Monthly Cap:</span> {settings.monthlyCap ? `PKR ${settings.monthlyCap}` : 'Not set'}</div>
                <div><span className="text-gray-400">Current Spend:</span> PKR {settings.currentMonthSpend}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
