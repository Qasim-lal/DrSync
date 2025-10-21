/**
 * Spending Cap Configuration Component - TASK-040A Phase 2
 * 
 * Interface for managing monthly spending limits with visual indicators,
 * alert thresholds, and usage tracking. Helps organizations control
 * messaging costs and avoid unexpected expenses.
 * 
 * @version 1.0
 * @date October 20, 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, BellAlertIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import notificationSettingsService from '@/services/notificationSettingsService';

interface SpendingCapConfigProps {
  organizationId: string;
  currentCap?: number | null;
  currentSpend?: number;
  alertThreshold?: number;
  onUpdate?: () => void;
}

export default function SpendingCapConfig({
  organizationId,
  currentCap: initialCap = null,
  currentSpend: initialSpend = 0,
  alertThreshold: initialThreshold = 80,
  onUpdate,
}: SpendingCapConfigProps) {
  const [monthlyCap, setMonthlyCap] = useState<string>(initialCap?.toString() || '');
  const [alertThreshold, setAlertThreshold] = useState<number>(initialThreshold);
  const [currentSpend] = useState<number>(initialSpend);
  const [isCapEnabled, setIsCapEnabled] = useState<boolean>(!!initialCap);
  const [isSaving, setIsSaving] = useState(false);

  const percentageUsed = monthlyCap && parseFloat(monthlyCap) > 0
    ? (currentSpend / parseFloat(monthlyCap)) * 100
    : 0;

  const isNearCap = percentageUsed >= alertThreshold;
  const isOverCap = percentageUsed >= 100;

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const capValue = isCapEnabled && monthlyCap ? parseFloat(monthlyCap) : null;

      if (isCapEnabled && (!capValue || capValue <= 0)) {
        toast.error('Please enter a valid spending cap amount');
        return;
      }

      await notificationSettingsService.updateSettings(organizationId, {
        monthlyCap: capValue,
        alertThreshold,
      });

      toast.success('Spending cap settings updated successfully');
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update spending cap');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getProgressBarColor = () => {
    if (isOverCap) return 'bg-red-600';
    if (isNearCap) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (isOverCap) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
    if (isNearCap) {
      return <BellAlertIcon className="h-5 w-5 text-orange-500" />;
    }
    return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (isOverCap) {
      return 'Spending cap exceeded - messages may be blocked';
    }
    if (isNearCap) {
      return `Approaching spending cap (${percentageUsed.toFixed(1)}% used)`;
    }
    return 'Spending within limits';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Spending Cap Configuration</h3>
        <p className="mt-1 text-sm text-gray-500">
          Set monthly spending limits and configure alerts to control messaging costs
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Enable Spending Cap</h4>
          <p className="text-xs text-gray-500">Limit your monthly messaging expenses</p>
        </div>
        <button
          onClick={() => setIsCapEnabled(!isCapEnabled)}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isCapEnabled ? 'bg-blue-600' : 'bg-gray-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
              transition duration-200 ease-in-out
              ${isCapEnabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Configuration Form */}
      {isCapEnabled && (
        <div className="space-y-4">
          {/* Monthly Cap Input */}
          <div>
            <label htmlFor="monthlyCap" className="block text-sm font-medium text-gray-700">
              Monthly Spending Cap (PKR)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">PKR</span>
              </div>
              <input
                type="number"
                id="monthlyCap"
                min="0"
                step="100"
                value={monthlyCap}
                onChange={(e) => setMonthlyCap(e.target.value)}
                className="block w-full pl-12 pr-12 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter maximum monthly spend"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Messages will be blocked or limited when this cap is reached
            </p>
          </div>

          {/* Alert Threshold Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="alertThreshold" className="block text-sm font-medium text-gray-700">
                Alert Threshold
              </label>
              <span className="text-sm font-semibold text-blue-600">{alertThreshold}%</span>
            </div>
            <input
              type="range"
              id="alertThreshold"
              min="50"
              max="95"
              step="5"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50%</span>
              <span>95%</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              You'll receive warnings when spending reaches this percentage of your cap
            </p>
          </div>

          {/* Current Usage Display */}
          {monthlyCap && parseFloat(monthlyCap) > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon()}
                  <span className="text-sm font-medium text-gray-900">Current Month Usage</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {percentageUsed.toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                  style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                />
              </div>

              {/* Spend Details */}
              <div className="flex justify-between text-xs text-gray-600">
                <span>{formatCurrency(currentSpend)} spent</span>
                <span>{formatCurrency(parseFloat(monthlyCap))} cap</span>
              </div>

              {/* Status Message */}
              <div className={`
                mt-3 p-2 rounded text-xs font-medium
                ${isOverCap ? 'bg-red-50 text-red-700' : ''}
                ${isNearCap && !isOverCap ? 'bg-orange-50 text-orange-700' : ''}
                ${!isNearCap && !isOverCap ? 'bg-green-50 text-green-700' : ''}
              `}>
                {getStatusText()}
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Spending Cap Settings'}
          </button>
        </div>
      )}

      {/* Disabled State Info */}
      {!isCapEnabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Spending cap is currently disabled.</strong> Enable it to set monthly limits and receive alerts
            when approaching your budget. This helps prevent unexpected messaging costs.
          </p>
        </div>
      )}

      {/* Warning Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-yellow-900">Important</h4>
            <p className="mt-1 text-xs text-yellow-700">
              When the spending cap is reached, new messages may be blocked to prevent exceeding your budget.
              Critical notifications (like appointment reminders) may still be sent based on your configuration.
              Monitor your usage regularly to avoid service interruptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
