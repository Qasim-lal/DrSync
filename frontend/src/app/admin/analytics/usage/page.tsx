'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DataTable } from '@/components/shared';
import { ArrowLeftIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { ColumnDef } from '@tanstack/react-table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Period = '7d' | '30d' | '90d';

export default function UsageAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('30d');

  // Mock data
  const usageStats = {
    dau: 842,
    mau: 3250,
    dauMauRatio: 25.9,
    newUsers: 145,
    returningUsers: 697,
    churnedUsers: 23,
  };

  const engagement = {
    averageSessionDuration: 18.5,
    sessionsPerUser: 4.2,
    actionsPerSession: 12.8,
    bounceRate: 15.3,
  };

  const apiUsage = {
    totalRequests: 125000,
    averageResponseTime: 145,
    errorRate: 0.18,
  };

  const timeSeries = [
    { date: '03/01', dau: 720, sessions: 3200, apiRequests: 95000 },
    { date: '03/02', dau: 780, sessions: 3450, apiRequests: 102000 },
    { date: '03/03', dau: 805, sessions: 3680, apiRequests: 118000 },
    { date: '03/04', dau: 790, sessions: 3520, apiRequests: 112000 },
    { date: '03/05', dau: 842, sessions: 3890, apiRequests: 125000 },
  ];

  const features = [
    { feature: 'WhatsApp Integration', usage: 2850, uniqueUsers: 620, growthRate: 15.2 },
    { feature: 'Google Sheets Sync', usage: 1950, uniqueUsers: 485, growthRate: 8.7 },
    { feature: 'Patient Management', usage: 3200, uniqueUsers: 750, growthRate: 12.3 },
    { feature: 'Appointment Booking', usage: 2450, uniqueUsers: 580, growthRate: 18.5 },
    { feature: 'Communications', usage: 1800, uniqueUsers: 420, growthRate: 6.9 },
  ];

  const topEndpoints = [
    { endpoint: '/api/patients', requests: 28500, avgResponseTime: 125 },
    { endpoint: '/api/appointments', requests: 22300, avgResponseTime: 145 },
    { endpoint: '/api/whatsapp/send', requests: 18900, avgResponseTime: 285 },
    { endpoint: '/api/sheets/sync', requests: 15200, avgResponseTime: 420 },
    { endpoint: '/api/communications', requests: 12800, avgResponseTime: 180 },
  ];

  const userDistribution = [
    { name: 'New', value: usageStats.newUsers, color: '#3b82f6' },
    { name: 'Returning', value: usageStats.returningUsers, color: '#10b981' },
    { name: 'Churned', value: usageStats.churnedUsers, color: '#ef4444' },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const featureColumns: ColumnDef<typeof features[0]>[] = [
    {
      accessorKey: 'feature',
      header: 'Feature',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">{row.original.feature}</span>
      ),
    },
    {
      accessorKey: 'usage',
      header: 'Total Usage',
      cell: ({ row }) => (
        <span className="text-gray-900">
          {row.original.usage.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'uniqueUsers',
      header: 'Unique Users',
      cell: ({ row }) => (
        <span className="text-gray-900">
          {row.original.uniqueUsers.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'growthRate',
      header: 'Growth',
      cell: ({ row }) => {
        const rate = row.original.growthRate;
        return (
          <span
            className={`flex items-center font-semibold ${
              rate > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {rate > 0 ? (
              <ArrowTrendingUpIcon className="mr-1 h-4 w-4" />
            ) : (
              <ArrowTrendingDownIcon className="mr-1 h-4 w-4" />
            )}
            {Math.abs(rate).toFixed(1)}%
          </span>
        );
      },
    },
  ];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
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
            <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">
              User engagement, feature adoption, and API usage
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex rounded-lg border border-gray-300 bg-white">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${p === '7d' ? 'rounded-l-lg' : ''} ${
                  p === '90d' ? 'rounded-r-lg' : ''
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      {/* User Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Daily Active Users</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatNumber(usageStats.dau)}
          </p>
          <p className="mt-1 text-sm text-green-600 flex items-center">
            <ArrowTrendingUpIcon className="mr-1 h-4 w-4" />
            +12.5% from last period
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Monthly Active Users</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatNumber(usageStats.mau)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            DAU/MAU: {usageStats.dauMauRatio}%
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">New Users</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {formatNumber(usageStats.newUsers)}
          </p>
          <p className="mt-1 text-sm text-gray-600">This period</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Churn Rate</h3>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {((usageStats.churnedUsers / usageStats.mau) * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {usageStats.churnedUsers} users churned
          </p>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Session Duration</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {engagement.averageSessionDuration}m
          </p>
          <p className="mt-1 text-sm text-gray-600">Per session</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Sessions Per User</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {engagement.sessionsPerUser}
          </p>
          <p className="mt-1 text-sm text-gray-600">Average</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Actions Per Session</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {engagement.actionsPerSession}
          </p>
          <p className="mt-1 text-sm text-gray-600">User interactions</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Bounce Rate</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {engagement.bounceRate}%
          </p>
          <p className="mt-1 text-sm text-green-600">Low is better</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* DAU Trend */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Daily Active Users Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorDAU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="dau"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDAU)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            User Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={userDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* API Usage */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">API Usage</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Requests</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatNumber(apiUsage.totalRequests)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {apiUsage.averageResponseTime}ms
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Error Rate</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              {apiUsage.errorRate}%
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={topEndpoints}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="endpoint"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Bar dataKey="requests" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature Usage Table */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Feature Adoption
        </h3>
        <DataTable
          data={features}
          columns={featureColumns}
          loading={false}
          emptyStateTitle="No features tracked"
          emptyStateDescription="Feature usage data will appear here"
        />
      </div>
    </div>
  );
}
