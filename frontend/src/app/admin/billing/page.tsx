'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { StatCard, Button } from '@/components/shared';
import {
  useBillingOverview,
  usePaymentStatus,
  useSubscriptionLifecycle,
  useTrialOverview,
} from '@/lib/hooks';
import ErrorMessage from '@/components/shared/ErrorMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function BillingDashboard() {
  const router = useRouter();
  const { overview, isLoading: overviewLoading, isError: overviewError, refresh: refreshOverview } = useBillingOverview();
  const { paymentStatus, isLoading: paymentsLoading, isError: paymentsError, refresh: refreshPayments } = usePaymentStatus();
  const { lifecycle, isLoading: lifecycleLoading, isError: lifecycleError, refresh: refreshLifecycle } = useSubscriptionLifecycle();
  const { trialOverview, isLoading: trialsLoading, isError: trialsError, refresh: refreshTrials } = useTrialOverview();

  // Chart data
  const paymentStatusData = paymentStatus
    ? [
        { name: 'Completed', value: paymentStatus.completed, color: '#10b981' },
        { name: 'Pending', value: paymentStatus.pending, color: '#f59e0b' },
        { name: 'Failed', value: paymentStatus.failed, color: '#ef4444' },
        { name: 'Refunded', value: paymentStatus.refunded, color: '#6b7280' },
      ]
    : [];

  const subscriptionStatusData = lifecycle
    ? [
        { name: 'Active', value: lifecycle.byStatus.active, color: '#10b981' },
        { name: 'Trialing', value: lifecycle.byStatus.trialing, color: '#3b82f6' },
        { name: 'Past Due', value: lifecycle.byStatus.past_due, color: '#f59e0b' },
        { name: 'Cancelled', value: lifecycle.byStatus.cancelled, color: '#6b7280' },
      ]
    : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Billing & Subscriptions
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor revenue, subscriptions, and payment activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/billing/transactions')}
          >
            View Transactions
          </Button>
          <Button onClick={() => router.push('/admin/billing/invoices')}>
            Manage Invoices
          </Button>
        </div>
      </div>

      {/* Revenue Stats */}
      {overviewError || trialsError ? (
        <ErrorMessage
          title="Failed to load billing statistics"
          message="Unable to load billing overview. Please try again."
          onRetry={() => {
            if (overviewError) refreshOverview();
            if (trialsError) refreshTrials();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(overview?.totalRevenue || 0)}
            change={{
              value: overview?.revenueGrowth || 0,
              trend: (overview?.revenueGrowth || 0) >= 0 ? 'up' : 'down',
            }}
            subtitle="All time"
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            loading={overviewLoading}
          />
          <StatCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(overview?.monthlyRecurringRevenue || 0)}
            change={{
              value: overview?.subscriptionGrowth || 0,
              trend: (overview?.subscriptionGrowth || 0) >= 0 ? 'up' : 'down',
            }}
            subtitle="This month"
            icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
            loading={overviewLoading}
          />
          <StatCard
            title="Active Subscriptions"
            value={overview?.activeSubscriptions || 0}
            subtitle={`${overview?.totalSubscriptions || 0} total`}
            icon={<UsersIcon className="h-6 w-6" />}
            loading={overviewLoading}
          />
          <StatCard
            title="Active Trials"
            value={trialOverview?.activeTrials || 0}
            subtitle={`${trialOverview?.expiringIn7Days || 0} expiring soon`}
            icon={<ClockIcon className="h-6 w-6" />}
            loading={trialsLoading}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Status Chart */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Status
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/admin/billing/transactions')}
            >
              View All
            </Button>
          </div>
          {paymentsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : paymentsError ? (
            <div className="py-8">
              <ErrorMessage
                message="Unable to load payment status data."
                onRetry={refreshPayments}
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          {paymentStatus && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Completed:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {formatCurrency(paymentStatus.totalAmount.completed)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Failed:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {formatCurrency(paymentStatus.totalAmount.failed)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Subscription Status Chart */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Subscription Status
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/admin/billing/trials')}
            >
              Manage Trials
            </Button>
          </div>
          {lifecycleLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : lifecycleError ? (
            <div className="py-8">
              <ErrorMessage
                message="Unable to load subscription lifecycle data."
                onRetry={refreshLifecycle}
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subscriptionStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subscriptionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          {lifecycle && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">New this month:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {lifecycle.newThisMonth}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Cancelled this month:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {lifecycle.cancelledThisMonth}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Average Revenue Per User
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(overview?.averageRevenuePerUser || 0)}
          </p>
          <p className="mt-1 text-sm text-gray-600">Per month</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Trial Conversion Rate
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {trialOverview?.averageConversionRate?.toFixed(1) || 0}%
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {trialOverview?.totalConversions || 0} total conversions
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Average Customer Lifetime Value
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(lifecycle?.averageLifetimeValue || 0)}
          </p>
          <p className="mt-1 text-sm text-gray-600">Across all customers</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push('/admin/billing/transactions')}
          >
            View Transactions
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push('/admin/billing/invoices')}
          >
            Manage Invoices
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push('/admin/billing/trials')}
          >
            Trial Management
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => router.push('/admin/billing/revenue')}
          >
            Revenue Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
