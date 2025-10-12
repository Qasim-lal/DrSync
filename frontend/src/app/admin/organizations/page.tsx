'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Button, StatCard } from '@/components/shared';
import { ColumnDef } from '@tanstack/react-table';
import { Organization } from '@/lib/types/organization';
import { useOrganizations, useOrganizationStatistics } from '@/lib/hooks';
import ErrorMessage from '@/components/shared/ErrorMessage';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function OrganizationsPage() {
  const router = useRouter();
  const { organizations, isLoading, isError, refresh } = useOrganizations();
  const { statistics, isLoading: statsLoading, isError: statsError, refresh: refreshStats } = useOrganizationStatistics();

  const columns: ColumnDef<Organization>[] = [
    {
      accessorKey: 'name',
      header: 'Organization',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.original.name}</span>
          <span className="text-sm text-gray-500">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'subscriptionTier',
      header: 'Plan',
      cell: ({ row }) => {
        const tierColors = {
          trial: 'bg-yellow-100 text-yellow-800',
          basic: 'bg-blue-100 text-blue-800',
          professional: 'bg-purple-100 text-purple-800',
          enterprise: 'bg-green-100 text-green-800',
        };
        const tier = row.original.subscriptionTier;
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tierColors[tier]}`}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusColors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          suspended: 'bg-red-100 text-red-800',
          pending: 'bg-yellow-100 text-yellow-800',
        };
        const status = row.original.status;
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[status]}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <span className="text-sm text-gray-500">
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
            router.push(`/admin/organizations/${row.original.id}`);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all organizations on the platform
          </p>
        </div>
        <Button variant="primary">Add Organization</Button>
      </div>

      {/* Stats */}
      {statsError ? (
        <ErrorMessage
          title="Failed to load statistics"
          message="Unable to load organization statistics. Please try again."
          onRetry={refreshStats}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Organizations"
            value={statistics?.total || 0}
            icon={<BuildingOfficeIcon className="h-6 w-6" />}
            loading={statsLoading}
          />
          <StatCard
            title="Active"
            value={statistics?.active || 0}
            subtitle="Currently active"
            icon={<UserGroupIcon className="h-6 w-6" />}
            loading={statsLoading}
          />
          <StatCard
            title="Trial"
            value={statistics?.trial || 0}
            subtitle="On trial period"
            icon={<ClockIcon className="h-6 w-6" />}
            loading={statsLoading}
          />
          <StatCard
            title="Suspended"
            value={statistics?.suspended || 0}
            subtitle="Suspended accounts"
            icon={<XCircleIcon className="h-6 w-6" />}
            loading={statsLoading}
          />
        </div>
      )}

      {/* Organizations Table */}
      <DataTable
        data={organizations || []}
        columns={columns}
        loading={isLoading}
        error={isError}
        onRetry={refresh}
        emptyStateTitle="No organizations found"
        emptyStateDescription="Get started by adding your first organization"
        onRowClick={(org) => router.push(`/admin/organizations/${org.id}`)}
      />
    </div>
  );
}
