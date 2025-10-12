'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Button, Modal, StatCard, ErrorMessage } from '@/components/shared';
import { ColumnDef } from '@tanstack/react-table';
import { Trial } from '@/lib/types/billing';
import {
  useTrialsNeedingAction,
  useTrialOverview,
  useTrialAbuseDetection,
  useBillingActions,
} from '@/lib/hooks';
import {
  ArrowLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function TrialsPage() {
  const router = useRouter();
  const { trialsNeedingAction, isLoading, isError, refresh } = useTrialsNeedingAction();
  const { trialOverview, isLoading: overviewLoading, isError: overviewError, refresh: refreshOverview } = useTrialOverview();
  const { abuseDetection } = useTrialAbuseDetection();
  const { extendTrial } = useBillingActions();

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);
  const [extensionDays, setExtensionDays] = useState('7');
  const [extensionReason, setExtensionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExtendClick = (trial: Trial) => {
    setSelectedTrial(trial);
    setShowExtendModal(true);
  };

  const handleExtend = async () => {
    if (!selectedTrial || !extensionDays || !extensionReason.trim()) {
      toast.error('Please provide extension days and reason');
      return;
    }

    setIsProcessing(true);
    try {
      await extendTrial(
        selectedTrial.organizationId,
        parseInt(extensionDays),
        extensionReason
      );
      toast.success(`Trial extended by ${extensionDays} days`);
      setShowExtendModal(false);
      refresh();
    } catch (error) {
      toast.error('Failed to extend trial');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: ColumnDef<Trial>[] = [
    {
      accessorKey: 'organizationName',
      header: 'Organization',
      cell: ({ row }) => (
        <button
          onClick={() =>
            router.push(`/admin/organizations/${row.original.organizationId}`)
          }
          className="text-left hover:underline"
        >
          <div className="flex flex-col">
            <span className="font-medium text-blue-600">
              {row.original.organizationName || 'Unknown'}
            </span>
            <span className="text-sm text-gray-500">
              {row.original.organizationId.slice(0, 8)}...
            </span>
          </div>
        </button>
      ),
    },
    {
      accessorKey: 'daysRemaining',
      header: 'Days Remaining',
      cell: ({ row }) => {
        const days = row.original.daysRemaining;
        const color = days <= 3 ? 'text-red-600' : days <= 7 ? 'text-yellow-600' : 'text-green-600';
        return (
          <span className={`font-semibold ${color}`}>
            {days} {days === 1 ? 'day' : 'days'}
          </span>
        );
      },
    },
    {
      header: 'Usage',
      cell: ({ row }) => {
        const { usage, limits } = row.original;
        const patientPercent = (usage.patients / limits.patients) * 100;
        return (
          <div className="flex flex-col gap-1 text-sm">
            <div>
              Patients: {usage.patients}/{limits.patients} (
              {patientPercent.toFixed(0)}%)
            </div>
            <div className="h-2 w-24 rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${patientPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(patientPercent, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'endsAt',
      header: 'Ends At',
      cell: ({ row }) => {
        const date = new Date(row.original.endsAt);
        return (
          <span className="text-sm text-gray-900">
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleExtendClick(row.original);
          }}
        >
          Extend Trial
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Trial Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor and manage trial subscriptions
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {overviewError ? (
        <ErrorMessage
          title="Failed to load trial statistics"
          message="Unable to load trial overview. Please try again."
          onRetry={refreshOverview}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <StatCard
            title="Active Trials"
            value={trialOverview?.activeTrials || 0}
            icon={<ClockIcon className="h-6 w-6" />}
            loading={overviewLoading}
          />
          <StatCard
            title="Expiring in 7 Days"
            value={trialOverview?.expiringIn7Days || 0}
            subtitle="Needs attention"
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            loading={overviewLoading}
          />
          <StatCard
            title="Conversion Rate"
            value={`${trialOverview?.averageConversionRate?.toFixed(1) || 0}%`}
            subtitle={`${trialOverview?.totalConversions || 0} conversions`}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            loading={overviewLoading}
          />
          <StatCard
            title="Potential Abuse"
            value={abuseDetection?.length || 0}
            subtitle="High risk accounts"
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          />
        </div>
      )}

      {/* Trials Table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Trials Needing Action
        </h2>
        <DataTable
          data={trialsNeedingAction || []}
          columns={columns}
          loading={isLoading}
          emptyStateTitle="No trials need attention"
          emptyStateDescription="All trials are in good standing"
        />
      </div>

      {/* Extend Trial Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title="Extend Trial Period"
        description={`Extend trial for ${selectedTrial?.organizationName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current End Date
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {selectedTrial &&
                new Date(selectedTrial.endsAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Extension Days
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={extensionDays}
              onChange={(e) => setExtensionDays(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason
            </label>
            <textarea
              rows={3}
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Provide a reason for extending the trial..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowExtendModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleExtend}
              loading={isProcessing}
            >
              Extend Trial
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
