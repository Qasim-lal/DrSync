'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function SystemHealthPage() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Mock data
  const systemOverview = {
    status: 'healthy' as const,
    uptime: 99.8,
    lastUpdated: new Date().toISOString(),
  };

  const services = [
    {
      name: 'API Server',
      key: 'api',
      status: 'operational' as const,
      uptime: 99.9,
      responseTime: 142,
      lastChecked: '1 minute ago',
      description: 'Main API backend service',
    },
    {
      name: 'Database',
      key: 'database',
      status: 'operational' as const,
      uptime: 99.95,
      responseTime: 45,
      lastChecked: '1 minute ago',
      description: 'PostgreSQL primary database',
    },
    {
      name: 'WhatsApp API',
      key: 'whatsapp',
      status: 'degraded' as const,
      uptime: 98.5,
      responseTime: 285,
      lastChecked: '30 seconds ago',
      description: 'WhatsApp Business API integration',
      incidents: [
        {
          severity: 'medium' as const,
          message: 'Increased response time detected',
          occurredAt: '2 hours ago',
        },
      ],
    },
    {
      name: 'Google Sheets',
      key: 'googleSheets',
      status: 'operational' as const,
      uptime: 99.7,
      responseTime: 320,
      lastChecked: '1 minute ago',
      description: 'Google Sheets API integration',
    },
    {
      name: 'Email Service',
      key: 'email',
      status: 'operational' as const,
      uptime: 99.85,
      responseTime: 180,
      lastChecked: '2 minutes ago',
      description: 'Email delivery service',
    },
    {
      name: 'Cloud Storage',
      key: 'storage',
      status: 'operational' as const,
      uptime: 99.92,
      responseTime: 95,
      lastChecked: '1 minute ago',
      description: 'File storage and CDN',
    },
  ];

  const performanceMetrics = {
    averageResponseTime: 145,
    errorRate: 0.18,
    requestsPerSecond: 125,
    activeConnections: 342,
  };

  const uptimeHistory = [
    { time: '00:00', uptime: 100 },
    { time: '04:00', uptime: 99.9 },
    { time: '08:00', uptime: 99.8 },
    { time: '12:00', uptime: 99.7 },
    { time: '16:00', uptime: 99.8 },
    { time: '20:00', uptime: 99.9 },
    { time: '24:00', uptime: 99.8 },
  ];

  const alerts = [
    {
      id: '1',
      severity: 'critical' as const,
      service: 'WhatsApp API',
      message: 'Response time increased to 285ms (threshold: 250ms)',
      occurredAt: '2 hours ago',
      status: 'active' as const,
    },
    {
      id: '2',
      severity: 'info' as const,
      service: 'Database',
      message: 'Scheduled maintenance completed successfully',
      occurredAt: '5 hours ago',
      status: 'resolved' as const,
    },
    {
      id: '3',
      severity: 'warning' as const,
      service: 'API Server',
      message: 'Memory usage reached 85%',
      occurredAt: '1 day ago',
      status: 'acknowledged' as const,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'down':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
            <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor system status, services, and performance
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                All Systems Operational
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Uptime: {systemOverview.uptime}% • Last updated{' '}
                {new Date(systemOverview.lastUpdated).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">Performance</p>
            <p className="text-2xl font-bold text-gray-900">
              {performanceMetrics.averageResponseTime}ms
            </p>
            <p className="text-sm text-gray-600">Avg Response Time</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {performanceMetrics.errorRate}%
          </p>
          <p className="mt-1 text-sm text-green-600">Within threshold</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Requests/sec</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {performanceMetrics.requestsPerSecond}
          </p>
          <p className="mt-1 text-sm text-gray-600">Current load</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Connections</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {performanceMetrics.activeConnections}
          </p>
          <p className="mt-1 text-sm text-gray-600">Concurrent users</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Uptime (24h)</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {systemOverview.uptime}%
          </p>
          <p className="mt-1 text-sm text-gray-600">Last 24 hours</p>
        </div>
      </div>

      {/* Uptime Chart */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Uptime History (24h)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={uptimeHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
            <YAxis
              domain={[99, 100]}
              stroke="#6b7280"
              tick={{ fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Line
              type="monotone"
              dataKey="uptime"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Services Status */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Services</h3>
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.key}
              className="rounded-lg border border-gray-200 p-4 transition hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(service.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">
                        {service.name}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                          service.status
                        )}`}
                      >
                        {service.status.charAt(0).toUpperCase() +
                          service.status.slice(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {service.description}
                    </p>
                    <div className="mt-2 flex items-center gap-6 text-sm text-gray-500">
                      <span>Uptime: {service.uptime}%</span>
                      <span>Response: {service.responseTime}ms</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {service.lastChecked}
                      </span>
                    </div>
                    {service.incidents && service.incidents.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {service.incidents.map((incident, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 rounded bg-yellow-50 p-2"
                          >
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                            <div className="flex-1">
                              <p className="text-sm text-yellow-800">
                                {incident.message}
                              </p>
                              <p className="text-xs text-yellow-600">
                                {incident.occurredAt}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Alerts
        </h3>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 ${getSeverityColor(
                alert.severity
              )}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold uppercase ${
                        alert.severity === 'critical'
                          ? 'text-red-800'
                          : alert.severity === 'warning'
                          ? 'text-yellow-800'
                          : 'text-blue-800'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {alert.service}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        alert.status === 'active'
                          ? 'bg-red-100 text-red-700'
                          : alert.status === 'acknowledged'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{alert.message}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {alert.occurredAt}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
