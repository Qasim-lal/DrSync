/**
 * Cost Analytics Panel - TASK-040C
 *
 * Displays tracked monthly messaging spend using the existing message cost
 * tracking service through notification settings APIs.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  InboxIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import notificationSettingsService, {
  MonthlyCostSummary,
} from '@/services/notificationSettingsService';

interface CostAnalyticsPanelProps {
  organizationId: string;
}

export default function CostAnalyticsPanel({ organizationId }: CostAnalyticsPanelProps) {
  const [summary, setSummary] = useState<MonthlyCostSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationSettingsService.getCostSummary(organizationId);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={loadSummary}
          className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="flex items-center text-lg font-medium text-gray-900">
            <ChartBarIcon className="mr-2 h-5 w-5 text-blue-600" />
            Cost Analytics
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Monthly tracking will appear after the first message is processed.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <InboxIcon className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-700">No tracked messaging costs yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Simulator or live message sends will populate this dashboard.
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Messages Sent',
      value: summary.totalMessagesSent.toLocaleString(),
      icon: ChartBarIcon,
      iconClassName: 'text-blue-500',
    },
    {
      label: 'Estimated Cost',
      value: formatCurrency(summary.estimatedCost),
      icon: CurrencyDollarIcon,
      iconClassName: 'text-purple-500',
    },
    {
      label: 'Messages Saved',
      value: summary.messagesSavedBySettings.toLocaleString(),
      icon: ShieldCheckIcon,
      iconClassName: 'text-green-500',
    },
    {
      label: 'Cost Saved',
      value: formatCurrency(summary.costSaved),
      icon: CurrencyDollarIcon,
      iconClassName: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center text-lg font-medium text-gray-900">
          <ChartBarIcon className="mr-2 h-5 w-5 text-blue-600" />
          Cost Analytics
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Tracked messaging spend for {summary.periodMonth}/{summary.periodYear}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.iconClassName}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h4 className="text-sm font-medium text-gray-900">Breakdown by Message Type</h4>
        </div>
        {summary.breakdown.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No message-type breakdown yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Count
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {summary.breakdown.map((item) => (
                  <tr key={item.messageType}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.messageType}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(item.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
