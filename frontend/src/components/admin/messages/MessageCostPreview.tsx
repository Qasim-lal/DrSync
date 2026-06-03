/**
 * Message Cost Preview Component - TASK-040A Phase 3
 * 
 * Displays estimated cost information before sending messages.
 * Shows cost per message, total cost, impact on monthly budget,
 * and warnings if approaching or exceeding spending cap.
 * 
 * @version 1.0
 * @date October 20, 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import notificationSettingsService from '@/services/notificationSettingsService';

interface CostEstimate {
  costPerMessage: number;
  totalCost: number;
  currentSpend: number;
  monthlyCap: number | null;
  percentageUsed: number;
  willExceedCap: boolean;
  remainingBudget: number | null;
}

interface MessageCostPreviewProps {
  organizationId: string;
  recipientCount: number;
  messageType?: string;
  onCostCalculated?: (estimate: CostEstimate) => void;
  compact?: boolean;
}

export default function MessageCostPreview({
  organizationId,
  recipientCount,
  messageType = 'reminder',
  onCostCalculated,
  compact = false,
}: MessageCostPreviewProps) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recipientCount > 0) {
      calculateCost();
    }
  }, [recipientCount, organizationId]);

  const calculateCost = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const costData = await notificationSettingsService.estimateMessageCost(
        organizationId,
        recipientCount,
        messageType
      );

      setEstimate(costData);

      if (onCostCalculated) {
        onCostCalculated(costData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to estimate cost');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Calculating cost...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 flex items-center space-x-1">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  const isOverCap = estimate.willExceedCap;
  const isNearCap = estimate.monthlyCap && estimate.percentageUsed >= 80 && !isOverCap;
  const isHealthy = !isOverCap && !isNearCap;

  // Compact view for inline display
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          {formatCurrency(estimate.totalCost)}
        </span>
        {isOverCap && (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" title="Exceeds spending cap" />
        )}
        {isNearCap && (
          <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" title="Approaching spending cap" />
        )}
      </div>
    );
  }

  // Full view for message composition
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`
        px-4 py-3 border-b
        ${isOverCap ? 'bg-red-50 border-red-200' : ''}
        ${isNearCap ? 'bg-orange-50 border-orange-200' : ''}
        ${isHealthy ? 'bg-gray-50 border-gray-200' : ''}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className={`
              h-5 w-5
              ${isOverCap ? 'text-red-600' : ''}
              ${isNearCap ? 'text-orange-600' : ''}
              ${isHealthy ? 'text-gray-600' : ''}
            `} />
            <h4 className="text-sm font-medium text-gray-900">Cost Estimate</h4>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(estimate.totalCost)}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Recipients:</span>
          <span className="font-medium text-gray-900">{recipientCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Cost per message:</span>
          <span className="font-medium text-gray-900">{formatCurrency(estimate.costPerMessage)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total cost:</span>
          <span className="font-bold text-gray-900">{formatCurrency(estimate.totalCost)}</span>
        </div>

        {estimate.monthlyCap !== null && (
          <>
            <div className="border-t border-gray-200 my-2"></div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current month spend:</span>
              <span className="font-medium text-gray-900">{formatCurrency(estimate.currentSpend)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monthly cap:</span>
              <span className="font-medium text-gray-900">{formatCurrency(estimate.monthlyCap)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining budget:</span>
              <span className={`font-medium ${estimate.remainingBudget && estimate.remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {estimate.remainingBudget !== null ? formatCurrency(estimate.remainingBudget) : 'Unlimited'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Budget Usage</span>
                <span>{estimate.percentageUsed.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isOverCap ? 'bg-red-600' : isNearCap ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(estimate.percentageUsed, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status Messages */}
      {isOverCap && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-red-900">Spending Cap Exceeded</h5>
              <p className="text-xs text-red-700 mt-1">
                Sending these messages will exceed your monthly spending cap by{' '}
                <strong>{formatCurrency(Math.abs(estimate.remainingBudget || 0))}</strong>.
                Messages may be blocked or you need to increase your cap.
              </p>
            </div>
          </div>
        </div>
      )}

      {isNearCap && !isOverCap && (
        <div className="px-4 py-3 bg-orange-50 border-t border-orange-200">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-orange-900">Approaching Spending Cap</h5>
              <p className="text-xs text-orange-700 mt-1">
                You're using {estimate.percentageUsed.toFixed(1)}% of your monthly budget. Consider monitoring
                your messaging costs to avoid exceeding your cap.
              </p>
            </div>
          </div>
        </div>
      )}

      {isHealthy && estimate.monthlyCap !== null && (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200">
          <div className="flex items-start space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-green-900">Within Budget</h5>
              <p className="text-xs text-green-700 mt-1">
                You have <strong>{formatCurrency(estimate.remainingBudget || 0)}</strong> remaining in your
                monthly budget.
              </p>
            </div>
          </div>
        </div>
      )}

      {!estimate.monthlyCap && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-700">
                No spending cap configured. Set a monthly cap in settings to monitor and control messaging costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
