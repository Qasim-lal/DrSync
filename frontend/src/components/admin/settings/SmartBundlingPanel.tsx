/**
 * Smart Bundling Panel - TASK-040C
 */

'use client';

import { useState } from 'react';
import { RectangleStackIcon } from '@heroicons/react/24/outline';
import notificationSettingsService, {
  BundleCandidate,
  BundlePlan,
} from '@/services/notificationSettingsService';

interface SmartBundlingPanelProps {
  organizationId: string;
}

const DEFAULT_CANDIDATES: BundleCandidate[] = [
  {
    patientId: 'preview-patient',
    phone: '+923001234567',
    messageType: 'reminder',
    body: 'Reminder: Your appointment is tomorrow at 10:00 AM.',
    scheduledFor: new Date().toISOString(),
  },
  {
    patientId: 'preview-patient',
    phone: '+923001234567',
    messageType: 'followup',
    body: 'Please bring your previous reports for the visit.',
    scheduledFor: new Date().toISOString(),
  },
];

export default function SmartBundlingPanel({ organizationId }: SmartBundlingPanelProps) {
  const [plan, setPlan] = useState<BundlePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlan = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationSettingsService.createBundlePlan(
        organizationId,
        DEFAULT_CANDIDATES,
        false
      );
      setPlan(data);
    } catch (err: any) {
      setError(err.message || 'Failed to create bundle plan');
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center text-lg font-medium text-gray-900">
            <RectangleStackIcon className="mr-2 h-5 w-5 text-blue-600" />
            Smart Bundling
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Preview bundled non-critical messages without sending them.
          </p>
        </div>
        <button
          onClick={createPlan}
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Planning...' : 'Preview Plan'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!plan && !error && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-600">
            Bundle planning uses the existing notification settings cost controls and does not require WhatsApp approval.
          </p>
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Enabled</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{plan.enabled ? 'Yes' : 'No'}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Original</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{plan.originalMessageCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Final</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{plan.finalMessageCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Savings</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {formatCurrency(plan.estimatedSavings)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="text-sm font-medium text-gray-900">Bundle Preview</h4>
            {plan.bundles.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No bundle was created for this preview.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {plan.bundles.map((bundle) => (
                  <div key={`${bundle.patientId}-${bundle.phone}`} className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {bundle.phone} · {bundle.savedMessages} message saved
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                      {bundle.bundledBody}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
