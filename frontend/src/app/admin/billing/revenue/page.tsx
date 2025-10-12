'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

type Period = 'week' | 'month' | 'quarter' | 'year';

export default function RevenueAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  // TODO: Integrate with backend API when available
  // const { analytics, isLoading, refresh } = useRevenueAnalytics(period);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Mock data for demonstration (replace with API call when backend is ready)
  const mockAnalytics = {
    totalRevenue: 125000,
    totalRevenueChange: 12.5,
    mrr: 42000,
    mrrChange: 8.3,
    arpu: 250,
    arpuChange: 5.2,
    growthRate: 15.7,
    revenueTrend: [
      { date: 'Jan', revenue: 35000, mrr: 38000 },
      { date: 'Feb', revenue: 42000, mrr: 39500 },
      { date: 'Mar', revenue: 48000, mrr: 42000 },
    ],
    revenueByPlan: [
      { name: 'Basic', value: 25000 },
      { name: 'Professional', value: 60000 },
      { name: 'Enterprise', value: 40000 },
    ],
    revenueByCountry: [
      { country: 'USA', revenue: 50000 },
      { country: 'Canada', revenue: 25000 },
      { country: 'UK', revenue: 20000 },
      { country: 'Germany', revenue: 15000 },
      { country: 'France', revenue: 10000 },
      { country: 'Australia', revenue: 5000 },
    ],
    churnRate: 3.2,
    churnedCustomers: 5,
    ltv: 3600,
    cacRatio: 3.5,
  };

  const refresh = () => {
    // TODO: Implement refresh when API is available
    console.log('Refresh revenue analytics');
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
              Revenue Analytics
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Comprehensive revenue insights and trends
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Period Selector */}
          <div className="flex rounded-lg border border-gray-300 bg-white">
            {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium capitalize transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${p === 'week' ? 'rounded-l-lg' : ''} ${
                  p === 'year' ? 'rounded-r-lg' : ''
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button onClick={refresh}>
            <CalendarIcon className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            {mockAnalytics.totalRevenueChange !== 0 && (
              <span
                className={`flex items-center text-xs font-semibold ${
                  mockAnalytics.totalRevenueChange > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {mockAnalytics.totalRevenueChange > 0 ? (
                  <ArrowTrendingUpIcon className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowTrendingDownIcon className="mr-1 h-3 w-3" />
                )}
                {formatPercent(mockAnalytics.totalRevenueChange)}
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(mockAnalytics.totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            vs previous {period}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">MRR</h3>
            {mockAnalytics.mrrChange !== 0 && (
              <span
                className={`flex items-center text-xs font-semibold ${
                  mockAnalytics.mrrChange > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {mockAnalytics.mrrChange > 0 ? (
                  <ArrowTrendingUpIcon className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowTrendingDownIcon className="mr-1 h-3 w-3" />
                )}
                {formatPercent(mockAnalytics.mrrChange)}
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {formatCurrency(mockAnalytics.mrr)}
          </p>
          <p className="mt-1 text-sm text-gray-600">Monthly Recurring</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">ARPU</h3>
            {mockAnalytics.arpuChange !== 0 && (
              <span
                className={`flex items-center text-xs font-semibold ${
                  mockAnalytics.arpuChange > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {mockAnalytics.arpuChange > 0 ? (
                  <ArrowTrendingUpIcon className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowTrendingDownIcon className="mr-1 h-3 w-3" />
                )}
                {formatPercent(mockAnalytics.arpuChange)}
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {formatCurrency(mockAnalytics.arpu)}
          </p>
          <p className="mt-1 text-sm text-gray-600">Avg Revenue Per User</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Growth Rate</h3>
          </div>
          <p
            className={`mt-2 text-3xl font-semibold ${
              mockAnalytics.growthRate > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatPercent(mockAnalytics.growthRate)}
          </p>
          <p className="mt-1 text-sm text-gray-600">Period over period</p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Revenue Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockAnalytics.revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tick={{ fill: '#6b7280' }}
            />
            <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="MRR"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Plan */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Revenue by Plan
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockAnalytics.revenueByPlan}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {mockAnalytics.revenueByPlan.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {mockAnalytics.revenueByPlan.map((plan, index) => (
              <div key={plan.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-700">{plan.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(plan.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Country */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Top Countries by Revenue
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockAnalytics.revenueByCountry.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="country"
                stroke="#6b7280"
                tick={{ fill: '#6b7280' }}
              />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Churn Rate</h3>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {mockAnalytics.churnRate.toFixed(2)}%
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {mockAnalytics.churnedCustomers} customers churned
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">LTV</h3>
          <p className="mt-2 text-2xl font-semibold text-purple-600">
            {formatCurrency(mockAnalytics.ltv)}
          </p>
          <p className="mt-1 text-sm text-gray-600">Customer Lifetime Value</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">CAC Ratio</h3>
          <p className="mt-2 text-2xl font-semibold text-blue-600">
            {mockAnalytics.cacRatio.toFixed(2)}x
          </p>
          <p className="mt-1 text-sm text-gray-600">LTV:CAC Ratio</p>
        </div>
      </div>
    </div>
  );
}
