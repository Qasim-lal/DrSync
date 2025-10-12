'use client';

import React from 'react';
import { StatCard, ErrorMessage } from '@/components/shared';
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useOrganizationStatistics } from '@/lib/hooks';

export default function AdminDashboard() {
  const { statistics, isLoading, isError, refresh } = useOrganizationStatistics();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Super Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to the DrSync Super Admin Panel. Overview of all platform metrics.
        </p>
      </div>

      {/* Stats Grid */}
      {isError ? (
        <ErrorMessage
          title="Failed to load dashboard statistics"
          message="Unable to load platform metrics. Please try again."
          onRetry={refresh}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Organizations"
            value={statistics?.total || 0}
            icon={<BuildingOfficeIcon className="h-6 w-6" />}
            loading={isLoading}
          />
          <StatCard
            title="Active Organizations"
            value={statistics?.active || 0}
            subtitle="Currently active"
            icon={<UserGroupIcon className="h-6 w-6" />}
            loading={isLoading}
          />
          <StatCard
            title="Trial Organizations"
            value={statistics?.trial || 0}
            subtitle="On trial period"
            icon={<ChartBarIcon className="h-6 w-6" />}
            loading={isLoading}
          />
          <StatCard
            title="Total Revenue"
            value="$0"
            change={{ value: 0, trend: 'up' }}
            subtitle="This month"
            icon={<CreditCardIcon className="h-6 w-6" />}
          />
        </div>
      )}

      {/* Quick Actions or Recent Activity could go here */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <p className="mt-2 text-sm text-gray-600">
          Common administrative tasks and shortcuts will appear here.
        </p>
      </div>
    </div>
  );
}
