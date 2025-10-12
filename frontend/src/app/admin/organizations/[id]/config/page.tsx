'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, LoadingSpinner } from '@/components/shared';
import { useOrganization, useOrganizationConfig } from '@/lib/hooks';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function OrganizationConfigPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { organization, isLoading: orgLoading } = useOrganization(id);
  const { config, isLoading: configLoading } = useOrganizationConfig(id);

  if (orgLoading || configLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!organization || !config) {
    return (
      <div className="rounded-lg bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Configuration not found
        </h2>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const ConnectionStatus = ({ status }: { status?: string }) => {
    if (status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
          <CheckCircleIcon className="h-4 w-4" />
          Connected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
        <XCircleIcon className="h-4 w-4" />
        {status || 'Not configured'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configuration - {organization.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage organization configuration
          </p>
        </div>
      </div>

      {/* WhatsApp Configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            WhatsApp Integration
          </h2>
          <ConnectionStatus status={config.whatsapp?.status} />
        </div>

        {config.whatsapp?.enabled ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Phone Number ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.whatsapp.phoneNumberId || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Business Account ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.whatsapp.businessAccountId || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Last Tested
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.whatsapp.lastTestedAt
                  ? new Date(config.whatsapp.lastTestedAt).toLocaleString()
                  : 'Never tested'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">WhatsApp is not enabled</p>
        )}
      </div>

      {/* Google Sheets Configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Google Sheets Integration
          </h2>
          <ConnectionStatus status={config.googleSheets?.status} />
        </div>

        {config.googleSheets?.enabled ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Spreadsheet ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.googleSheets.spreadsheetId || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Service Account Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.googleSheets.serviceAccountEmail || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Sync Frequency
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.googleSheets.syncFrequency || 'manual'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Last Synced
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.googleSheets.lastSyncAt
                  ? new Date(config.googleSheets.lastSyncAt).toLocaleString()
                  : 'Never synced'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">
            Google Sheets is not enabled
          </p>
        )}
      </div>

      {/* Billing Configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Billing Settings
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Currency</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {config.billing?.currency || 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Timezone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {config.billing?.timezone || 'Not set'}
            </dd>
          </div>
          {config.billing?.fiscalYearStart && (
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Fiscal Year Start
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.billing.fiscalYearStart}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Features Configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Enabled Features
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {config.features ? (
            <>
              <div className="flex items-center gap-2">
                {config.features.appointments ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-300" />
                )}
                <span className="text-sm text-gray-700">Appointments</span>
              </div>
              <div className="flex items-center gap-2">
                {config.features.billing ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-300" />
                )}
                <span className="text-sm text-gray-700">Billing</span>
              </div>
              <div className="flex items-center gap-2">
                {config.features.analytics ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-300" />
                )}
                <span className="text-sm text-gray-700">Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                {config.features.notifications ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-300" />
                )}
                <span className="text-sm text-gray-700">Notifications</span>
              </div>
            </>
          ) : (
            <p className="col-span-4 text-sm text-gray-500">
              No features configured
            </p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Metadata</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(config.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(config.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
