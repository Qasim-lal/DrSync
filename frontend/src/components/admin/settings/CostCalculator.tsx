/**
 * Cost Calculator Component - TASK-040A Phase 2
 * 
 * Displays estimated monthly messaging costs based on appointment count.
 * Shows breakdown by notification type with cost per message and totals.
 * 
 * @version 1.0
 * @date October 20, 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import notificationSettingsService, { CostCalculation } from '@/services/notificationSettingsService';

interface CostCalculatorProps {
  organizationId: string;
  defaultAppointments?: number;
}

export default function CostCalculator({
  organizationId,
  defaultAppointments = 800,
}: CostCalculatorProps) {
  const [appointments, setAppointments] = useState<number>(defaultAppointments);
  const [costData, setCostData] = useState<CostCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculateCost();
  }, [organizationId]);

  const calculateCost = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationSettingsService.calculateCost(organizationId, appointments);
      setCostData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate cost');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppointmentChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setAppointments(num);
    }
  };

  const handleRecalculate = () => {
    calculateCost();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <CurrencyDollarIcon className="h-5 w-5 mr-2 text-blue-600" />
          Monthly Cost Calculator
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Estimate your monthly messaging costs based on appointment volume
        </p>
      </div>

      {/* Input */}
      <div className="flex items-end space-x-4">
        <div className="flex-1">
          <label htmlFor="appointments" className="block text-sm font-medium text-gray-700">
            Monthly Appointments
          </label>
          <input
            type="number"
            id="appointments"
            min="0"
            value={appointments}
            onChange={(e) => handleAppointmentChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter monthly appointment count"
          />
        </div>
        <button
          onClick={handleRecalculate}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {costData && !isLoading && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-700">Total Messages</div>
              <div className="mt-1 text-2xl font-semibold text-blue-900">
                {costData.totalMessages.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-700">Cost per Message</div>
              <div className="mt-1 text-2xl font-semibold text-green-900">
                PKR {costData.costPerMessage.toFixed(2)}
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-700">Estimated Cost</div>
              <div className="mt-1 text-2xl font-semibold text-purple-900">
                PKR {costData.estimatedCost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Cost Breakdown by Notification Type
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notification Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost/Msg
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costData.breakdown.map((item, index) => (
                    <tr key={index} className={!item.enabled ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.type}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            item.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        PKR {(item.costPerMessage || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        PKR {item.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      Total Estimated Cost:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-purple-900 text-right">
                      PKR {costData.estimatedCost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> These are estimated costs based on your current notification settings
              and typical message delivery rates. Actual costs may vary based on message content length,
              delivery status, and carrier charges.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
