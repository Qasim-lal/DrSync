'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared';
import { ArrowLeftIcon, MagnifyingGlassIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export default function AssistancePage() {
  const router = useRouter();
  const [orgSearch, setOrgSearch] = useState('');

  const quickActions = [
    { title: 'Test WhatsApp Connection', description: 'Verify WhatsApp integration', icon: '📱' },
    { title: 'Test Google Sheets Sync', description: 'Check sheets connection', icon: '📊' },
    { title: 'Force Sync Data', description: 'Manually trigger data sync', icon: '🔄' },
    { title: 'Run Diagnostics', description: 'Check system health', icon: '🔍' },
    { title: 'Reset API Keys', description: 'Generate new keys', icon: '🔑' },
    { title: 'Clear Cache', description: 'Clear organization cache', icon: '🗑️' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization Assistance</h1>
            <p className="mt-2 text-sm text-gray-600">Help tools and diagnostics for organizations</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Search Organization</h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by organization name, ID, or email..."
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <Button>Search</Button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="mb-4 text-sm text-gray-600">
          Select an organization above to enable these diagnostic and assistance tools
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              disabled={!orgSearch}
              className="rounded-lg border-2 border-gray-200 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="mb-2 text-2xl">{action.icon}</div>
              <p className="font-medium text-gray-900">{action.title}</p>
              <p className="mt-1 text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Assistance Actions</h3>
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">WhatsApp Test - Dental Care Plus</p>
                <p className="text-sm text-gray-600">Ran diagnostics and confirmed connection</p>
              </div>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Force Sync - Health Clinic 360</p>
                <p className="text-sm text-gray-600">Synced 45 patients, 23 appointments</p>
              </div>
              <span className="text-sm text-gray-500">5 hours ago</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Run Diagnostics - MediPro</p>
                <p className="text-sm text-gray-600">All systems operational</p>
              </div>
              <span className="text-sm text-gray-500">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
