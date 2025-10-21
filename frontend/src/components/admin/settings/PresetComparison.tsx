/**
 * Preset Comparison Component - TASK-040A Phase 2
 * 
 * Displays side-by-side comparison of all preset modes showing costs,
 * savings opportunities, and feature differences to help administrators
 * make informed decisions about their notification strategy.
 * 
 * @version 1.0
 * @date October 20, 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, ScaleIcon } from '@heroicons/react/24/outline';
import notificationSettingsService, { PresetComparison as PresetComparisonData } from '@/services/notificationSettingsService';

interface PresetComparisonProps {
  organizationId: string;
  appointments?: number;
}

export default function PresetComparison({
  organizationId,
  appointments = 800,
}: PresetComparisonProps) {
  const [comparison, setComparison] = useState<PresetComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [organizationId]);

  const loadComparison = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationSettingsService.comparePresets(organizationId, appointments);
      setComparison(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (current: number, other: number) => {
    if (current === 0) return 'N/A';
    const diff = ((other - current) / current) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const presets = [
    {
      id: 'budget',
      name: 'Budget',
      data: comparison.budget,
      color: 'green',
      isCurrent: comparison.current.mode === 'BUDGET',
    },
    {
      id: 'recommended',
      name: 'Recommended',
      data: comparison.recommended,
      color: 'blue',
      isCurrent: comparison.current.mode === 'RECOMMENDED',
    },
    {
      id: 'premium',
      name: 'Premium',
      data: comparison.premium,
      color: 'purple',
      isCurrent: comparison.current.mode === 'PREMIUM',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <ScaleIcon className="h-5 w-5 mr-2 text-blue-600" />
          Preset Comparison
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Compare costs and features across all preset modes
          {comparison.current.mode === 'CUSTOM' && (
            <span className="ml-1 text-blue-600 font-medium">(Currently using custom settings)</span>
          )}
        </p>
      </div>

      {/* Current Mode Card */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-900">Your Current Configuration</h4>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              {formatCurrency(comparison.current.cost)}/month
            </p>
            <p className="mt-1 text-sm text-blue-600">
              {(comparison.current.messages || 0).toLocaleString()} messages • {comparison.current.mode} mode
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {presets.map((preset) => {
          const savings = preset.data.savings || 0;
          const additionalCost = preset.data.additionalCost || 0;
          const hasSavings = savings > 0;
          const hasAdditionalCost = additionalCost > 0;
          
          return (
            <div
              key={preset.id}
              className={`
                relative border-2 rounded-lg p-4 transition-all
                ${preset.isCurrent 
                  ? `border-${preset.color}-500 bg-${preset.color}-50` 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              {/* Current Badge */}
              {preset.isCurrent && (
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${preset.color}-100 text-${preset.color}-800`}>
                    Current
                  </span>
                </div>
              )}

              {/* Preset Name */}
              <h4 className="text-base font-semibold text-gray-900 mb-3">
                {preset.name}
              </h4>

              {/* Cost */}
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(preset.data.cost)}
                </div>
                <div className="text-xs text-gray-500">
                  {(preset.data.messages || 0).toLocaleString()} messages
                </div>
              </div>

              {/* Savings or Additional Cost */}
              {!preset.isCurrent && (
                <div className="space-y-2">
                  {hasSavings && (
                    <div className="flex items-center text-green-600">
                      <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">
                        Save {formatCurrency(savings)}
                      </span>
                    </div>
                  )}
                  
                  {hasAdditionalCost && (
                    <div className="flex items-center text-orange-600">
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">
                        +{formatCurrency(additionalCost)}
                      </span>
                    </div>
                  )}

                  {/* Percentage Change */}
                  <div className="text-xs text-gray-500">
                    {formatPercentage(comparison.current.cost, preset.data.cost)} vs. current
                  </div>
                </div>
              )}

              {/* Equal Cost Indicator */}
              {!preset.isCurrent && !hasSavings && !hasAdditionalCost && (
                <div className="text-sm text-gray-500">
                  Similar cost to current
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {comparison.current.mode !== 'BUDGET' && comparison.budget.savings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <ArrowTrendingDownIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-900">Cost Savings Opportunity</h4>
              <p className="mt-1 text-sm text-green-700">
                Switching to Budget mode could save you <strong>{formatCurrency(comparison.budget.savings)}</strong> per month
                ({formatPercentage(comparison.current.cost, comparison.budget.cost)} reduction).
                This includes only essential appointment reminders.
              </p>
            </div>
          </div>
        </div>
      )}

      {comparison.current.mode === 'BUDGET' && comparison.recommended.additionalCost > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Upgrade Opportunity</h4>
              <p className="mt-1 text-sm text-blue-700">
                For just <strong>{formatCurrency(comparison.recommended.additionalCost)}</strong> more per month
                ({formatPercentage(comparison.current.cost, comparison.recommended.cost)} increase),
                you can upgrade to Recommended mode with booking confirmations and rescheduling notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 text-center">
        Based on {appointments.toLocaleString()} monthly appointments • Costs are estimates
      </div>
    </div>
  );
}
