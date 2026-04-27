'use client';

import React from 'react';
import { getLocalUser, logout } from '@/lib/api/dashboard';

export default function DashboardHeader() {
  const user = getLocalUser();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="text-sm text-gray-500">
        Healthcare Appointment Management
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-gray-500">{user.role.replace('_', ' ')}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
              {user.first_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
