'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import { ArrowLeftIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function SupportAnalyticsPage() {
  const router = useRouter();

  const metrics = {
    avgResolutionTime: 4.2,
    avgFirstResponseTime: 1.8,
    slaCompliance: 94.5,
    satisfactionScore: 4.6,
    ticketsPerAgent: 28,
  };

  const volumeTrend = [
    { date: 'Mon', created: 48, resolved: 42, closed: 40 },
    { date: 'Tue', created: 52, resolved: 45, closed: 43 },
    { date: 'Wed', created: 45, resolved: 50, closed: 48 },
    { date: 'Thu', created: 58, resolved: 48, closed: 46 },
    { date: 'Fri', created: 62, resolved: 55, closed: 52 },
  ];

  const categoryData = [
    { category: 'WhatsApp', count: 78, avgTime: 3.5 },
    { category: 'Billing', count: 65, avgTime: 5.2 },
    { category: 'Sheets Sync', count: 52, avgTime: 4.8 },
    { category: 'Setup', count: 48, avgTime: 6.1 },
    { category: 'Features', count: 99, avgTime: 3.2 },
  ];

  const teamPerformance = [
    { agent: 'John Doe', tickets: 45, resolved: 42, rating: 4.8, avgTime: 3.5 },
    { agent: 'Jane Smith', tickets: 38, resolved: 36, rating: 4.9, avgTime: 3.2 },
    { agent: 'Bob Johnson', tickets: 32, resolved: 30, rating: 4.6, avgTime: 4.1 },
    { agent: 'Alice Brown', tickets: 28, resolved: 25, rating: 4.7, avgTime: 3.8 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">Team performance and metrics</p>
          </div>
        </div>
        <Button variant="outline">Export Report</Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Resolution</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.avgResolutionTime}h</p>
          <p className="mt-1 flex items-center text-sm text-green-600">
            <ArrowTrendingUpIcon className="mr-1 h-4 w-4" />
            -12% improvement
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">First Response</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">{metrics.avgFirstResponseTime}h</p>
          <p className="mt-1 text-sm text-gray-600">Average time</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">SLA Compliance</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">{metrics.slaCompliance}%</p>
          <p className="mt-1 text-sm text-gray-600">On target</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Satisfaction</h3>
          <p className="mt-2 text-3xl font-semibold text-purple-600">{metrics.satisfactionScore}/5</p>
          <p className="mt-1 text-sm text-gray-600">Average rating</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Tickets/Agent</h3>
          <p className="mt-2 text-3xl font-semibold text-orange-600">{metrics.ticketsPerAgent}</p>
          <p className="mt-1 text-sm text-gray-600">Weekly average</p>
        </div>
      </div>

      {/* Volume Trend */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Ticket Volume Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={volumeTrend}>
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
            <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
            <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
            <Line type="monotone" dataKey="closed" stroke="#6b7280" strokeWidth={2} name="Closed" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Analysis */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Tickets by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Team Performance</h3>
          <div className="space-y-4">
            {teamPerformance.map((agent) => (
              <div key={agent.agent} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{agent.agent}</p>
                    <p className="text-sm text-gray-600">
                      {agent.resolved}/{agent.tickets} resolved • {agent.avgTime}h avg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-purple-600">{agent.rating}/5</p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{ width: `${(agent.resolved / agent.tickets) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Details */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Category Resolution Times</h3>
        <div className="space-y-3">
          {categoryData.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{cat.category}</span>
                  <span className="ml-2 text-sm text-gray-600">({cat.count} tickets)</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{cat.avgTime}h avg</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${(cat.avgTime / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
