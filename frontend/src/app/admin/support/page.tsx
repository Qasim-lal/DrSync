'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import {
  TicketIcon,
  BookOpenIcon,
  EnvelopeIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function SupportDashboardPage() {
  const router = useRouter();

  // Mock data
  const ticketStats = {
    total: 342,
    open: 87,
    inProgress: 45,
    resolved: 185,
    closed: 25,
    avgResolutionTime: 4.2,
    avgFirstResponseTime: 1.8,
    slaCompliance: 94.5,
  };

  const priorityDistribution = [
    { name: 'Low', value: 98, color: '#10b981' },
    { name: 'Medium', value: 156, color: '#f59e0b' },
    { name: 'High', value: 68, color: '#ef4444' },
    { name: 'Urgent', value: 20, color: '#991b1b' },
  ];

  const ticketTrend = [
    { date: 'Mon', created: 48, resolved: 42 },
    { date: 'Tue', created: 52, resolved: 45 },
    { date: 'Wed', created: 45, resolved: 50 },
    { date: 'Thu', created: 58, resolved: 48 },
    { date: 'Fri', created: 62, resolved: 55 },
  ];

  const topCategories = [
    { category: 'WhatsApp Integration', count: 78, percentage: 22.8 },
    { category: 'Billing Issues', count: 65, percentage: 19.0 },
    { category: 'Google Sheets Sync', count: 52, percentage: 15.2 },
    { category: 'Account Setup', count: 48, percentage: 14.0 },
    { category: 'Feature Request', count: 99, percentage: 29.0 },
  ];

  const recentTickets = [
    {
      id: '#T-1234',
      organization: 'Dental Care Plus',
      subject: 'WhatsApp not sending messages',
      priority: 'high' as const,
      status: 'in_progress' as const,
      createdAt: '2 hours ago',
    },
    {
      id: '#T-1233',
      organization: 'Health Clinic 360',
      subject: 'Billing discrepancy',
      priority: 'medium' as const,
      status: 'open' as const,
      createdAt: '5 hours ago',
    },
    {
      id: '#T-1232',
      organization: 'MediPro',
      subject: 'Sheets sync failing',
      priority: 'urgent' as const,
      status: 'open' as const,
      createdAt: '1 day ago',
    },
  ];

  const quickActions = [
    {
      title: 'View Tickets',
      description: 'Manage support tickets',
      icon: TicketIcon,
      color: 'blue',
      link: '/admin/support/tickets',
    },
    {
      title: 'Knowledge Base',
      description: 'Browse articles',
      icon: BookOpenIcon,
      color: 'green',
      link: '/admin/support/knowledge-base',
    },
    {
      title: 'Communications',
      description: 'Send broadcasts',
      icon: EnvelopeIcon,
      color: 'purple',
      link: '/admin/support/communications',
    },
    {
      title: 'Assistance',
      description: 'Help organizations',
      icon: WrenchScrewdriverIcon,
      color: 'orange',
      link: '/admin/support/assistance',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100';
      case 'high':
        return 'text-orange-700 bg-orange-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-green-700 bg-green-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-blue-700 bg-blue-100';
      case 'in_progress':
        return 'text-purple-700 bg-purple-100';
      case 'resolved':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage tickets, knowledge base, and customer communications
          </p>
        </div>
        <Button onClick={() => router.push('/admin/support/tickets')}>
          <TicketIcon className="h-4 w-4" />
          View All Tickets
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Tickets</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {ticketStats.total}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {ticketStats.open} open • {ticketStats.inProgress} in progress
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Resolution Time</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {ticketStats.avgResolutionTime}h
          </p>
          <p className="mt-1 text-sm text-gray-600">
            First response: {ticketStats.avgFirstResponseTime}h
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">SLA Compliance</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {ticketStats.slaCompliance}%
          </p>
          <p className="mt-1 text-sm text-gray-600">Within target</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Resolved Today</h3>
          <p className="mt-2 text-3xl font-semibold text-purple-600">
            {ticketStats.resolved}
          </p>
          <p className="mt-1 text-sm text-gray-600">This week</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ticket Trend */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Ticket Volume Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ticketTrend}>
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
              <Line
                type="monotone"
                dataKey="created"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Created"
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="#10b981"
                strokeWidth={2}
                name="Resolved"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Priority Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priorityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Tickets and Top Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/admin/support/tickets')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-lg border border-gray-200 p-4 transition hover:border-gray-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {ticket.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityColor(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 font-medium text-gray-900">{ticket.subject}</p>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      <span>{ticket.organization}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {ticket.createdAt}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Top Categories
          </h3>
          <div className="space-y-4">
            {topCategories.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {cat.category}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {cat.count} ({cat.percentage}%)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.title}
                onClick={() => router.push(action.link)}
                className="rounded-lg border-2 border-gray-200 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"
              >
                <Icon className={`mb-2 h-6 w-6 text-${action.color}-600`} />
                <p className="font-medium text-gray-900">{action.title}</p>
                <p className="mt-1 text-sm text-gray-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
