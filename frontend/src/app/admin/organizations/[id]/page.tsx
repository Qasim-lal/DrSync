'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Modal, StatCard, LoadingSpinner, ErrorMessage } from '@/components/shared';
import {
  useOrganization,
  useOrganizationUsers,
  useOrganizationActions,
  useSetupProgress,
} from '@/lib/hooks';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { organization, isLoading, isError, refresh } = useOrganization(id);
  const { users, isLoading: usersLoading, isError: usersError } = useOrganizationUsers(id);
  const { progress, isError: progressError } = useSetupProgress(id);
  const { updateStatus, suspendOrganization } = useOrganizationActions();

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }

    setIsSuspending(true);
    try {
      await suspendOrganization(id, suspendReason);
      toast.success('Organization suspended successfully');
      setShowSuspendModal(false);
      refresh();
    } catch (error) {
      toast.error('Failed to suspend organization');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    try {
      await updateStatus(id, newStatus);
      toast.success('Status updated successfully');
      refresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <ErrorMessage
          title="Failed to load organization"
          message="Unable to load organization details. Please try again."
          onRetry={refresh}
        />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="rounded-lg bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Organization not found
        </h2>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

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
              {organization.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{organization.email}</p>
          </div>
          <span
            className={`ml-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusColors[organization.status]}`}
          >
            {organization.status.charAt(0).toUpperCase() +
              organization.status.slice(1)}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/admin/organizations/${id}/config`)
            }
          >
            <Cog6ToothIcon className="h-5 w-5" />
            Configure
          </Button>
          {organization.status !== 'suspended' && (
            <Button
              variant="danger"
              onClick={() => setShowSuspendModal(true)}
            >
              Suspend
            </Button>
          )}
          {organization.status === 'suspended' && (
            <Button
              variant="primary"
              onClick={() => handleStatusChange('active')}
            >
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Total Users"
          value={users?.length || 0}
          icon={<UserGroupIcon className="h-6 w-6" />}
          loading={usersLoading}
        />
        <StatCard
          title="Setup Progress"
          value={`${progress?.completionPercentage || 0}%`}
          subtitle="Onboarding completion"
          icon={<CheckCircleIcon className="h-6 w-6" />}
        />
        <StatCard
          title="Subscription"
          value={
            organization.subscriptionTier.charAt(0).toUpperCase() +
            organization.subscriptionTier.slice(1)
          }
          subtitle={
            organization.trialEndsAt
              ? `Trial ends ${new Date(organization.trialEndsAt).toLocaleDateString()}`
              : 'Active subscription'
          }
        />
      </div>

      {/* Details Card */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Organization Details
        </h2>
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Organization ID</dt>
            <dd className="mt-1 text-sm text-gray-900">{organization.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Slug</dt>
            <dd className="mt-1 text-sm text-gray-900">{organization.slug}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{organization.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {organization.phone || 'Not provided'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(organization.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(organization.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Users List */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Team Members ({users?.length || 0})
        </h2>
        {usersLoading ? (
          <LoadingSpinner />
        ) : users && users.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[user.status]}`}
                      >
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No team members found</p>
        )}
      </div>

      {/* Suspend Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspend Organization"
        description="This will suspend the organization and prevent access to the platform."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason for suspension
            </label>
            <textarea
              rows={4}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Provide a detailed reason..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowSuspendModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleSuspend}
              loading={isSuspending}
            >
              Suspend Organization
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
