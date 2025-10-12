'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, StatCard } from '@/components/shared';
import {
  ChartBarIcon,
  ServerIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsDashboardPage() {
  const router = useRouter();

  // Mock data for demonstration
  const systemOverview = {
    systemHealth: 99.8,
    totalUsers: 1250,
    activeUsers: 842,
    apiRequests: 125000,
    avgResponseTime: 145,
    errorRate: 0.2,
  };

  const trendData = [
    { date: 'Mon', users: 720, requests: 95000, errors: 12 },
    { date: 'Tue', users: 780, requests: 102000, errors: 15 },
    { date: 'Wed', users: 805, requests: 118000, errors: 18 },
    { date: 'Thu', users: 790, requests: 112000, errors: 10 },
    { date: 'Fri', users: 842, requests: 125000, errors: 8 },
  ];

  const quickStats = [
    {
      title: 'System Health',
      value: `${systemOverview.systemHealth}%`,
      change: +0.3,
      icon: ServerIcon,
      color: 'green',
      link: '/admin/analytics/health',
    },
    {
      title: 'Active Users',
      value: systemOverview.activeUsers.toLocaleString(),
      change: +12.5,
      icon: UsersIcon,
      color: 'blue',
      link: '/admin/analytics/usage',
    },
    {
      title: 'API Requests',
      value: `${(systemOverview.apiRequests / 1000).toFixed(0)}K`,
      change: +8.3,
      icon: ChartBarIcon,
      color: 'purple',
      link: '/admin/analytics/usage',
    },
    {
      title: 'Avg Response Time',
      value: `${systemOverview.avgResponseTime}ms`,
      change: -5.2,
      icon: ClockIcon,
      color: 'orange',
      link: '/admin/analytics/health',
    },
  ];

  const recentAlerts = [
    {
      id: '1',
      severity: 'warning' as const,
      service: 'WhatsApp API',
      message: 'Response time increased to 250ms',
      time: '2 hours ago',
    },
    {
      id: '2',
      severity: 'info' as const,
      service: 'Database',
      message: 'Scheduled maintenance completed',
      time: '5 hours ago',
    },
  ];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor platform health, usage, and growth metrics
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/admin/analytics/health')}>
            <ServerIcon className="h-4 w-4" />
            System Health
          </Button>
          <Button onClick={() => router.push('/admin/analytics/usage')} variant="outline">
            View Details
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change > 0;
          const isNegative = stat.change < 0;
          
          // For response time, lower is better
          const isBetter =
            stat.title === 'Avg Response Time'
              ? stat.change < 0
              : stat.change > 0;

          return (
            <button
              key={stat.title}
              onClick={() => router.push(stat.link)}
              className="group rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span
                      className={`flex items-center text-sm font-semibold ${
                        isBetter ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      <ArrowTrendingUpIcon
                        className={`mr-1 h-4 w-4 ${
                          isNegative ? 'rotate-180' : ''
                        }`}
                      />
                      {Math.abs(stat.change).toFixed(1)}%
                    </span>
                    <span className="ml-2 text-sm text-gray-500">vs last week</span>
                  </div>
                </div>
                <div
                  className={`rounded-full bg-${stat.color}-100 p-3 group-hover:bg-${stat.color}-200`}
                >
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Users Trend */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Active Users Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* API Requests */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            API Requests
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
                formatter={(value: number) => formatNumber(value)}
              />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Alerts and Quick Links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Alerts */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/admin/analytics/health')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <div
                    className={`mt-0.5 rounded-full p-1 ${
                      alert.severity === 'warning'
                        ? 'bg-yellow-100'
                        : 'bg-blue-100'
                    }`}
                  >
                    <ExclamationTriangleIcon
                      className={`h-4 w-4 ${
                        alert.severity === 'warning'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.service}
                      </p>
                      <span className="text-xs text-gray-500">{alert.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-gray-500">No recent alerts</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Links</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/admin/analytics/health')}
              className="rounded-lg border-2 border-gray-200 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"
            >
              <ServerIcon className="mb-2 h-6 w-6 text-blue-600" />
              <p className="font-medium text-gray-900">System Health</p>
              <p className="mt-1 text-sm text-gray-600">
                Monitor services & uptime
              </p>
            </button>
            <button
              onClick={() => router.push('/admin/analytics/usage')}
              className="rounded-lg border-2 border-gray-200 p-4 text-left transition hover:border-green-500 hover:bg-green-50"
            >
              <ChartBarIcon className="mb-2 h-6 w-6 text-green-600" />
              <p className="font-medium text-gray-900">Usage Analytics</p>
              <p className="mt-1 text-sm text-gray-600">User engagement & API</p>
            </button>
            <button
              onClick={() => router.push('/admin/analytics/growth')}
              className="rounded-lg border-2 border-gray-200 p-4 text-left transition hover:border-purple-500 hover:bg-purple-50"
            >
              <ArrowTrendingUpIcon className="mb-2 h-6 w-6 text-purple-600" />
              <p className="font-medium text-gray-900">Growth Metrics</p>
              <p className="mt-1 text-sm text-gray-600">Signups & retention</p>
            </button>
            <button
              onClick={() => router.push('/admin/billing/revenue')}
              className="rounded-lg border-2 border-gray-200 p-4 text-left transition hover:border-orange-500 hover:bg-orange-50"
            >
              <ChartBarIcon className="mb-2 h-6 w-6 text-orange-600" />
              <p className="font-medium text-gray-900">Revenue Analytics</p>
              <p className="mt-1 text-sm text-gray-600">Financial metrics</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
