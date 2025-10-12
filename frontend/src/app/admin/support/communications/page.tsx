'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import { ArrowLeftIcon, EnvelopeIcon, BellIcon } from '@heroicons/react/24/outline';

export default function CommunicationsPage() {
  const router = useRouter();

  const broadcasts = [
    { id: '1', title: 'New Feature Announcement', type: 'email', recipients: 1250, status: 'sent', sentAt: '2024-03-10', openRate: 68 },
    { id: '2', title: 'Scheduled Maintenance Notice', type: 'notification', recipients: 3200, status: 'sent', sentAt: '2024-03-09', openRate: 92 },
    { id: '3', title: 'Monthly Newsletter', type: 'email', recipients: 1180, status: 'scheduled', sentAt: '2024-03-15', openRate: 0 },
  ];

  const templates = [
    { id: '1', name: 'Welcome Email', category: 'Onboarding', lastUsed: '2024-03-10', usageCount: 145 },
    { id: '2', name: 'Password Reset', category: 'Security', lastUsed: '2024-03-11', usageCount: 89 },
    { id: '3', name: 'Trial Ending Soon', category: 'Billing', lastUsed: '2024-03-09', usageCount: 67 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
            <p className="mt-2 text-sm text-gray-600">Manage broadcasts and email templates</p>
          </div>
        </div>
        <Button>Create Broadcast</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Sent</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {broadcasts.filter(b => b.status === 'sent').length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Open Rate</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {(broadcasts.filter(b => b.status === 'sent').reduce((sum, b) => sum + b.openRate, 0) / broadcasts.filter(b => b.status === 'sent').length).toFixed(0)}%
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Templates</h3>
          <p className="mt-2 text-3xl font-semibold text-purple-600">{templates.length}</p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Broadcasts</h3>
        <div className="space-y-3">
          {broadcasts.map((broadcast) => (
            <div key={broadcast.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-4">
                {broadcast.type === 'email' ? (
                  <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                ) : (
                  <BellIcon className="h-5 w-5 text-purple-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{broadcast.title}</p>
                  <p className="text-sm text-gray-600">
                    {broadcast.recipients.toLocaleString()} recipients • {broadcast.status} • {new Date(broadcast.sentAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {broadcast.status === 'sent' && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{broadcast.openRate}%</p>
                  <p className="text-xs text-gray-500">Open rate</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
          <Button size="sm" variant="outline">Manage Templates</Button>
        </div>
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">{template.name}</p>
                <p className="text-sm text-gray-600">{template.category} • Used {template.usageCount} times</p>
              </div>
              <p className="text-sm text-gray-500">Last used: {new Date(template.lastUsed).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
