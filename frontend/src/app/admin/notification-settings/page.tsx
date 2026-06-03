/**
 * Notification Settings Admin Page - TASK-040C
 * 
 * Production page for notification settings components:
 * - PresetSelector
 * - CostCalculator
 * - PresetComparison
 * - SpendingCapConfig
 * - CostAnalyticsPanel
 * 
 * @version 2.0
 * @date June 3, 2026
 */

'use client';

import { useState, useEffect } from 'react';
import PresetSelector from '@/components/admin/settings/PresetSelector';
import CostCalculator from '@/components/admin/settings/CostCalculator';
import PresetComparison from '@/components/admin/settings/PresetComparison';
import SpendingCapConfig from '@/components/admin/settings/SpendingCapConfig';
import CostAnalyticsPanel from '@/components/admin/settings/CostAnalyticsPanel';
import PatientSegmentationPanel from '@/components/admin/settings/PatientSegmentationPanel';
import SmartBundlingPanel from '@/components/admin/settings/SmartBundlingPanel';
import { getLocalUser } from '@/lib/api/dashboard';
import notificationSettingsService from '@/services/notificationSettingsService';

export default function NotificationSettingsPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getLocalUser();
    const resolvedOrganizationId = user?.organizationId;

    if (!resolvedOrganizationId) {
      setError('No organization is associated with the current user session.');
      setIsLoading(false);
      return;
    }

    setOrganizationId(resolvedOrganizationId);
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadSettings(organizationId);
    }
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSettings = async (targetOrganizationId: string = organizationId || '') => {
    if (!targetOrganizationId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationSettingsService.getSettings(targetOrganizationId);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            WhatsApp Notification Settings
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your notification preferences and control messaging costs
          </p>
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
                  onClick={() => loadSettings()}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Components */}
        {!isLoading && settings && organizationId && (
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

            {/* Cost Analytics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <CostAnalyticsPanel organizationId={organizationId} />
            </div>

            {/* Patient Segmentation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <PatientSegmentationPanel organizationId={organizationId} />
            </div>

            {/* Smart Bundling */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <SmartBundlingPanel organizationId={organizationId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
